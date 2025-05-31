/**
 * Test fixtures for creating sample project structures with technical debt
 */

import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export interface TestProject {
  path: string;
  cleanup: () => Promise<void>;
}

export async function createSampleProject(): Promise<TestProject> {
  const projectPath = await fs.mkdtemp(path.join(tmpdir(), 'tech-debt-test-'));
  
  // Create directory structure
  await fs.mkdir(path.join(projectPath, 'src'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'tests'), { recursive: true });
  
  // Sample TypeScript file with technical debt
  const tsContent = `
// TODO: Refactor this function to use proper types
function processData(data: any): any {
  console.log("Processing data:", data);
  // FIXME: This is a temporary hack for production
  return data?.someProperty || null;
}

// HACK: Quick fix to avoid type errors
interface ApiResponse {
  data: any;
  callback: Function;
  status: Object;
}

// XXX: This needs proper error handling
const handleError = (error: any) => {
  console.error("Error occurred:", error);
  throw error;
};

export { processData, handleError };
`;
  
  await fs.writeFile(path.join(projectPath, 'src', 'main.ts'), tsContent);
  
  // Sample JavaScript file with legacy code
  const jsContent = `
// TODO: Convert this file to TypeScript
function legacyFunction(data) {
  console.debug("Legacy processing:", data);
  // WARN: This method is deprecated
  return data.map(item => {
    // FIXME: Remove this temporary workaround
    if (item.type === 'old') {
      return transformOldFormat(item);
    }
    return item;
  });
}

// Bad practice: global variable
window.globalConfig = { debug: true };

module.exports = { legacyFunction };
`;
  
  await fs.writeFile(path.join(projectPath, 'src', 'legacy.js'), jsContent);
  
  // Large file simulation (exceeds typical line thresholds)
  const largeFileLines = [
    '// This file simulates a large codebase file',
    'export class LargeClass {'
  ];
  
  for (let i = 0; i < 1000; i++) {
    largeFileLines.push(`  method${i}() { return ${i}; }`);
  }
  
  largeFileLines.push('}');
  
  await fs.writeFile(
    path.join(projectPath, 'src', 'largeFile.ts'), 
    largeFileLines.join('\n')
  );
  
  // Configuration files
  const packageJson = {
    name: "test-project",
    version: "1.0.0",
    dependencies: {
      "express": "^4.18.0",
      "lodash": "*"
    },
    devDependencies: {
      "typescript": "^5.0.0"
    }
  };
  
  await fs.writeFile(
    path.join(projectPath, 'package.json'), 
    JSON.stringify(packageJson, null, 2)
  );
  
  return {
    path: projectPath,
    cleanup: async () => {
      await fs.rm(projectPath, { recursive: true, force: true });
    }
  };
}

export const expectedDebtPatterns = {
  todoComments: [
    { type: 'TODO', file: 'src/main.ts', message: 'Refactor this function to use proper types' },
    { type: 'FIXME', file: 'src/main.ts', message: 'This is a temporary hack for production' },
    { type: 'HACK', file: 'src/main.ts', message: 'Quick fix to avoid type errors' },
    { type: 'XXX', file: 'src/main.ts', message: 'This needs proper error handling' },
    { type: 'TODO', file: 'src/legacy.js', message: 'Convert this file to TypeScript' },
    { type: 'WARN', file: 'src/legacy.js', message: 'This method is deprecated' },
    { type: 'FIXME', file: 'src/legacy.js', message: 'Remove this temporary workaround' }
  ],
  debugStatements: [
    { file: 'src/main.ts', pattern: 'console.log' },
    { file: 'src/main.ts', pattern: 'console.error' },
    { file: 'src/legacy.js', pattern: 'console.debug' }
  ],
  typeIssues: [
    { file: 'src/main.ts', pattern: 'any', context: 'parameter' },
    { file: 'src/main.ts', pattern: 'any', context: 'return type' },
    { file: 'src/main.ts', pattern: 'Function', context: 'interface property' },
    { file: 'src/main.ts', pattern: 'Object', context: 'interface property' }
  ]
};
