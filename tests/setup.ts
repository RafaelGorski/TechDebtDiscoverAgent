/**
 * Jest test setup for Technical Debt Discovery MCP Server
 */

import { jest } from '@jest/globals';

// Mock console methods for testing
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
  
  // Set test timeout for async operations
  jest.setTimeout(30000);
});

afterAll(() => {
  global.console = originalConsole;
});

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
beforeAll(() => {
  process.exit = jest.fn() as any;
});

afterAll(() => {
  process.exit = originalExit;
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
