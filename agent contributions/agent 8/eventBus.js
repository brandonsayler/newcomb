/**
 * Agent 8 — Event Bus
 *
 * A lightweight publish/subscribe event bus that decouples business-logic
 * modules (Agent 6) from the notification delivery system.
 *
 * Usage:
 *   eventBus.emit('task:assigned', { taskId, assigneeId, assignedBy });
 *   eventBus.on('task:assigned', handler);
 */

const EventEmitter = require('events');

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this._history = [];      // recent events for debugging
    this._maxHistory = 200;
  }

  /**
   * Emit an application event.
   * @param {string} event — namespaced event name, e.g. 'task:created'
   * @param {object} payload
   */
  emit(event, payload = {}) {
    const envelope = {
      event,
      payload,
      timestamp: new Date().toISOString(),
    };

    this._history.push(envelope);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EventBus] ${event}`, JSON.stringify(payload).slice(0, 120));
    }

    return super.emit(event, envelope);
  }

  /** Return last N events (useful for debugging / admin dashboard). */
  recentEvents(n = 20) {
    return this._history.slice(-n);
  }
}

// Singleton — every module that requires this file gets the same instance.
const eventBus = new AppEventBus();

module.exports = { eventBus, AppEventBus };
