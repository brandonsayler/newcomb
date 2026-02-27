/**
 * Agent 8 — Client: useNotifications React Hook
 *
 * Connects to the WebSocket server, maintains notification state,
 * and exposes helpers for Agent 5 (state management) and Agent 7 (UI).
 *
 * Usage:
 *   const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_RECONNECT_BASE_MS = 1000;
const WS_RECONNECT_MAX_MS = 30000;
const API_BASE = '/api/notifications';

/**
 * Core notification hook.
 * @param {object} opts
 * @param {string} opts.token — JWT for WebSocket auth (from Agent 2)
 * @param {string} [opts.wsUrl] — WebSocket URL (defaults to auto-detect)
 */
export function useNotifications({ token, wsUrl } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(WS_RECONNECT_BASE_MS);

  // -- Fetch initial notifications via REST --------------------------------
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.warn('[Notifications] Fetch failed:', err.message);
    }
  }, [token]);

  // -- WebSocket connection -------------------------------------------------
  const connectWs = useCallback(() => {
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const base = wsUrl || `${protocol}://${window.location.host}`;
    const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = WS_RECONNECT_BASE_MS;
      console.log('[Notifications] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'notification:new':
            setNotifications((prev) => [msg.notification, ...prev]);
            setUnreadCount((c) => c + 1);
            break;

          case 'notification:read':
            setNotifications((prev) =>
              prev.map((n) => (msg.ids.includes(n.id) ? { ...n, read: true } : n)),
            );
            setUnreadCount((c) => Math.max(0, c - (msg.ids?.length || 0)));
            break;

          case 'notification:allRead':
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            break;

          case 'pong':
          case 'connection:ack':
          case 'presence:ack':
            // Internal — no UI update
            break;

          default:
            break;
        }
      } catch {
        // ignore non-JSON frames
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Exponential back-off reconnect
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, WS_RECONNECT_MAX_MS);
        connectWs();
      }, reconnectDelay.current);
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [token, wsUrl]);

  useEffect(() => {
    fetchNotifications();
    connectWs();

    // Keep-alive ping every 30 s
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [fetchNotifications, connectWs]);

  // -- Actions --------------------------------------------------------------

  const markRead = useCallback(async (ids) => {
    try {
      await fetch(`${API_BASE}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });
      // Optimistic update — server also pushes via WS
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - ids.length));
    } catch (err) {
      console.warn('[Notifications] markRead failed:', err.message);
    }
  }, [token]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('[Notifications] markAllRead failed:', err.message);
    }
  }, [token]);

  const clearAll = useCallback(async () => {
    try {
      await fetch(API_BASE, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.warn('[Notifications] clearAll failed:', err.message);
    }
  }, [token]);

  return {
    notifications,
    unreadCount,
    connected,
    markRead,
    markAllRead,
    clearAll,
    refresh: fetchNotifications,
  };
}

export default useNotifications;
