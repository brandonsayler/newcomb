/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // API / backend tests
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      setupFilesAfterSetup: ['<rootDir>/tests/fixtures/setup.js'],
    },
    // Frontend / component tests
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.{js,jsx}'],
      moduleNameMapper: {
        '\\.(css|less|scss)$': 'identity-obj-proxy',
        '^@/(.*)$': '<rootDir>/client/$1',
      },
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
    },
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    'client/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!server/index.js',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'clover'],
};
