/**
 * AGENT 6 — State Management & Data Fetching
 * ============================================
 * Kanban Task Manager — Collaborative 10-Agent Build
 *
 * This module provides the central client-side state store
 * and API data-fetching hooks for the entire frontend.
 *
 * Dependencies (from other agents):
 *   Agent 1 — DB models define the shapes (Task, Board, Column, User)
 *   Agent 2 — Auth module provides tokens & currentUser
 *   Agent 3 — REST API at /api/v1/* provides CRUD endpoints
 *   Agent 5 — UI components consume this store via hooks
 *   Agent 7 — Dashboard pages use the exported hooks
 *   Agent 8 — Search/filter module extends the selectors here
 *
 * Tech: Zustand (lightweight, no boilerplate, works with React 18+)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types (mirroring Agent 1's DB models) ────────────────────────

export type Priority = "none" | "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  assignee?: User;
  labels: Label[];
  boardId: string;
  columnId: string;
  order: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  boardId: string;
  order: number;
  taskIds: string[];
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

// ─── Store State Shape ────────────────────────────────────────────

interface TaskStoreState {
  // Data
  boards: Record<string, Board>;
  tasks: Record<string, Task>;
  currentBoardId: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  optimisticUpdates: Map<string, Task>;

  // Board actions
  setCurrentBoard: (boardId: string) => void;
  fetchBoards: () => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (title: string, description?: string) => Promise<Board>;
  deleteBoard: (boardId: string) => Promise<void>;

  // Task actions
  fetchTasks: (boardId: string) => Promise<void>;
  createTask: (task: Partial<Task> & { title: string; boardId: string; columnId: string }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, newOrder: number) => Promise<void>;

  // Column actions
  createColumn: (boardId: string, title: string) => Promise<Column>;
  updateColumn: (columnId: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

// ─── API Client (connects to Agent 3's REST API) ──────────────────

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("auth_token"); // from Agent 2
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Store Implementation ─────────────────────────────────────────

const initialState = {
  boards: {} as Record<string, Board>,
  tasks: {} as Record<string, Task>,
  currentBoardId: null as string | null,
  isLoading: false,
  error: null as string | null,
  optimisticUpdates: new Map<string, Task>(),
};

export const useTaskStore = create<TaskStoreState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ── Board actions ─────────────────────────────────────

        setCurrentBoard: (boardId) =>
          set((state) => {
            state.currentBoardId = boardId;
          }),

        fetchBoards: async () => {
          set((s) => { s.isLoading = true; s.error = null; });
          try {
            const boards = await apiFetch<Board[]>("/boards");
            set((s) => {
              s.boards = {};
              boards.forEach((b) => (s.boards[b.id] = b));
              s.isLoading = false;
            });
          } catch (err: any) {
            set((s) => { s.error = err.message; s.isLoading = false; });
          }
        },

        fetchBoard: async (boardId) => {
          set((s) => { s.isLoading = true; s.error = null; });
          try {
            const board = await apiFetch<Board>(`/boards/${boardId}`);
            set((s) => {
              s.boards[board.id] = board;
              s.isLoading = false;
            });
          } catch (err: any) {
            set((s) => { s.error = err.message; s.isLoading = false; });
          }
        },

        createBoard: async (title, description) => {
          set((s) => { s.isLoading = true; s.error = null; });
          try {
            const board = await apiFetch<Board>("/boards", {
              method: "POST",
              body: JSON.stringify({ title, description }),
            });
            set((s) => {
              s.boards[board.id] = board;
              s.isLoading = false;
            });
            return board;
          } catch (err: any) {
            set((s) => { s.error = err.message; s.isLoading = false; });
            throw err;
          }
        },

        deleteBoard: async (boardId) => {
          set((s) => { s.isLoading = true; s.error = null; });
          try {
            await apiFetch(`/boards/${boardId}`, { method: "DELETE" });
            set((s) => {
              delete s.boards[boardId];
              if (s.currentBoardId === boardId) s.currentBoardId = null;
              // Remove associated tasks
              Object.keys(s.tasks).forEach((id) => {
                if (s.tasks[id].boardId === boardId) delete s.tasks[id];
              });
              s.isLoading = false;
            });
          } catch (err: any) {
            set((s) => { s.error = err.message; s.isLoading = false; });
          }
        },

        // ── Task actions ──────────────────────────────────────

        fetchTasks: async (boardId) => {
          set((s) => { s.isLoading = true; s.error = null; });
          try {
            const tasks = await apiFetch<Task[]>(`/boards/${boardId}/tasks`);
            set((s) => {
              tasks.forEach((t) => (s.tasks[t.id] = t));
              s.isLoading = false;
            });
          } catch (err: any) {
            set((s) => { s.error = err.message; s.isLoading = false; });
          }
        },

        createTask: async (taskData) => {
          set((s) => { s.error = null; });
          try {
            const task = await apiFetch<Task>(
              `/boards/${taskData.boardId}/tasks`,
              { method: "POST", body: JSON.stringify(taskData) }
            );
            set((s) => {
              s.tasks[task.id] = task;
              // Add task ID to the correct column
              const board = s.boards[task.boardId];
              if (board) {
                const col = board.columns.find((c) => c.id === task.columnId);
                if (col) col.taskIds.push(task.id);
              }
            });
            return task;
          } catch (err: any) {
            set((s) => { s.error = err.message; });
            throw err;
          }
        },

        updateTask: async (taskId, updates) => {
          const prev = get().tasks[taskId];
          if (!prev) throw new Error(`Task ${taskId} not found`);

          // Optimistic update
          const optimistic = { ...prev, ...updates, updatedAt: new Date().toISOString() };
          set((s) => {
            s.tasks[taskId] = optimistic as Task;
            s.optimisticUpdates.set(taskId, prev);
          });

          try {
            const task = await apiFetch<Task>(`/tasks/${taskId}`, {
              method: "PATCH",
              body: JSON.stringify(updates),
            });
            set((s) => {
              s.tasks[task.id] = task;
              s.optimisticUpdates.delete(taskId);
            });
            return task;
          } catch (err: any) {
            // Rollback optimistic update
            set((s) => {
              s.tasks[taskId] = prev;
              s.optimisticUpdates.delete(taskId);
              s.error = err.message;
            });
            throw err;
          }
        },

        deleteTask: async (taskId) => {
          const task = get().tasks[taskId];
          if (!task) return;
          try {
            await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
            set((s) => {
              delete s.tasks[taskId];
              // Remove from column
              const board = s.boards[task.boardId];
              if (board) {
                const col = board.columns.find((c) => c.id === task.columnId);
                if (col) col.taskIds = col.taskIds.filter((id) => id !== taskId);
              }
            });
          } catch (err: any) {
            set((s) => { s.error = err.message; });
          }
        },

        moveTask: async (taskId, toColumnId, newOrder) => {
          const task = get().tasks[taskId];
          if (!task) return;
          const fromColumnId = task.columnId;

          // Optimistic move
          set((s) => {
            const board = s.boards[task.boardId];
            if (!board) return;

            // Remove from old column
            const fromCol = board.columns.find((c) => c.id === fromColumnId);
            if (fromCol) fromCol.taskIds = fromCol.taskIds.filter((id) => id !== taskId);

            // Insert into new column
            const toCol = board.columns.find((c) => c.id === toColumnId);
            if (toCol) toCol.taskIds.splice(newOrder, 0, taskId);

            // Update task
            s.tasks[taskId].columnId = toColumnId;
            s.tasks[taskId].order = newOrder;
            s.tasks[taskId].status = columnStatusMap(toCol?.title);
          });

          try {
            await apiFetch(`/tasks/${taskId}/move`, {
              method: "POST",
              body: JSON.stringify({ columnId: toColumnId, order: newOrder }),
            });
          } catch (err: any) {
            // Rollback — re-fetch the board
            get().fetchBoard(task.boardId);
            set((s) => { s.error = err.message; });
          }
        },

        // ── Column actions ────────────────────────────────────

        createColumn: async (boardId, title) => {
          const column = await apiFetch<Column>(`/boards/${boardId}/columns`, {
            method: "POST",
            body: JSON.stringify({ title }),
          });
          set((s) => {
            const board = s.boards[boardId];
            if (board) board.columns.push(column);
          });
          return column;
        },

        updateColumn: async (columnId, updates) => {
          await apiFetch(`/columns/${columnId}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
          });
          set((s) => {
            for (const board of Object.values(s.boards)) {
              const col = board.columns.find((c) => c.id === columnId);
              if (col) Object.assign(col, updates);
            }
          });
        },

        deleteColumn: async (columnId) => {
          await apiFetch(`/columns/${columnId}`, { method: "DELETE" });
          set((s) => {
            for (const board of Object.values(s.boards)) {
              board.columns = board.columns.filter((c) => c.id !== columnId);
            }
          });
        },

        reorderColumns: async (boardId, columnIds) => {
          // Optimistic reorder
          set((s) => {
            const board = s.boards[boardId];
            if (!board) return;
            const colMap = new Map(board.columns.map((c) => [c.id, c]));
            board.columns = columnIds
              .map((id, i) => {
                const col = colMap.get(id);
                if (col) col.order = i;
                return col;
              })
              .filter(Boolean) as Column[];
          });

          await apiFetch(`/boards/${boardId}/columns/reorder`, {
            method: "POST",
            body: JSON.stringify({ columnIds }),
          });
        },

        // ── Utility ───────────────────────────────────────────

        clearError: () => set((s) => { s.error = null; }),

        reset: () => set(() => ({ ...initialState, optimisticUpdates: new Map() })),
      })),
      {
        name: "kanban-task-store",
        partialize: (state) => ({
          currentBoardId: state.currentBoardId,
        }),
      }
    ),
    { name: "TaskStore" }
  )
);

// ─── Helper ────────────────────────────────────────────────────────

function columnStatusMap(columnTitle?: string): TaskStatus {
  if (!columnTitle) return "todo";
  const lower = columnTitle.toLowerCase();
  if (lower.includes("progress") || lower.includes("doing")) return "in_progress";
  if (lower.includes("review")) return "review";
  if (lower.includes("done") || lower.includes("complete")) return "done";
  return "todo";
}
