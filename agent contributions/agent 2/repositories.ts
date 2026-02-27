// ============================================================
// Agent 2: Data Access Layer (Repository Pattern)
// All database queries live here. Other agents import these
// functions — they never write raw SQL.
// ============================================================

import { getDb, transaction } from "./connection";
import type {
  User,
  Board,
  Column,
  Task,
  Comment,
  BoardMember,
  CreateUser,
  CreateBoard,
  CreateColumn,
  CreateTask,
  CreateComment,
} from "../types";

// ─── Helpers ────────────────────────────────────────────────

function parseLabels<T extends { labels: string | string[] }>(row: T): T & { labels: string[] } {
  return {
    ...row,
    labels: typeof row.labels === "string" ? JSON.parse(row.labels) : row.labels,
  };
}

// ─── Users ──────────────────────────────────────────────────

export const UserRepo = {
  create(data: CreateUser): User {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (@username, @email, @password_hash)
      RETURNING *
    `);
    return stmt.get(data) as User;
  },

  findById(id: string): User | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  },

  findByEmail(email: string): User | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
  },

  findByUsername(username: string): User | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
  },

  update(id: string, data: Partial<Pick<User, "username" | "email" | "avatar_url">>): User | undefined {
    const db = getDb();
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = @${k}`)
      .join(", ");
    if (!fields) return this.findById(id);
    const stmt = db.prepare(`UPDATE users SET ${fields} WHERE id = @id RETURNING *`);
    return stmt.get({ ...data, id }) as User | undefined;
  },

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return result.changes > 0;
  },
};

// ─── Boards ─────────────────────────────────────────────────

export const BoardRepo = {
  create(data: CreateBoard): Board {
    const db = getDb();
    const board = db
      .prepare(
        `INSERT INTO boards (name, description, owner_id)
         VALUES (@name, @description, @owner_id)
         RETURNING *`
      )
      .get({ description: null, ...data }) as Board;

    // Auto-add owner as board member
    db.prepare(
      `INSERT INTO board_members (board_id, user_id, role)
       VALUES (@board_id, @user_id, 'owner')`
    ).run({ board_id: board.id, user_id: data.owner_id });

    // Create default columns
    const defaultColumns = ["To Do", "In Progress", "Done"];
    const colStmt = db.prepare(
      `INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)`
    );
    transaction(() => {
      defaultColumns.forEach((name, i) => colStmt.run(board.id, name, i));
    });

    return board;
  },

  findById(id: string): Board | undefined {
    const db = getDb();
    return db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as Board | undefined;
  },

  findByUser(userId: string): Board[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT b.* FROM boards b
         JOIN board_members bm ON bm.board_id = b.id
         WHERE bm.user_id = ?
         ORDER BY b.updated_at DESC`
      )
      .all(userId) as Board[];
  },

  update(id: string, data: Partial<Pick<Board, "name" | "description">>): Board | undefined {
    const db = getDb();
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = @${k}`)
      .join(", ");
    if (!fields) return this.findById(id);
    return db
      .prepare(`UPDATE boards SET ${fields} WHERE id = @id RETURNING *`)
      .get({ ...data, id }) as Board | undefined;
  },

  delete(id: string): boolean {
    const db = getDb();
    return db.prepare("DELETE FROM boards WHERE id = ?").run(id).changes > 0;
  },
};

// ─── Board Members ──────────────────────────────────────────

export const BoardMemberRepo = {
  add(boardId: string, userId: string, role: BoardMember["role"] = "viewer"): BoardMember {
    const db = getDb();
    return db
      .prepare(
        `INSERT INTO board_members (board_id, user_id, role)
         VALUES (@board_id, @user_id, @role)
         ON CONFLICT(board_id, user_id) DO UPDATE SET role = @role
         RETURNING *`
      )
      .get({ board_id: boardId, user_id: userId, role }) as BoardMember;
  },

  findByBoard(boardId: string): (BoardMember & Pick<User, "username" | "email" | "avatar_url">)[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT bm.*, u.username, u.email, u.avatar_url
         FROM board_members bm
         JOIN users u ON u.id = bm.user_id
         WHERE bm.board_id = ?`
      )
      .all(boardId) as any[];
  },

  remove(boardId: string, userId: string): boolean {
    const db = getDb();
    return (
      db
        .prepare("DELETE FROM board_members WHERE board_id = ? AND user_id = ?")
        .run(boardId, userId).changes > 0
    );
  },

  getRole(boardId: string, userId: string): BoardMember["role"] | null {
    const db = getDb();
    const row = db
      .prepare("SELECT role FROM board_members WHERE board_id = ? AND user_id = ?")
      .get(boardId, userId) as { role: string } | undefined;
    return (row?.role as BoardMember["role"]) ?? null;
  },
};

// ─── Columns ────────────────────────────────────────────────

export const ColumnRepo = {
  create(data: CreateColumn): Column {
    const db = getDb();
    return db
      .prepare(
        `INSERT INTO columns (board_id, name, position)
         VALUES (@board_id, @name, @position)
         RETURNING *`
      )
      .get(data) as Column;
  },

  findByBoard(boardId: string): Column[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM columns WHERE board_id = ? ORDER BY position")
      .all(boardId) as Column[];
  },

  update(id: string, data: Partial<Pick<Column, "name" | "position">>): Column | undefined {
    const db = getDb();
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = @${k}`)
      .join(", ");
    if (!fields) return db.prepare("SELECT * FROM columns WHERE id = ?").get(id) as Column | undefined;
    return db
      .prepare(`UPDATE columns SET ${fields} WHERE id = @id RETURNING *`)
      .get({ ...data, id }) as Column | undefined;
  },

  reorder(boardId: string, orderedIds: string[]): void {
    const db = getDb();
    const stmt = db.prepare("UPDATE columns SET position = ? WHERE id = ? AND board_id = ?");
    transaction(() => {
      orderedIds.forEach((id, i) => stmt.run(i, id, boardId));
    });
  },

  delete(id: string): boolean {
    const db = getDb();
    return db.prepare("DELETE FROM columns WHERE id = ?").run(id).changes > 0;
  },
};

