/**
 * AGENT 6 — Derived Selectors & Convenience Hooks
 * =================================================
 * These hooks provide memoized, derived views of the store
 * for Agent 5's UI components and Agent 7's pages.
 */

import { useMemo } from "react";
import { useTaskStore, Task, Board, Column, Priority, TaskStatus } from "./taskStore";

// ─── Board Hooks ──────────────────────────────────────────────────

/** Get all boards as a sorted array */
export function useBoards(): Board[] {
  const boards = useTaskStore((s) => s.boards);
  return useMemo(
    () => Object.values(boards).sort((a, b) => a.title.localeCompare(b.title)),
    [boards]
  );
}

/** Get the currently selected board with its columns & tasks */
export function useCurrentBoard() {
  const currentBoardId = useTaskStore((s) => s.currentBoardId);
  const boards = useTaskStore((s) => s.boards);
  const tasks = useTaskStore((s) => s.tasks);

  return useMemo(() => {
    if (!currentBoardId) return null;
    const board = boards[currentBoardId];
    if (!board) return null;

    const columnsWithTasks = board.columns
      .sort((a, b) => a.order - b.order)
      .map((col) => ({
        ...col,
        tasks: col.taskIds
          .map((id) => tasks[id])
          .filter(Boolean)
          .sort((a, b) => a.order - b.order),
      }));

    return { ...board, columns: columnsWithTasks };
  }, [currentBoardId, boards, tasks]);
}

// ─── Task Hooks ───────────────────────────────────────────────────

/** Get a single task by ID */
export function useTask(taskId: string): Task | undefined {
  return useTaskStore((s) => s.tasks[taskId]);
}

/** Get all tasks for the current board */
export function useBoardTasks(boardId?: string): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  const currentBoardId = useTaskStore((s) => s.currentBoardId);
  const targetId = boardId || currentBoardId;

  return useMemo(
    () =>
      targetId
        ? Object.values(tasks).filter((t) => t.boardId === targetId)
        : [],
    [tasks, targetId]
  );
}

/** Get tasks grouped by status — useful for Agent 7's dashboard stats */
export function useTasksByStatus(boardId?: string) {
  const tasks = useBoardTasks(boardId);

  return useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    tasks.forEach((t) => grouped[t.status]?.push(t));
    return grouped;
  }, [tasks]);
}

/** Get tasks assigned to a specific user */
export function useTasksByAssignee(userId: string, boardId?: string): Task[] {
  const tasks = useBoardTasks(boardId);
  return useMemo(() => tasks.filter((t) => t.assigneeId === userId), [tasks, userId]);
}

/** Get overdue tasks */
export function useOverdueTasks(boardId?: string): Task[] {
  const tasks = useBoardTasks(boardId);
  return useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
    );
  }, [tasks]);
}

/** Get tasks filtered by priority */
export function useTasksByPriority(priority: Priority, boardId?: string): Task[] {
  const tasks = useBoardTasks(boardId);
  return useMemo(() => tasks.filter((t) => t.priority === priority), [tasks, priority]);
}

// ─── Stats Hook — powers Agent 7's dashboard widgets ──────────────

export interface BoardStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  completionRate: number;
  highPriority: number;
}

export function useBoardStats(boardId?: string): BoardStats {
  const byStatus = useTasksByStatus(boardId);
  const overdue = useOverdueTasks(boardId);

  return useMemo(() => {
    const total =
      byStatus.todo.length +
      byStatus.in_progress.length +
      byStatus.review.length +
      byStatus.done.length;

    return {
      total,
      todo: byStatus.todo.length,
      inProgress: byStatus.in_progress.length,
      review: byStatus.review.length,
      done: byStatus.done.length,
      overdue: overdue.length,
      completionRate: total > 0 ? Math.round((byStatus.done.length / total) * 100) : 0,
      highPriority: [...byStatus.todo, ...byStatus.in_progress].filter(
        (t) => t.priority === "high" || t.priority === "urgent"
      ).length,
    };
  }, [byStatus, overdue]);
}

// ─── Loading & Error Hooks ────────────────────────────────────────

export function useStoreStatus() {
  const isLoading = useTaskStore((s) => s.isLoading);
  const error = useTaskStore((s) => s.error);
  const clearError = useTaskStore((s) => s.clearError);
  return { isLoading, error, clearError };
}

// ─── Action Hooks (stable references) ─────────────────────────────

export function useTaskActions() {
  return {
    fetchBoards: useTaskStore((s) => s.fetchBoards),
    fetchBoard: useTaskStore((s) => s.fetchBoard),
    fetchTasks: useTaskStore((s) => s.fetchTasks),
    createBoard: useTaskStore((s) => s.createBoard),
    deleteBoard: useTaskStore((s) => s.deleteBoard),
    createTask: useTaskStore((s) => s.createTask),
    updateTask: useTaskStore((s) => s.updateTask),
    deleteTask: useTaskStore((s) => s.deleteTask),
    moveTask: useTaskStore((s) => s.moveTask),
    setCurrentBoard: useTaskStore((s) => s.setCurrentBoard),
    createColumn: useTaskStore((s) => s.createColumn),
    updateColumn: useTaskStore((s) => s.updateColumn),
    deleteColumn: useTaskStore((s) => s.deleteColumn),
    reorderColumns: useTaskStore((s) => s.reorderColumns),
  };
}
