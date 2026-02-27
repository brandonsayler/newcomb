// ============================================================
// Agent 2: Database Seed Script
// Run with: npx ts-node src/db/seed.ts
// ============================================================

import { getDb, closeDb, transaction } from "./connection";
import { UserRepo, BoardRepo, ColumnRepo, TaskRepo, CommentRepo } from "./repositories";

function seed() {
  console.log("🌱 Seeding database...");

  transaction(() => {
    // ── Users ──
    const alice = UserRepo.create({
      username: "alice",
      email: "alice@example.com",
      password_hash: "$2b$10$placeholder_hash_alice", // Agent 3 (auth) provides real hashing
    });

    const bob = UserRepo.create({
      username: "bob",
      email: "bob@example.com",
      password_hash: "$2b$10$placeholder_hash_bob",
    });

    const charlie = UserRepo.create({
      username: "charlie",
      email: "charlie@example.com",
      password_hash: "$2b$10$placeholder_hash_charlie",
    });

    console.log(`  ✓ Created ${3} users`);

    // ── Board (auto-creates 3 default columns + owner membership) ──
    const board = BoardRepo.create({
      name: "Sprint 1",
      description: "Our first sprint planning board",
      owner_id: alice.id,
    });

    console.log(`  ✓ Created board "${board.name}"`);

    // Add members
    const { BoardMemberRepo } = require("./repositories");
    BoardMemberRepo.add(board.id, bob.id, "editor");
    BoardMemberRepo.add(board.id, charlie.id, "viewer");
    console.log(`  ✓ Added 2 board members`);

    // ── Get columns ──
    const columns = ColumnRepo.findByBoard(board.id);
    const [todo, inProgress, done] = columns;

    // ── Tasks ──
    const tasks = [
      TaskRepo.create({ column_id: todo.id, board_id: board.id, title: "Set up CI/CD pipeline", priority: "high", assignee_id: alice.id, position: 0 }),
      TaskRepo.create({ column_id: todo.id, board_id: board.id, title: "Design database schema", priority: "high", assignee_id: bob.id, position: 1 }),
      TaskRepo.create({ column_id: todo.id, board_id: board.id, title: "Write API documentation", priority: "medium", position: 2 }),
      TaskRepo.create({ column_id: inProgress.id, board_id: board.id, title: "Implement authentication", priority: "urgent", assignee_id: alice.id, position: 0, labels: ["backend", "security"] }),
      TaskRepo.create({ column_id: inProgress.id, board_id: board.id, title: "Build task card component", priority: "medium", assignee_id: charlie.id, position: 1, labels: ["frontend"] }),
      TaskRepo.create({ column_id: done.id, board_id: board.id, title: "Project kickoff meeting", priority: "low", assignee_id: alice.id, position: 0 }),
    ];

    console.log(`  ✓ Created ${tasks.length} tasks`);

    // ── Comments ──
    CommentRepo.create({ task_id: tasks[3].id, author_id: bob.id, body: "Should we use JWT or session-based auth?" });
    CommentRepo.create({ task_id: tasks[3].id, author_id: alice.id, body: "Let's go with JWT — simpler for the API." });
    CommentRepo.create({ task_id: tasks[0].id, author_id: charlie.id, body: "I can help with GitHub Actions config!" });

    console.log(`  ✓ Created 3 comments`);
  });

  console.log("✅ Seed complete!");
}

// Run
getDb();
seed();
closeDb();
