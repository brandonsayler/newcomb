/**
 * AGENT 6 — Public API
 * =====================
 * Single import point for all state management.
 *
 * Usage by other agents:
 *   import { useTaskStore, useCurrentBoard, useTaskActions, useAuthStore } from "@/store";
 */

// Core stores
export { useTaskStore } from "./taskStore";
export { useAuthStore } from "./authStore";

// Types
export type {
  Task,
  Board,
  Column,
  User,
  Label,
  Priority,
  TaskStatus,
} from "./taskStore";

// Derived hooks & selectors
export {
  useBoards,
  useCurrentBoard,
  useTask,
  useBoardTasks,
  useTasksByStatus,
  useTasksByAssignee,
  useOverdueTasks,
  useTasksByPriority,
  useBoardStats,
  useStoreStatus,
  useTaskActions,
} from "./hooks";

export type { BoardStats } from "./hooks";
