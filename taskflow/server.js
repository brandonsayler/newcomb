// TaskFlow — Unified Kanban Board Server
// Synthesized from 10 independent AI agent contributions:
//   Agent 2: SQLite schema & repository pattern
//   Agent 3: Express route factory & validation
//   Agent 5: Service layer & status state machine
//   Agent 8: WebSocket real-time broadcast & event bus

const express = require('express');
const initSqlJs = require('sql.js');
const { WebSocketServer } = require('ws');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const http = require('http');
const fs = require('fs');

// ─── Config ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-dev-secret-change-in-production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'taskflow.db');

// ─── Database wrapper to provide better-sqlite3-like API over sql.js ────────
let database;

class DB {
  constructor(sqlDb) { this._db = sqlDb; }

  prepare(sql) {
    const db = this._db;
    return {
      run(...params) {
        db.run(sql, params);
        return this;
      },
      get(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const obj = {};
          cols.forEach((c, i) => { obj[c] = vals[i]; });
          return obj;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const obj = {};
          cols.forEach((c, i) => { obj[c] = vals[i]; });
          results.push(obj);
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) { this._db.exec(sql); }

  save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const uid = () => crypto.randomBytes(16).toString('hex');

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = (k === 'labels' && typeof v === 'string') ? JSON.parse(v) : v;
  }
  return result;
}

// ─── Status State Machine (Agent 5) ────────────────────────────────────────
const VALID_STATUSES = ['todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'];

// ─── Error Classes (Agent 5) ───────────────────────────────────────────────
class AppError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(msg, 404); }
}
class ValidationError extends AppError {
  constructor(msg = 'Validation error') { super(msg, 400); }
}

// ─── Auth Middleware (Agent 3 + Agent 7 pattern) ────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = { id: payload.id, username: payload.username, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── WebSocket (Agent 8) ───────────────────────────────────────────────────
const clients = new Map(); // userId -> Set<ws>

function broadcast(excludeUserId, event, payload) {
  const msg = JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() });
  for (const [userId, sockets] of clients) {
    if (userId === excludeUserId) continue;
    for (const ws of sockets) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}

// ─── Express App ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth Routes (Agent 3) ─────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const db = database;
    const { username, email, password } = req.body;
    if (!username || !email || !password) throw new ValidationError('username, email, and password required');
    if (password.length < 6) throw new ValidationError('Password must be at least 6 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('Invalid email');

    const exists = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
    if (exists) throw new ValidationError('User already exists');

    const id = uid();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, username, email, passwordHash, now, now);
    db.save();

    const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: { id, username, email }, token });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const db = database;
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError('email and password required');

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new AppError('Invalid credentials', 401);
    }
    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  const db = database;
  const user = db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: snakeToCamel(user) });
});