// ─── Tasks ──────────────────────────────────────────────────

export const TaskRepo = {
  create(data: CreateTask): Task {
    const db = getDb();
    const row = db
      .prepare(
        `INSERT INTO tasks (column_id, board_id, title, description, assignee_id, priority, labels, position, due_date)
         VALUES (@column_id, @board_id, @title, @description, @assignee_id, @priority, @labels, @position, @due_date)
         RETURNING *`
      )
      .get({
        description: null,
        assignee_id: null,
        priority: "medium",
        labels: "[]",
        position: 0,
        due_date: null,
        ...data,
        labels: JSON.stringify(data.labels ?? []),
      }) as Task;
    return parseLabels(row);
  },

  findById(id: string): Task | undefined {
    const db = getDb();
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
    return row ? parseLabels(row) : undefined;
  },

  findByColumn(columnId: string): Task[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM tasks WHERE column_id = ? ORDER BY position")
      .all(columnId) as Task[];
    return rows.map(parseLabels);
  },

  findByBoard(boardId: string): Task[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM tasks WHERE board_id = ? ORDER BY position")
      .all(boardId) as Task[];
    return rows.map(parseLabels);
  },

  findByAssignee(userId: string, boardId?: string): Task[] {
    const db = getDb();
    let sql = "SELECT * FROM tasks WHERE assignee_id = ?";
    const params: any[] = [userId];
    if (boardId) {
      sql += " AND board_id = ?";
      params.push(boardId);
    }
    sql += " ORDER BY position";
    return (db.prepare(sql).all(...params) as Task[]).map(parseLabels);
  },

  update(
    id: string,
    data: Partial<Pick<Task, "title" | "description" | "column_id" | "assignee_id" | "priority" | "labels" | "position" | "due_date">>
  ): Task | undefined {
    const db = getDb();
    const processed = { ...data } as any;
    if (data.labels !== undefined) {
      processed.labels = JSON.stringify(data.labels);
    }
    const fields = Object.entries(processed)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => `${k} = @${k}`)
      .join(", ");
    if (!fields) return this.findById(id);
    const row = db
      .prepare(`UPDATE tasks SET ${fields} WHERE id = @id RETURNING *`)
      .get({ ...processed, id }) as Task | undefined;
    return row ? parseLabels(row) : undefined;
  },

  /** Move a task to a different column at a given position */
  move(taskId: string, targetColumnId: string, position: number): Task | undefined {
    const db = getDb();
    return transaction(() => {
      // Shift existing tasks down
      db.prepare(
        `UPDATE tasks SET position = position + 1
         WHERE column_id = ? AND position >= ?`
      ).run(targetColumnId, position);

      // Move the task
      const row = db
        .prepare(
          `UPDATE tasks SET column_id = @column_id, position = @position
           WHERE id = @id RETURNING *`
        )
        .get({ id: taskId, column_id: targetColumnId, position }) as Task | undefined;

      return row ? parseLabels(row) : undefined;
    });
  },

  delete(id: string): boolean {
    const db = getDb();
    return db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
  },

  /** Full-text search across title and description */
  search(boardId: string, query: string): Task[] {
    const db = getDb();
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `SELECT * FROM tasks
         WHERE board_id = ? AND (title LIKE ? OR description LIKE ?)
         ORDER BY updated_at DESC`
      )
      .all(boardId, pattern, pattern) as Task[];
    return rows.map(parseLabels);
  },
};

// ─── Comments ───────────────────────────────────────────────

export const CommentRepo = {
  create(data: CreateComment): Comment {
    const db = getDb();
    return db
      .prepare(
        `INSERT INTO comments (task_id, author_id, body)
         VALUES (@task_id, @author_id, @body)
         RETURNING *`
      )
      .get(data) as Comment;
  },

  findByTask(taskId: string): (Comment & Pick<User, "username" | "avatar_url">)[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT c.*, u.username, u.avatar_url
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.task_id = ?
         ORDER BY c.created_at ASC`
      )
      .all(taskId) as any[];
  },

  update(id: string, body: string): Comment | undefined {
    const db = getDb();
    return db
      .prepare("UPDATE comments SET body = ? WHERE id = ? RETURNING *")
      .get(body, id) as Comment | undefined;
  },

  delete(id: string): boolean {
    const db = getDb();
    return db.prepare("DELETE FROM comments WHERE id = ?").run(id).changes > 0;
  },
};
