// ============================================
// Agent 7 of 10 — Tasks Context
// Manages task state, CRUD, and filtering.
// Integrates with Agent 3's API routes and
// is consumed by Agent 8's pages/views.
// ============================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tasksApi } from './api';

const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    sort: 'createdAt:desc',
  });

  // Fetch tasks whenever filters change
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.getAll(filters);
      setTasks(data.tasks || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(async (task) => {
    const created = await tasksApi.create(task);
    setTasks((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await tasksApi.update(id, updates);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    if (selectedTask?.id === id) setSelectedTask(updated);
    return updated;
  }, [selectedTask]);

  const deleteTask = useCallback(async (id) => {
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask?.id === id) setSelectedTask(null);
  }, [selectedTask]);

  const toggleComplete = useCallback(async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const completed = task.status !== 'completed';
    const updated = await tasksApi.toggleComplete(id, completed);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, [tasks]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Derived state
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    todo: tasks.filter((t) => t.status === 'todo').length,
  };

  const value = {
    tasks,
    selectedTask,
    setSelectedTask,
    loading,
    error,
    filters,
    stats,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    updateFilters,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}

export default TasksContext;
