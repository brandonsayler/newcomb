# Agent 8 — Notifications & Real-Time Events System

## Collaborative Task Manager · Component 8 of 10

This module provides the **notification and real-time event system** for the
collaborative task management application being built by 10 independent agents.

### What This Component Does
- WebSocket server for real-time push to connected clients
- Event bus for decoupled inter-module communication
- Notification creation, storage, and delivery
- Read/unread tracking and bulk operations
- Email digest fallback for offline users

### Expected Interfaces from Other Agents
| Agent | What we import / expect |
|-------|------------------------|
| 1 | `Notification` model/table in DB (`id, userId, type, title, body, read, createdAt`) |
| 2 | Auth middleware — we verify JWT on WebSocket `upgrade` |
| 3 | We export routes that Agent 3 mounts at `/api/notifications` |
| 5 | State management subscribes to our WebSocket messages |
| 6 | Business logic calls `eventBus.emit()` when tasks change |
| 7 | UI components render our notification payloads |

### Exports
```js
// Server-side
const { eventBus }            = require('./eventBus');
const { NotificationService } = require('./notificationService');
const { attachWebSocket }     = require('./websocket');
const notificationRoutes      = require('./routes');

// Client-side
import { useNotifications }     from './client/useNotifications';
import { NotificationProvider } from './client/NotificationProvider';
```

### Quick Start
```js
// In Agent 3's server setup:
const { attachWebSocket } = require('./agent-8-notifications/websocket');
const notificationRoutes  = require('./agent-8-notifications/routes');

app.use('/api/notifications', notificationRoutes);
attachWebSocket(server); // pass the http.Server instance

// In Agent 6's business logic:
const { eventBus } = require('./agent-8-notifications/eventBus');
eventBus.emit('task:assigned', { taskId, assigneeId, assignedBy });
```
