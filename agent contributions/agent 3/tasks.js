/**
 * ============================================================
 * AGENT 3 OF 10 — API ROUTES & CONTROLLERS
 * ============================================================
 * Project: Collaborative Task Manager (Schelling Point App)
 * Tech Stack: Node.js + Express + SQLite + React
 *
 * Expected agent division:
 *   Agent 1  — Project scaffolding, package.json, entry point (server.js)
 *   Agent 2  — Database schema, models, migrations (SQLite)
 *   Agent 3  — API routes & controllers (THIS FILE) ✅
 *   Agent 4  — Authentication & authorization middleware
 *   Agent 5  — React app shell, main App component, routing
 *   Agent 6  — React UI components (TaskCard, TaskList, Form, etc.)
 *   Agent 7  — Frontend state management (Context / Redux / Zustand)
 *   Agent 8  — Tests (unit + integration)
 *   Agent 9  — Documentation (README, API docs)
 *   Agent 10 — Deployment config (Docker, CI/CD)
 *
 * Integration notes:
 *   - Expects `db` object from Agent 2's model layer
 *   - Expects `auth` middleware from Agent 4
 *   - Mounts at /api in Agent 1's server.js
 * ============================================================
 */

const express = require('express');
const router = express.Router();

// ---------------------------------------------------------------------------
// Dependency injection: these are expected from other agents' modules.
// We use a factory pattern so Agent 1 can wire everything together.
// ---------------------------------------------------------------------------

/**
 * Creates and returns the API router with all routes mounted.
 *
 * @param {Object} deps
 * @param {Object} deps.db        - Database model layer (Agent 2)
 * @param {Function} deps.auth    - Auth middleware (Agent 4)
 * @returns {express.Router}
 */
