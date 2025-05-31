/**
 * Test utility functions and helpers
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Create a temporary file with specified content
 */
export async function createTempFile(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Count lines in a file
 */
export async function countLines(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.split('\n').length;
}

/**
 * Mock MCP message for testing
 */
export function createMockMCPMessage(method: string, params: any = {}) {
  return {
    jsonrpc: '2.0',
    id: Math.random().toString(36),
    method,
    params
  };
}

/**
 * Validate MCP response format
 */
export function validateMCPResponse(response: any): boolean {
  return (
    typeof response === 'object' &&
    response.jsonrpc === '2.0' &&
    (response.hasOwnProperty('result') || response.hasOwnProperty('error')) &&
    response.hasOwnProperty('id')
  );
}

/**
 * Create mock technical debt result
 */
export function createMockDebtResult() {
  return {
    summary: {
      totalFiles: 3,
      totalIssues: 15,
      categories: {
        todoComments: 7,
        debugStatements: 3,
        typeIssues: 4,
        largeFiles: 1
      }
    },
    details: {
      todoComments: [],
      debugStatements: [],
      typeIssues: [],
      largeFiles: []
    }
  };
}
