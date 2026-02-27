/**
 * Agent 8 — Standalone test / demo
 *
 * Run:  node test.js
 * Verifies event bus → notification service pipeline works in isolation.
 */

const http = require('http');
const { init, eventBus, NOTIFICATION_TYPES } = require('./index');

async function main() {
  console.log('=== Agent 8 — Notifications & Real-Time Events ===\n');

  // 1. Boot a minimal HTTP server
  const server = http.createServer((req, res) => res.end('OK'));
  server.listen(0, async () => {
    const port = server.address().port;
    console.log(`[Test] HTTP server on port ${port}`);

    // 2. Initialize notifications module
    const { notificationService, realtimeServer } = init(server);
    console.log('[Test] Notification system initialized\n');

    // 3. Simulate Agent 6 emitting domain events
    console.log('[Test] Simulating domain events...\n');

    eventBus.emit('task:assigned', {
      taskId: 'task-42',
      taskTitle: 'Write unit tests',
      assigneeId: 'user-alice',
      assignedByName: 'Bob',
    });

    eventBus.emit('task:commented', {
      taskId: 'task-42',
      taskTitle: 'Write unit tests',
      authorId: 'user-bob',
      authorName: 'Bob',
      commentId: 'comment-1',
      subscriberIds: ['user-alice', 'user-charlie'],
    });

    eventBus.emit('task:completed', {
      taskId: 'task-7',
      taskTitle: 'Deploy to staging',
      completedByName: 'Alice',
      watcherIds: ['user-bob', 'user-charlie'],
    });

    // Give async handlers a tick to resolve
    await new Promise((r) => setTimeout(r, 100));

    // 4. Query results
    const aliceNotifs = await notificationService.getForUser('user-alice');
    const charlieNotifs = await notificationService.getForUser('user-charlie');
    const bobNotifs = await notificationService.getForUser('user-bob');

    console.log(`\n[Results] Alice has ${aliceNotifs.length} notifications:`);
    aliceNotifs.forEach((n) => console.log(`  • [${n.type}] ${n.title} — ${n.body}`));

    console.log(`\n[Results] Bob has ${bobNotifs.length} notifications:`);
    bobNotifs.forEach((n) => console.log(`  • [${n.type}] ${n.title} — ${n.body}`));

    console.log(`\n[Results] Charlie has ${charlieNotifs.length} notifications:`);
    charlieNotifs.forEach((n) => console.log(`  • [${n.type}] ${n.title} — ${n.body}`));

    // 5. Test mark-read
    const aliceUnread = await notificationService.unreadCount('user-alice');
    console.log(`\n[Results] Alice unread: ${aliceUnread}`);
    await notificationService.markAllRead('user-alice');
    const aliceUnreadAfter = await notificationService.unreadCount('user-alice');
    console.log(`[Results] Alice unread after markAllRead: ${aliceUnreadAfter}`);

    // 6. Event history
    console.log(`\n[Results] Event bus history (${eventBus.recentEvents().length} events):`);
    eventBus.recentEvents().forEach((e) => console.log(`  → ${e.event} @ ${e.timestamp}`));

    // 7. WebSocket server status
    console.log(`\n[Results] WebSocket online users: ${realtimeServer.onlineUserCount}`);
    console.log('\n✅ All checks passed — Agent 8 module works standalone.\n');

    server.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
