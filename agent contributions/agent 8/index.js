/**
 * Agent 8 — Notifications & Real-Time Events
 * Entry point / barrel export.
 *
 * Server-side usage:
 *   const { init, eventBus, NotificationService } = require('./agent-8-notifications');
 *   const { notificationService } = init(httpServer, { verifyToken });
 *
 * Client-side usage (via bundler):
 *   import { useNotifications }     from './agent-8-notifications/client/useNotifications';
 *   import { NotificationProvider } from './agent-8-notifications/client/NotificationProvider';
 */

const { eventBus }                           = require('./eventBus');
const { NotificationService, NOTIFICATION_TYPES } = require('./notificationService');
const { attachWebSocket, realtimeServer }    = require('./websocket');
const createNotificationRoutes               = require('./routes');

/**
 * One-call initializer. Wire into Agent 3's Express/HTTP server:
 *
 *   const { notificationService, notificationRoutes } = init(server, opts);
 *   app.use('/api/notifications', authMiddleware, notificationRoutes);
 *
 * @param {import('http').Server} httpServer
 * @param {object} opts
 * @param {Function} [opts.verifyToken] — from Agent 2
 * @param {object}   [opts.database]    — from Agent 1
 * @returns {{ notificationService, notificationRoutes, eventBus, realtimeServer }}
 */
function init(httpServer, opts = {}) {
  // 1. Start WebSocket server
  attachWebSocket(httpServer, { verifyToken: opts.verifyToken });

  // 2. Create notification service with WS reference
  const notificationService = new NotificationService({
    database: opts.database,
    wsServer: realtimeServer,
  });

  // 3. Create Express routes
  const notificationRoutes = createNotificationRoutes(notificationService);

  return {
    notificationService,
    notificationRoutes,
    eventBus,
    realtimeServer,
  };
}

module.exports = {
  init,
  eventBus,
  NotificationService,
  NOTIFICATION_TYPES,
  attachWebSocket,
  realtimeServer,
  createNotificationRoutes,
};
