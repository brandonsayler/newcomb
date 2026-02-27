/**
 * NotificationService — In-app notification delivery.
 *
 * This is a dependency of most other services. It writes to
 * Agent 2's Notification model and, optionally, pushes via
 * websocket (if Agent 3 exposes a socket.io / WS layer).
 */

class NotificationService {
  constructor({ db, io = null }) {
    this.db = db;
    this.io = io; // optional socket.io instance from Agent 3
  }

  async send({ userId, type, payload }) {
    const notification = await this.db.Notification.create({
      userId,
      type,
      payload: JSON.stringify(payload),
      read: false,
    });

    // Real-time push if websockets are available
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        type,
        payload,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  async listForUser(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
    const where = { userId };
    if (unreadOnly) where.read = false;

    const offset = (page - 1) * limit;
    const { rows, count } = await this.db.Notification.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      notifications: rows.map((n) => ({
        ...n.toJSON(),
        payload: JSON.parse(n.payload),
      })),
      total: count,
      unreadCount: unreadOnly ? count : undefined,
    };
  }

  async markRead(notificationId, userId) {
    const n = await this.db.Notification.findOne({
      where: { id: notificationId, userId },
    });
    if (n) await n.update({ read: true });
    return n;
  }

  async markAllRead(userId) {
    await this.db.Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );
    return { success: true };
  }
}

module.exports = NotificationService;
