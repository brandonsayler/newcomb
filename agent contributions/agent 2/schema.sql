-- ============================================================
-- Agent 2: Database Schema for Kanban Collaborative Board
-- SQLite3 (via better-sqlite3)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ===================== USERS =====================
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ===================== BOARDS =====================
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id);

-- ===================== BOARD MEMBERS =====================
CREATE TABLE IF NOT EXISTS board_members (
  board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user ON board_members(user_id);

-- ===================== COLUMNS =====================
CREATE TABLE IF NOT EXISTS columns (
  id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  board_id  TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  position  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);

-- ===================== TASKS =====================
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  column_id   TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  priority    TEXT NOT NULL CHECK (priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
  labels      TEXT NOT NULL DEFAULT '[]',   -- JSON array stored as text
  position    INTEGER NOT NULL DEFAULT 0,
  due_date    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- ===================== COMMENTS =====================
CREATE TABLE IF NOT EXISTS comments (
  id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  task_id   TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);

-- ===================== TRIGGERS: auto-update updated_at =====================
CREATE TRIGGER IF NOT EXISTS trg_users_updated AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_boards_updated AFTER UPDATE ON boards
BEGIN
  UPDATE boards SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_columns_updated AFTER UPDATE ON columns
BEGIN
  UPDATE columns SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_comments_updated AFTER UPDATE ON comments
BEGIN
  UPDATE comments SET updated_at = datetime('now') WHERE id = NEW.id;
END;
