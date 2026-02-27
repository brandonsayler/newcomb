// ============================================================
// SHARED TYPES — Agent 1 likely owns this canonical version,
// but Agent 2 includes it for completeness / contract definition.
// ============================================================

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  priority: "low" | "medium" | "high" | "urgent";
  labels: string[];
  position: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// DTOs for creation (no id/timestamps — DB generates those)
export type CreateUser = Pick<User, "username" | "email" | "password_hash">;
export type CreateBoard = Pick<Board, "name" | "owner_id"> &
  Partial<Pick<Board, "description">>;
export type CreateColumn = Pick<Column, "board_id" | "name" | "position">;
export type CreateTask = Pick<Task, "column_id" | "board_id" | "title"> &
  Partial<Pick<Task, "description" | "assignee_id" | "priority" | "labels" | "position" | "due_date">>;
export type CreateComment = Pick<Comment, "task_id" | "author_id" | "body">;
