// ============================================================
// Agent 2: Database Connection & Initialization
// Uses better-sqlite3 for synchronous, fast SQLite access
// ============================================================

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

export interface DbConfig {
  /** Path to the SQLite database file. Use ":memory:" for tests. */
  dbPath?: string;
  /** Whether to run the schema migration on init. Default true. */
  migrate?: boolean;
}

const DEFAULT_CONFIG: Required<DbConfig> = {
  dbPath: path.join(process.cwd(), "data", "kanban.db"),
  migrate: true,
};

/**
 * Initialise (or return existing) database connection.
 * Safe to call multiple times — returns singleton.
 */
export function getDb(config: DbConfig = {}): Database.Database {
  if (db) return db;

  const opts = { ...DEFAULT_CONFIG, ...config };

  // Ensure directory exists for file-based DBs
  if (opts.dbPath !== ":memory:") {
    const dir = path.dirname(opts.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new Database(opts.dbPath);

  // Performance & safety pragmas
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  if (opts.migrate) {
    migrate(db);
  }

  return db;
}

/**
 * Run schema migration from schema.sql
 */
function migrate(database: Database.Database): void {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  database.exec(sql);
}

/**
 * Close the database connection (useful for graceful shutdown / tests).
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run a function inside a transaction. Automatically rolls back on error.
 */
export function transaction<T>(fn: () => T): T {
  const database = getDb();
  return database.transaction(fn)();
}
