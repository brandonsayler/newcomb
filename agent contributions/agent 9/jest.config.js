// Agent 9 of 10 — Test Suite Configuration
// Project: Collaborative Todo App (Schelling Point Convergence)
// 
// This test suite is designed to validate all components built by Agents 1–8:
//   Agent 1: package.json & config
//   Agent 2: Database schema & db.js (SQLite)
//   Agent 3: Authentication module (auth.js)
//   Agent 4: Express server setup (server.js)
//   Agent 5: Task API routes (routes/tasks.js)
//   Agent 6: Frontend shell (public/index.html)
//   Agent 7: Frontend app logic (public/app.js)
//   Agent 8: Frontend styles (public/style.css)
//   Agent 10: Deployment, Docker, README

module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterSetup: ['./tests/setup.js'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'db.js',
    'auth.js',
    'server.js',
    'routes/**/*.js',
  ],
  testTimeout: 10000,
};
