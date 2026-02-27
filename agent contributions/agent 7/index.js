// ============================================
// Agent 7 of 10 — AppProviders & Barrel Export
// Composes all context providers and re-exports
// everything for clean imports.
//
// Usage by other agents:
//   import { AppProviders } from './state';          // Agent 5 wraps <App>
//   import { useTasks, useAuth } from './state';     // Agent 8 uses in pages
//   import { tasksApi } from './state';              // Agent 9 uses in tests
// ============================================

import React from 'react';
import { AuthProvider } from './AuthContext';
import { TasksProvider } from './TasksContext';
import { ProjectsProvider } from './ProjectsContext';
import { NotificationsProvider } from './NotificationsContext';

// Compose all providers. Order matters:
// Auth wraps everything (most pages need user).
// Notifications wraps data providers (actions can trigger toasts).
export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <ProjectsProvider>
          <TasksProvider>{children}</TasksProvider>
        </ProjectsProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}

// Re-export everything from one entry point
export { authApi, tasksApi, projectsApi } from './api';
export { default as request } from './api';
export { AuthProvider, useAuth } from './AuthContext';
export { TasksProvider, useTasks } from './TasksContext';
export { ProjectsProvider, useProjects } from './ProjectsContext';
export { NotificationsProvider, useNotifications } from './NotificationsContext';
