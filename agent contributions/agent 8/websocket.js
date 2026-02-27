/**
 * Agent 8 — WebSocket Server
 *
 * Attaches a WebSocket server to the existing HTTP server (from Agent 3).
 * Authenticates connections using JWT (from Agent 2).
 * Maintains a map of userId → Set<WebSocket> for targeted delivery.
 */

const { WebSocketServer } = require('ws');
const url = require('url');

// Placeholder for Agent 2's auth — accepts any token in standalone mode
let verifyToken = async (token) => {
  // In production, Agent 2 provides: const { verifyToken } = require('../agent-2-auth');
  // For now, decode a simple JSON payload or return a test user
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString());
    return payload;
  } catch {
    return { id: 'anonymous', name: 'Anonymous' };
  }
};

class RealtimeServer {
  constructor() {
    /** @type {Map<string, Set<WebSocket>>} */
    this.clients = new Map();
    this.wss = null;
  }

  /**
   * Attach to an existing http.Server.
   * @param {import('http').Server} server
   * @param {object} [opts]
   * @param {Function} [opts.verifyToken] — override token verification (Agent 2)
   */
  attach(server, opts = {}) {
    if (opts.verifyToken) verifyToken = opts.verifyToken;

    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
      try {
        const { query } = url.parse(request.url, true);
        const token = query.token || request.headers['sec-websocket-protocol'];

        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const user = await verifyToken(token);
        if (!user || !user.id) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          ws.userId = user.id;
          ws.userName = user.name || 'User';
          this.wss.emit('connection', ws, request);
        });
      } catch (err) {
        console.error('[WS] Upgrade error:', err.message);
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      const uid = ws.userId;
      if (!this.clients.has(uid)) this.clients.set(uid, new Set());
      this.clients.get(uid).add(ws);

      console.log(`[WS] Connected: user=${uid} (${this.clients.get(uid).size} sockets)`);

      // Send a welcome / connection-ack
      this._send(ws, { type: 'connection:ack', userId: uid, serverTime: new Date().toISOString() });

      ws.on('message', (raw) => this._handleMessage(ws, raw));

      ws.on('close', () => {
        const set = this.clients.get(uid);
        if (set) {
          set.delete(ws);
          if (set.size === 0) this.clients.delete(uid);
        }
        console.log(`[WS] Disconnected: user=${uid}`);
      });

      ws.on('error', (err) => console.error(`[WS] Error (user=${uid}):`, err.message));
    });

    console.log('[WS] Real-time server attached');
    return this;
  }

  // -- Delivery -------------------------------------------------------------

  /** Send a message to a specific user (all their open sockets). */
  sendToUser(userId, message) {
    const sockets = this.clients.get(String(userId));
    if (!sockets) return 0;
    let sent = 0;
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) {
        this._send(ws, message);
        sent++;
      }
    }
    return sent;
  }

  /** Broadcast to every connected client. */
  broadcast(message, excludeUserId = null) {
    let sent = 0;
    for (const [uid, sockets] of this.clients) {
      if (uid === excludeUserId) continue;
      for (const ws of sockets) {
        if (ws.readyState === ws.OPEN) {
          this._send(ws, message);
          sent++;
        }
      }
    }
    return sent;
  }

  /** Number of currently connected unique users. */
  get onlineUserCount() {
    return this.clients.size;
  }

  /** List of online user IDs. */
  get onlineUserIds() {
    return [...this.clients.keys()];
  }

  // -- Internals ------------------------------------------------------------

  _send(ws, data) {
    try {
      ws.send(JSON.stringify(data));
    } catch (err) {
      console.error('[WS] Send error:', err.message);
    }
  }

  _handleMessage(ws, raw) {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'ping':
          this._send(ws, { type: 'pong', ts: Date.now() });
          break;

        case 'typing':
          // Relay typing indicator to other users viewing the same task
          if (msg.taskId) {
            this.broadcast(
              { type: 'typing', userId: ws.userId, userName: ws.userName, taskId: msg.taskId },
              ws.userId,
            );
          }
          break;

        case 'presence:update':
          // Could store status, but for MVP just echo back
          this._send(ws, { type: 'presence:ack', status: msg.status || 'online' });
          break;

        default:
          // Unknown message type — ignore gracefully
          break;
      }
    } catch {
      // Non-JSON or malformed — ignore
    }
  }
}

// Singleton
const realtimeServer = new RealtimeServer();

/**
 * Convenience function for Agent 3 to call:
 *   const { attachWebSocket } = require('./agent-8-notifications/websocket');
 *   attachWebSocket(httpServer);
 */
function attachWebSocket(httpServer, opts) {
  return realtimeServer.attach(httpServer, opts);
}

module.exports = { attachWebSocket, realtimeServer, RealtimeServer };
