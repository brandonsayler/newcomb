// ============================================
// Agent 7 of 10 — Notifications Context
// Provides toast/notification state for user
// feedback on actions (consumed by Agent 6's
// UI components).
// ============================================

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationsContext = createContext(null);

let nextId = 0;

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message, { type = 'info', duration = 4000 } = {}) => {
      const id = ++nextId;
      const notification = { id, message, type, createdAt: Date.now() };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  // Convenience helpers
  const success = useCallback((msg, opts) => notify(msg, { ...opts, type: 'success' }), [notify]);
  const error = useCallback((msg, opts) => notify(msg, { ...opts, type: 'error' }), [notify]);
  const warning = useCallback((msg, opts) => notify(msg, { ...opts, type: 'warning' }), [notify]);
  const info = useCallback((msg, opts) => notify(msg, { ...opts, type: 'info' }), [notify]);

  const value = {
    notifications,
    notify,
    dismiss,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

export default NotificationsContext;