// ─── Board Routes (Agent 2 repos + Agent 3 patterns) ───────────────────────
app.get('/api/boards', auth, (req, res) => {
  const db = database;
  const boards = db.prepare('SELECT * FROM boards WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(boards.map(snakeToCamel));
});

app.post('/api/boards', auth, (req, res) => {
  try {
    const db = database;
    const { name, description } = req.body;
    if (!name || !name.trim()) throw new ValidationError('Board name is required');

    const id = uid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO boards (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name.trim(), description || '', req.user.id, now, now);

    // Create default columns (Agent 4's idea: auto-generate columns)
    const defaultCols = [
      { name: 'To Do', color: '#8b5cf6' },
      { name: 'In Progress', color: '#f59e0b' },
      { name: 'Review', color: '#3b82f6' },
      { name: 'Done', color: '#10b981' },
    ];
    defaultCols.forEach((col, i) => {
      db.prepare('INSERT INTO columns (id, board_id, name, position, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uid(), id, col.name, i, col.color, now, now);
    });
    db.save();

    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
    broadcast(req.user.id, 'board:created', snakeToCamel(board));
    res.status(201).json(snakeToCamel(board));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.delete('/api/boards/:id', auth, (req, res) => {
  const db = database;
  const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  db.prepare('DELETE FROM tasks WHERE board_id = ?').run(req.params.id);
  db.prepare('DELETE FROM columns WHERE board_id = ?').run(req.params.id);
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  db.save();
  broadcast(req.user.id, 'board:deleted', { id: req.params.id });
  res.status(204).end();
});

// ─── Column Routes ──────────────────────────────────────────────────────────
app.get('/api/boards/:boardId/columns', auth, (req, res) => {
  const db = database;
  const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.boardId, req.user.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });
  const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(req.params.boardId);
  res.json(columns.map(snakeToCamel));
});

app.post('/api/boards/:boardId/columns', auth, (req, res) => {
  try {
    const db = database;
    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.boardId, req.user.id);
    if (!board) throw new NotFoundError('Board not found');
    const { name, color } = req.body;
    if (!name || !name.trim()) throw new ValidationError('Column name required');

    const maxPos = db.prepare('SELECT MAX(position) as m FROM columns WHERE board_id = ?').get(req.params.boardId);
    const id = uid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO columns (id, board_id, name, position, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.params.boardId, name.trim(), ((maxPos && maxPos.m) ?? -1) + 1, color || '#6366f1', now, now);
    db.save();

    const col = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    broadcast(req.user.id, 'column:created', snakeToCamel(col));
    res.status(201).json(snakeToCamel(col));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.put('/api/boards/:boardId/columns/:colId', auth, (req, res) => {
  try {
    const db = database;
    const col = db.prepare('SELECT c.id, c.board_id, c.name, c.position, c.color FROM columns c, boards b WHERE c.board_id = b.id AND c.id = ? AND b.owner_id = ?').get(req.params.colId, req.user.id);
    if (!col) throw new NotFoundError('Column not found');
    const { name, color, position } = req.body;
    if (name !== undefined) db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(name.trim(), col.id);
    if (color !== undefined) db.prepare('UPDATE columns SET color = ? WHERE id = ?').run(color, col.id);
    if (position !== undefined) db.prepare('UPDATE columns SET position = ? WHERE id = ?').run(position, col.id);
    db.save();
    const updated = db.prepare('SELECT * FROM columns WHERE id = ?').get(col.id);
    broadcast(req.user.id, 'column:updated', snakeToCamel(updated));
    res.json(snakeToCamel(updated));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.delete('/api/boards/:boardId/columns/:colId', auth, (req, res) => {
  const db = database;
  const col = db.prepare('SELECT c.id FROM columns c, boards b WHERE c.board_id = b.id AND c.id = ? AND b.owner_id = ?').get(req.params.colId, req.user.id);
  if (!col) return res.status(404).json({ error: 'Column not found' });
  db.prepare('DELETE FROM tasks WHERE column_id = ?').run(req.params.colId);
  db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.colId);
  db.save();
  broadcast(req.user.id, 'column:deleted', { id: req.params.colId, boardId: req.params.boardId });
  res.status(204).end();
});

// ─── Task Routes (Agent 3 CRUD + Agent 5 validation) ───────────────────────
app.get('/api/boards/:boardId/tasks', auth, (req, res) => {
  const db = database;
  const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.boardId, req.user.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  // sql.js doesn't support dynamic param binding the same way, so we build the query
  let sql = 'SELECT * FROM tasks WHERE board_id = ?';
  const params = [req.params.boardId];

  if (req.query.columnId) { sql += ' AND column_id = ?'; params.push(req.query.columnId); }
  if (req.query.priority && VALID_PRIORITIES.includes(req.query.priority)) { sql += ' AND priority = ?'; params.push(req.query.priority); }
  if (req.query.search) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }

  sql += ' ORDER BY position ASC, created_at DESC';
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks.map(snakeToCamel));
});

app.post('/api/boards/:boardId/tasks', auth, (req, res) => {
  try {
    const db = database;
    const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.boardId, req.user.id);
    if (!board) throw new NotFoundError('Board not found');

    const { title, description, columnId, priority, labels, dueDate } = req.body;
    if (!title || !title.trim()) throw new ValidationError('Task title is required');
    if (title.length > 255) throw new ValidationError('Title must be 255 characters or less');
    if (priority && !VALID_PRIORITIES.includes(priority)) throw new ValidationError('Invalid priority');

    let targetCol = columnId;
    if (!targetCol) {
      const firstCol = db.prepare('SELECT id FROM columns WHERE board_id = ? ORDER BY position LIMIT 1').get(req.params.boardId);
      if (!firstCol) throw new ValidationError('Board has no columns');
      targetCol = firstCol.id;
    } else {
      const col = db.prepare('SELECT id FROM columns WHERE id = ? AND board_id = ?').get(columnId, req.params.boardId);
      if (!col) throw new ValidationError('Column not found on this board');
    }

    const maxPos = db.prepare('SELECT MAX(position) as m FROM tasks WHERE column_id = ?').get(targetCol);
    const id = uid();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`INSERT INTO tasks (id, column_id, board_id, title, description, priority, labels, position, due_date, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, targetCol, req.params.boardId, title.trim(), description || '', priority || 'none',
      JSON.stringify(labels || []), ((maxPos && maxPos.m) ?? -1) + 1, dueDate || null, now, now
    );
    db.save();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    broadcast(req.user.id, 'task:created', snakeToCamel(task));
    res.status(201).json(snakeToCamel(task));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.put('/api/boards/:boardId/tasks/:taskId', auth, (req, res) => {
  try {
    const db = database;
    const task = db.prepare('SELECT t.* FROM tasks t, boards b WHERE t.board_id = b.id AND t.id = ? AND b.owner_id = ?').get(req.params.taskId, req.user.id);
    if (!task) throw new NotFoundError('Task not found');

    const { title, description, priority, labels, dueDate, columnId, position } = req.body;
    if (title !== undefined && (!title.trim() || title.length > 255)) throw new ValidationError('Invalid title');
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) throw new ValidationError('Invalid priority');

    const sets = [];
    const params = [];
    if (title !== undefined) { sets.push('title = ?'); params.push(title.trim()); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (priority !== undefined) { sets.push('priority = ?'); params.push(priority); }
    if (labels !== undefined) { sets.push('labels = ?'); params.push(JSON.stringify(labels)); }
    if (dueDate !== undefined) { sets.push('due_date = ?'); params.push(dueDate); }
    if (columnId !== undefined) { sets.push('column_id = ?'); params.push(columnId); }
    if (position !== undefined) { sets.push('position = ?'); params.push(position); }

    if (sets.length > 0) {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      sets.push('updated_at = ?');
      params.push(now);
      params.push(req.params.taskId);
      db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      db.save();
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    broadcast(req.user.id, 'task:updated', snakeToCamel(updated));
    res.json(snakeToCamel(updated));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Move task between columns (Agent 2 repo pattern + Agent 5 state machine)
app.patch('/api/boards/:boardId/tasks/:taskId/move', auth, (req, res) => {
  try {
    const db = database;
    const task = db.prepare('SELECT t.* FROM tasks t, boards b WHERE t.board_id = b.id AND t.id = ? AND b.owner_id = ?').get(req.params.taskId, req.user.id);
    if (!task) throw new NotFoundError('Task not found');

    const { columnId, position } = req.body;
    if (!columnId) throw new ValidationError('columnId is required');

    const col = db.prepare('SELECT id FROM columns WHERE id = ? AND board_id = ?').get(columnId, req.params.boardId);
    if (!col) throw new ValidationError('Target column not found');

    const pos = position ?? 0;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('UPDATE tasks SET position = position + 1 WHERE column_id = ? AND position >= ?').run(columnId, pos);
    db.prepare('UPDATE tasks SET column_id = ?, position = ?, updated_at = ? WHERE id = ?').run(columnId, pos, now, req.params.taskId);
    db.save();

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    broadcast(req.user.id, 'task:moved', snakeToCamel(updated));
    res.json(snakeToCamel(updated));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.delete('/api/boards/:boardId/tasks/:taskId', auth, (req, res) => {
  const db = database;
  const task = db.prepare('SELECT t.* FROM tasks t, boards b WHERE t.board_id = b.id AND t.id = ? AND b.owner_id = ?').get(req.params.taskId, req.user.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  db.save();
  broadcast(req.user.id, 'task:deleted', { id: req.params.taskId, boardId: req.params.boardId });
  res.status(204).end();
});

// Stats endpoint (Agent 3 + Agent 5)
app.get('/api/boards/:boardId/stats', auth, (req, res) => {
  const db = database;
  const board = db.prepare('SELECT * FROM boards WHERE id = ? AND owner_id = ?').get(req.params.boardId, req.user.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = db.prepare('SELECT id, name FROM columns WHERE board_id = ? ORDER BY position').all(req.params.boardId);
  const tasks = db.prepare('SELECT column_id, priority, due_date FROM tasks WHERE board_id = ?').all(req.params.boardId);

  const total = tasks.length;
  const byColumn = {};
  columns.forEach(c => { byColumn[c.name] = tasks.filter(t => t.column_id === c.id).length; });
  const byPriority = {};
  VALID_PRIORITIES.forEach(p => { byPriority[p] = tasks.filter(t => t.priority === p).length; });

  const lastCol = columns[columns.length - 1];
  const done = lastCol ? tasks.filter(t => t.column_id === lastCol.id).length : 0;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && (!lastCol || t.column_id !== lastCol.id)).length;

  res.json({ total, done, overdue, completionRate: total ? Math.round((done / total) * 100) : 0, byColumn, byPriority });
});

// ─── Comment Routes ─────────────────────────────────────────────────────────
app.get('/api/tasks/:taskId/comments', auth, (req, res) => {
  const db = database;
  const comments = db.prepare(`
    SELECT c.id, c.task_id, c.author_id, c.body, c.created_at, u.username as author_name
    FROM comments c, users u WHERE c.author_id = u.id AND c.task_id = ? ORDER BY c.created_at ASC
  `).all(req.params.taskId);
  res.json(comments.map(snakeToCamel));
});

app.post('/api/tasks/:taskId/comments', auth, (req, res) => {
  try {
    const db = database;
    const { body } = req.body;
    if (!body || !body.trim()) throw new ValidationError('Comment body required');
    const id = uid();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('INSERT INTO comments (id, task_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)').run(id, req.params.taskId, req.user.id, body.trim(), now);
    db.save();
    const comment = db.prepare('SELECT c.id, c.task_id, c.author_id, c.body, c.created_at, u.username as author_name FROM comments c, users u WHERE c.author_id = u.id AND c.id = ?').get(id);
    broadcast(req.user.id, 'comment:created', snakeToCamel(comment));
    res.status(201).json(snakeToCamel(comment));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Fallback: serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Bootstrap ──────────────────────────────────────────────────────────────
async function main() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  database = new DB(sqlDb);

  // Create tables (Agent 2 schema)
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      owner_id TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee_id TEXT,
      priority TEXT DEFAULT 'none',
      labels TEXT DEFAULT '[]',
      position INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT
    );
  `);
  database.save();

  // Start HTTP + WebSocket server
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const token = url.searchParams.get('token');
    if (!token) { ws.close(4001, 'Token required'); return; }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      ws.userId = payload.id;
      ws.userName = payload.username;
      if (!clients.has(payload.id)) clients.set(payload.id, new Set());
      clients.get(payload.id).add(ws);
      ws.send(JSON.stringify({ type: 'connection:ack', userId: payload.id }));
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    ws.on('close', () => {
      if (ws.userId && clients.has(ws.userId)) {
        clients.get(ws.userId).delete(ws);
        if (clients.get(ws.userId).size === 0) clients.delete(ws.userId);
      }
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch {}
    });
  });

  // Auto-save every 30 seconds
  setInterval(() => { try { database.save(); } catch {} }, 30000);

  server.listen(PORT, () => {
    console.log(`\n  TaskFlow running at http://localhost:${PORT}\n`);
  });
}

main().catch(err => { console.error('Failed to start:', err); process.exit(1); });