function createRoutes({ db, auth }) {

  // =========================================================================
  // HEALTH CHECK — GET /api/health
  // =========================================================================
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // =========================================================================
  // TASKS — CRUD
  // =========================================================================

  /**
   * GET /api/tasks
   * List all tasks for the authenticated user.
   * Supports query params: ?status=pending|completed&sort=created_at&order=asc|desc&page=1&limit=20
   */
  router.get('/tasks', auth, async (req, res, next) => {
    try {
      const userId = req.user.id;
      const {
        status,
        sort = 'created_at',
        order = 'desc',
        page = 1,
        limit = 20,
        search,
      } = req.query;

      const filters = { userId };
      if (status && ['pending', 'in_progress', 'completed'].includes(status)) {
        filters.status = status;
      }
      if (search) {
        filters.search = search;
      }

      const allowedSortFields = ['created_at', 'updated_at', 'due_date', 'priority', 'title'];
      const safeSort = allowedSortFields.includes(sort) ? sort : 'created_at';
      const safeOrder = order === 'asc' ? 'asc' : 'desc';
      const safePage = Math.max(1, parseInt(page, 10) || 1);
      const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (safePage - 1) * safeLimit;

      const { tasks, total } = await db.tasks.findAll({
        filters,
        sort: safeSort,
        order: safeOrder,
        limit: safeLimit,
        offset,
      });

      res.json({
        data: tasks,
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/tasks/:id
   * Get a single task by ID.
   */
  router.get('/tasks/:id', auth, async (req, res, next) => {
    try {
      const task = await db.tasks.findById(req.params.id);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (task.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({ data: task });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/tasks
   * Create a new task.
   * Body: { title, description?, due_date?, priority?, status? }
   */
  router.post('/tasks', auth, async (req, res, next) => {
    try {
      const { title, description, due_date, priority, status } = req.body;

      // Validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (title.trim().length > 255) {
        return res.status(400).json({ error: 'Title must be 255 characters or less' });
      }

      const validPriorities = ['low', 'medium', 'high'];
      const validStatuses = ['pending', 'in_progress', 'completed'];

      const taskData = {
        user_id: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        due_date: due_date || null,
        priority: validPriorities.includes(priority) ? priority : 'medium',
        status: validStatuses.includes(status) ? status : 'pending',
      };

      const newTask = await db.tasks.create(taskData);

      res.status(201).json({ data: newTask });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PUT /api/tasks/:id
   * Update an existing task.
   * Body: any subset of { title, description, due_date, priority, status }
   */
  router.put('/tasks/:id', auth, async (req, res, next) => {
    try {
      const existing = await db.tasks.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { title, description, due_date, priority, status } = req.body;
      const updates = {};

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return res.status(400).json({ error: 'Title cannot be empty' });
        }
        if (title.trim().length > 255) {
          return res.status(400).json({ error: 'Title must be 255 characters or less' });
        }
        updates.title = title.trim();
      }
      if (description !== undefined) {
        updates.description = description?.trim() || null;
      }
      if (due_date !== undefined) {
        updates.due_date = due_date;
      }
      if (priority !== undefined) {
        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
        }
        updates.priority = priority;
      }
      if (status !== undefined) {
        const validStatuses = ['pending', 'in_progress', 'completed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        updates.status = status;
        if (status === 'completed') {
          updates.completed_at = new Date().toISOString();
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.updated_at = new Date().toISOString();
      const updated = await db.tasks.update(req.params.id, updates);

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/tasks/:id
   * Delete a task.
   */
  router.delete('/tasks/:id', auth, async (req, res, next) => {
    try {
      const existing = await db.tasks.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({ error: 'Task not found' });
      }
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await db.tasks.delete(req.params.id);

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // BATCH OPERATIONS
  // =========================================================================

  /**
   * PATCH /api/tasks/batch
   * Update multiple tasks at once (e.g., mark several as completed).
   * Body: { ids: string[], updates: { status?, priority? } }
   */
  router.patch('/tasks/batch', auth, async (req, res, next) => {
    try {
      const { ids, updates } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array' });
      }
      if (ids.length > 100) {
        return res.status(400).json({ error: 'Cannot batch update more than 100 tasks' });
      }
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ error: 'updates object is required' });
      }

      // Verify ownership of all tasks
      const tasks = await db.tasks.findByIds(ids);
      const unauthorized = tasks.filter(t => t.user_id !== req.user.id);
      if (unauthorized.length > 0) {
        return res.status(403).json({ error: 'Forbidden: some tasks do not belong to you' });
      }

      const safeUpdates = {};
      if (updates.status && ['pending', 'in_progress', 'completed'].includes(updates.status)) {
        safeUpdates.status = updates.status;
        if (updates.status === 'completed') {
          safeUpdates.completed_at = new Date().toISOString();
        }
      }
      if (updates.priority && ['low', 'medium', 'high'].includes(updates.priority)) {
        safeUpdates.priority = updates.priority;
      }

      safeUpdates.updated_at = new Date().toISOString();

      const count = await db.tasks.batchUpdate(ids, safeUpdates);

      res.json({ data: { updated: count } });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/tasks/batch
   * Delete multiple tasks at once.
   * Body: { ids: string[] }
   */
  router.delete('/tasks/batch', auth, async (req, res, next) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids must be a non-empty array' });
      }
      if (ids.length > 100) {
        return res.status(400).json({ error: 'Cannot batch delete more than 100 tasks' });
      }

      const tasks = await db.tasks.findByIds(ids);
      const unauthorized = tasks.filter(t => t.user_id !== req.user.id);
      if (unauthorized.length > 0) {
        return res.status(403).json({ error: 'Forbidden: some tasks do not belong to you' });
      }

      const count = await db.tasks.batchDelete(ids);

      res.json({ data: { deleted: count } });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // STATS — GET /api/tasks/stats
  // =========================================================================

  router.get('/tasks/stats', auth, async (req, res, next) => {
    try {
      const stats = await db.tasks.getStats(req.user.id);

      res.json({
        data: {
          total: stats.total || 0,
          pending: stats.pending || 0,
          in_progress: stats.in_progress || 0,
          completed: stats.completed || 0,
          overdue: stats.overdue || 0,
          completion_rate: stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // USER PROFILE — minimal, for frontend display
  // =========================================================================

  /**
   * GET /api/me
   * Return the authenticated user's profile.
   */
  router.get('/me', auth, async (req, res, next) => {
    try {
      const user = await db.users.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Never return password hash
      const { password_hash, ...safeUser } = user;
      res.json({ data: safeUser });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PUT /api/me
   * Update the authenticated user's profile.
   * Body: { name?, email? }
   */
  router.put('/me', auth, async (req, res, next) => {
    try {
      const { name, email } = req.body;
      const updates = {};

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          return res.status(400).json({ error: 'Name cannot be empty' });
        }
        updates.name = name.trim();
      }
      if (email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
        updates.email = email.toLowerCase().trim();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.updated_at = new Date().toISOString();
      const updated = await db.users.update(req.user.id, updates);
      const { password_hash, ...safeUser } = updated;

      res.json({ data: safeUser });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // AUTH ROUTES — login/register (delegates to Agent 4's logic)
  // =========================================================================

  /**
   * POST /api/auth/register
   * Body: { name, email, password }
   */
  router.post('/auth/register', async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      const existingUser = await db.users.findByEmail(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Agent 4 provides hashPassword and generateToken
      const { hashPassword, generateToken } = require('../middleware/auth');

      const hashedPassword = await hashPassword(password);
      const user = await db.users.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword,
      });

      const token = generateToken({ id: user.id, email: user.email });
      const { password_hash, ...safeUser } = user;

      res.status(201).json({ data: { user: safeUser, token } });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  router.post('/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await db.users.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const { comparePassword, generateToken } = require('../middleware/auth');
      const valid = await comparePassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({ id: user.id, email: user.email });
      const { password_hash, ...safeUser } = user;

      res.json({ data: { user: safeUser, token } });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // GLOBAL ERROR HANDLER (middleware — Agent 1 can also mount this)
  // =========================================================================

  router.use((err, req, res, _next) => {
    console.error(`[API Error] ${req.method} ${req.path}:`, err.message);

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;

    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  return router;
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = createRoutes;

/**
 * Usage by Agent 1 (server.js):
 *
 *   const express = require('express');
 *   const app = express();
 *   const db = require('./models');           // Agent 2
 *   const { auth } = require('./middleware/auth'); // Agent 4
 *   const createRoutes = require('./routes/tasks'); // Agent 3 (this file)
 *
 *   app.use(express.json());
 *   app.use('/api', createRoutes({ db, auth }));
 *
 *   app.listen(3001, () => console.log('Server running on :3001'));
 */
