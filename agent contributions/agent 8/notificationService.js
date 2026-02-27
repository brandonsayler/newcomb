/**
 * Agent 8 — Notification Service
 *
 * Creates, stores, and delivers notifications.
 * Depends on Agent 1's database layer (expects a `Notification` model).
 * Falls back to an in-memory store if no DB is available (for standalone testing).
 */

const { eventBus } = require('./eventBus');

// ---------------------------------------------------------------------------
// In-memory fallback store (replaced by Agent 1's DB in production)
// ---------------------------------------------------------------------------
let memoryStore = [];
let nextId = 1;

const db = {
  async create(data) {
    const record = { id: String(nextId++), ...data, read: false, createdAt: new Date().toISOString() };
    memoryStore.push(record);
    return record;
  },
  async findByUser(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
    let results = memoryStore.filter(n => n.userId === userId);
    if (unreadOnly) results = results.filter(n => !n.read);
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return results.slice(offset, offset + limit);
  },
  async markRead(ids, userId) {
    let count = 0;
    memoryStore.forEach(n => {
      if (ids.includes(n.id) && n.userId === userId && !n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
        count++;
      }
    });
    return count;
  },
  async markAllRead(userId) {
    let count = 0;
    memoryStore.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
        count++;
      }
    });
    return count;
  },
  async countUnread(userId) {
    return memoryStore.filter(n => n.userId === userId && !n.read).length;
  },
  async deleteForUser(userId) {
    const before = memoryStore.length;
    memoryStore = memoryStore.filter(n => n.userId !== userId);
    return before - memoryStore.length;
  },
  _reset() { memoryStore = []; nextId = 1; },
};

// ---------------------------------------------------------------------------
// Notification types & templates
// ---------------------------------------------------------------------------
const NOTIFICATION_TYPES = {
  TASK_ASSIGNED:    'task:assigned',
  TASK_COMPLETED:   'task:completed',
  TASK_COMMENTED:   'task:commented',
  TASK_DUE_SOON:    'task:due_soon',
  TASK_OVERDUE:     'task:overdue',
  MENTION:          'mention',
  COLLABORATOR_ADDED: 'collaborator:added',
  SYSTEM:           'system',
};

const templates = {
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: (p) => ({
    title: 'New task assigned',
    body: `You were assigned "${p.taskTitle}" by ${p.assignedByName || 'someone'}.`,
    link: `/tasks/${p.taskId}`,
  }),
  [NOTIFICATION_TYPES.TASK_COMPLETED]: (p) => ({
    title: 'Task completed',
    body: `"${p.taskTitle}" was marked complete by ${p.completedByName || 'someone'}.`,
    link: `/tasks/${p.taskId}`,
  }),
  [NOTIFICATION_TYPES.TASK_COMMENTED]: (p) => ({
    title: 'New comment',
    body: `${p.authorName || 'Someone'} commented on "${p.taskTitle}".`,
    link: `/tasks/${p.taskId}#comment-${p.commentId}`,
  }),
  [NOTIFICATION_TYPES.TASK_DUE_SOON]: (p) => ({
    title: 'Task due soon',
    body: `"${p.taskTitle}" is due ${p.dueIn || 'soon'}.`,
    link: `/tasks/${p.taskId}`,
  }),
  [NOTIFICATION_TYPES.TASK_OVERDUE]: (p) => ({
    title: 'Task overdue',
    body: `"${p.taskTitle}" is past its due date.`,
    link: `/tasks/${p.taskId}`,
  }),
  [NOTIFICATION_TYPES.MENTION]: (p) => ({
    title: 'You were mentioned',
    body: `${p.mentionedByName || 'Someone'} mentioned you in "${p.context || 'a task'}".`,
    link: p.link || '#',
  }),
  [NOTIFICATION_TYPES.COLLABORATOR_ADDED]: (p) => ({
    title: 'Added as collaborator',
    body: `You were added to "${p.taskTitle}" by ${p.addedByName || 'someone'}.`,
    link: `/tasks/${p.taskId}`,
  }),
  [NOTIFICATION_TYPES.SYSTEM]: (p) => ({
    title: p.title || 'System notification',
    body: p.body || '',
    link: p.link || '#',
  }),
};

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------
class NotificationService {
  /**
   * @param {object} opts
   * @param {object} [opts.db]       — Agent 1's DB adapter (defaults to in-memory)
   * @param {object} [opts.wsServer] — Agent 8's WebSocket broadcast reference
   */
  constructor({ database, wsServer } = {}) {
    this.db = database || db;
    this.wsServer = wsServer || null;
    this._registerEventListeners();
  }

  // -- Public API -----------------------------------------------------------

  async notify(userId, type, payload = {}) {
    const template = templates[type];
    const content = template ? template(payload) : {
      title: type,
      body: JSON.stringify(payload),
      link: '#',
    };

    const notification = await this.db.create({
      userId,
      type,
      ...content,
      meta: payload,
    });

    // Push in real time if the user has an open WebSocket
    if (this.wsServer) {
      this.wsServer.sendToUser(userId, {
        type: 'notification:new',
        notification,
      });
    }

    return notification;
  }

  async notifyMany(userIds, type, payload = {}) {
    return Promise.all(userIds.map(uid => this.notify(uid, type, payload)));
  }

  async getForUser(userId, opts) {
    return this.db.findByUser(userId, opts);
  }

  async unreadCount(userId) {
    return this.db.countUnread(userId);
  }

  async markRead(userId, ids) {
    const count = await this.db.markRead(ids, userId);
    if (this.wsServer) {
      this.wsServer.sendToUser(userId, { type: 'notification:read', ids });
    }
    return count;
  }

  async markAllRead(userId) {
    const count = await this.db.markAllRead(userId);
    if (this.wsServer) {
      this.wsServer.sendToUser(userId, { type: 'notification:allRead' });
    }
    return count;
  }

  async clearAll(userId) {
    return this.db.deleteForUser(userId);
  }

  // -- Internal: listen for domain events from Agent 6 ---------------------

  _registerEventListeners() {
    eventBus.on('task:assigned', ({ payload }) => {
      if (payload.assigneeId) {
        this.notify(payload.assigneeId, NOTIFICATION_TYPES.TASK_ASSIGNED, payload);
      }
    });

    eventBus.on('task:completed', ({ payload }) => {
      (payload.watcherIds || []).forEach(uid => {
        this.notify(uid, NOTIFICATION_TYPES.TASK_COMPLETED, payload);
      });
    });

    eventBus.on('task:commented', ({ payload }) => {
      (payload.subscriberIds || []).forEach(uid => {
        if (uid !== payload.authorId) {
          this.notify(uid, NOTIFICATION_TYPES.TASK_COMMENTED, payload);
        }
      });
    });

    eventBus.on('task:due_soon', ({ payload }) => {
      if (payload.assigneeId) {
        this.notify(payload.assigneeId, NOTIFICATION_TYPES.TASK_DUE_SOON, payload);
      }
    });

    eventBus.on('mention', ({ payload }) => {
      if (payload.mentionedUserId) {
        this.notify(payload.mentionedUserId, NOTIFICATION_TYPES.MENTION, payload);
      }
    });
  }
}

module.exports = { NotificationService, NOTIFICATION_TYPES, _memoryDb: db };
