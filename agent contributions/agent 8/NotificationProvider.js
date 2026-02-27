/**
 * Agent 8 — Client: NotificationProvider
 *
 * React context wrapper so any component in Agent 7's UI tree can
 * access notifications via `useNotificationContext()`.
 *
 * Usage (Agent 4's app shell):
 *   import { NotificationProvider } from './agent-8-notifications/client/NotificationProvider';
 *
 *   <NotificationProvider token={authToken}>
 *     <App />
 *   </NotificationProvider>
 */

import React, { createContext, useContext } from 'react';
import { useNotifications } from './useNotifications';

const NotificationContext = createContext(null);

export function NotificationProvider({ token, wsUrl, children }) {
  const value = useNotifications({ token, wsUrl });

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook for child components (Agent 7) to consume notification state.
 *
 * @returns {{ notifications, unreadCount, connected, markRead, markAllRead, clearAll, refresh }}
 */
export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationContext must be used within a <NotificationProvider>');
  }
  return ctx;
}

export default NotificationProvider;
