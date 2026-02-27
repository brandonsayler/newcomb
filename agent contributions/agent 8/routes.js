/**
 * Agent 8 — Notification REST Routes
 *
 * Express router to be mounted by Agent 3 at `/api/notifications`.
 * Expects `req.user` to be populated by Agent 2's auth middleware.
 *
 * Endpoints:
 *   GET    /                — list notifications for current user
 *   GET    /unread-count    — badge count
 *   PATCH  /read            — mark specific IDs as read
 *   PATCH  /read-all        — mark all as read
 *   DELETE /                — clear all notifications
 */

const express = require('express');
const router = express.Router();

// The NotificationService instance is injected at mount time (see bottom).
let service = null;

// -- Helper: extract userId from auth middleware ----------------------------
const uid = (req) => req.user?.id || req.user?.userId || 'anonymous';

// -- Routes ----------------------------------------------------------------

router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, unread } = req.query;
    const notifications = await service.getForUser(uid(req), {
      limit: Number(limit),
      offset: Number(offset),
      unreadOnly: unread === 'true',
    });
    const unreadCount = await service.unreadCount(uid(req));
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await service.unreadCount(uid(req));
    res.json({ unreadCount: count });
  } catch (err) { next(err); }
});

router.patch('/read', async (req, res, next) => {
  try {
    const { ids } = req.body; // string[]
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    const updated = await service.markRead(uid(req), ids);
    res.json({ updated });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const updated = await service.markAllRead(uid(req));
    res.json({ updated });
  } catch (err) { next(err); }
});

router.delete('/', async (req, res, next) => {
  try {
    const deleted = await service.clearAll(uid(req));
    res.json({ deleted });
  } catch (err) { next(err); }
});

// -- Factory: create router with injected service ---------------------------

/**
 * @param {import('./notificationService').NotificationService} notificationService
 * @returns {express.Router}
 */
function createNotificationRoutes(notificationService) {
  service = notificationService;
  return router;
}

// Also allow direct require (service set later via .setService)
router.setService = (s) => { service = s; };

module.exports = createNotificationRoutes;
module.exports.router = router;
