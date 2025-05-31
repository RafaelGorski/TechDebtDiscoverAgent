import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

/**
 * Result type for better error handling
 */
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Error categories for better error handling
 */
enum ErrorCategory {
  FileSystem = 'filesystem',
  Permission = 'permission',
  Validation = 'validation',
  Analysis = 'analysis',
  Configuration = 'configuration'
}

/**
 * Custom error class with categorization
 */
class TechDebtError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public recoverable: boolean = true,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'TechDebtError';
  }
}

/**
 * Technical Debt Discovery MCP Server
 * Scans project source code for common technical debt patterns
 */
const server = new McpServer({
  name: "techdebt-discover-agent",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Configuration constants
const DEFAULT_EXTENSIONS = [".js", ".ts", ".jsx", ".tsx"];
const LARGE_FILE_THRESHOLD = {
  characters: 2000,
  lines: 100,
};

// Technical debt patterns to detect
const DEBT_PATTERNS = {
  comments: /TODO|FIXME|HACK|XXX|BUG/i,
  anyType: /:\s*any\b|as\s+any\b/,
  consoleLog: /console\.(log|debug|info|warn|error)/,
  varDeclaration: /var\s+/,
  deprecatedAPIs: /@deprecated|\.deprecated/i,
  complexConditions: /if\s*\([^)]{50,}\)/,
} as const;

/**
 * Safe wrapper for file system operations
 */
function safeReadFile(filePath: string): Result<string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return { success: true, data: content };
  } catch (error) {
    const category = error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT' 
      ? ErrorCategory.FileSystem 
      : ErrorCategory.Permission;
    
    return { 
      success: false, 
      error: new TechDebtError(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category,
        false,
        { filePath, originalError: error }
      )
    };
  }
}

/**
 * Safe wrapper for directory operations
 */
function safeReadDirectory(dir: string): Result<fs.Dirent[]> {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return { success: true, data: entries };
  } catch (error) {
    const category = error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? ErrorCategory.FileSystem
      : ErrorCategory.Permission;
    
    return {
      success: false,
      error: new TechDebtError(
        `Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category,
        true,
        { directory: dir, originalError: error }
      )
    };
  }
}

/**
 * Recursively collects all source files in a directory with error handling
 * @param dir Directory to scan
 * @param exts File extensions to include
 * @returns Result containing array of file paths or error
 */
function getAllSourceFiles(dir: string, exts: string[] = DEFAULT_EXTENSIONS): Result<{ files: string[], errors: TechDebtError[] }> {
  const results: string[] = [];
  const errors: TechDebtError[] = [];
  
  function collectFiles(currentDir: string): void {
    const dirResult = safeReadDirectory(currentDir);
    
    if (!dirResult.success) {
      // Log recoverable errors but continue scanning
      if (dirResult.error.recoverable) {
        console.error(`⚠️ Skipping directory ${currentDir}: ${dirResult.error.message}`);
        errors.push(dirResult.error);
        return;
      } else {
        throw dirResult.error;
      }
    }
    
    for (const entry of dirResult.data) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !shouldSkipDirectory(entry.name)) {
        try {
          collectFiles(fullPath);
        } catch (error) {
          if (error instanceof TechDebtError && error.recoverable) {
            console.error(`⚠️ Error in subdirectory ${fullPath}: ${error.message}`);
            errors.push(error);
          } else {
            throw error;
          }
        }
      } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  
  try {
    collectFiles(dir);
    
    // Return success even if there were recoverable errors
    return { success: true, data: { files: results, errors } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof TechDebtError 
        ? error 
        : new TechDebtError(
            `Fatal error during file collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ErrorCategory.FileSystem,
            false,
            { directory: dir, originalError: error }
          )
    };
  }
}

/**
 * Determines if a directory should be skipped during scanning
 * @param dirName Directory name to check
 * @returns True if directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules', 
    '.git', 
    'dist', 
    'build', 
    'coverage', 
    '.nyc_output',
    '__coverage__',
    '.coverage',
    'c8-coverage',
    '.next',
    '.nuxt',
    '.vscode',
    '.idea'
  ];
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

/**
 * Technical debt finding interface
 */
interface TechDebtFinding {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  lineNumber?: number;
}

/**
 * Analyzes a file for common technical debt patterns with error handling
 * @param filePath Path to the file to analyze
 * @returns Result containing array of technical debt findings or error
 */
function analyzeFileForTechDebt(filePath: string): Result<TechDebtFinding[]> {
  const findings: TechDebtFinding[] = [];
  
  const fileResult = safeReadFile(filePath);
  if (!fileResult.success) {
    return {
      success: false,
      error: new TechDebtError(
        `Cannot analyze file: ${fileResult.error.message}`,
        ErrorCategory.Analysis,
        true,
        { filePath, originalError: fileResult.error }
      )
    };
  }
  
  try {
    const content = fileResult.data;
    const lines = content.split('\n');
    
    // Check for comment-based debt
    if (DEBT_PATTERNS.comments.test(content)) {
      findings.push({
        type: 'comments',
        description: 'Contains TODO/FIXME/HACK/XXX comments',
        severity: 'medium'
      });
    }
    
    // Check for TypeScript 'any' usage
    if (DEBT_PATTERNS.anyType.test(content)) {
      findings.push({
        type: 'typing',
        description: "Uses 'any' type (TypeScript anti-pattern)",
        severity: 'high'
      });
    }
    
    // Check for console statements
    if (DEBT_PATTERNS.consoleLog.test(content)) {
      findings.push({
        type: 'debugging',
        description: 'Contains console.log statements',
        severity: 'low'
      });
    }
    
    // Check for var declarations
    if (DEBT_PATTERNS.varDeclaration.test(content)) {
      findings.push({
        type: 'modernization',
        description: "Uses 'var' instead of 'let' or 'const'",
        severity: 'medium'
      });
    }
    
    // Check for deprecated APIs
    if (DEBT_PATTERNS.deprecatedAPIs.test(content)) {
      findings.push({
        type: 'deprecation',
        description: 'Uses deprecated APIs or marked as deprecated',
        severity: 'high'
      });
    }
    
    // Check for complex conditions
    if (DEBT_PATTERNS.complexConditions.test(content)) {
      findings.push({
        type: 'complexity',
        description: 'Contains complex conditional statements',
        severity: 'medium'
      });
    }
    
    // Check file size
    if (content.length > LARGE_FILE_THRESHOLD.characters && 
        lines.length > LARGE_FILE_THRESHOLD.lines) {
      findings.push({
        type: 'size',
        description: `Large file (${lines.length} lines): consider splitting into smaller modules`,
        severity: 'medium'
      });
    }
    
    return { success: true, data: findings };
  } catch (error) {
    return {
      success: false,
      error: new TechDebtError(
        `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.Analysis,
        true,
        { filePath, originalError: error }
      )
    };
  }
}

/**
 * Formats technical debt findings into a readable report
 * @param findings Array of technical debt findings
 * @param filePath Path to the file being reported
 * @returns Formatted report string
 */
function formatFindings(findings: TechDebtFinding[], filePath: string): string {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedFindings = findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  const header = `📁 **${path.relative(process.cwd(), filePath)}**`;
  const findingsText = sortedFindings.map(finding => {
    const icon = finding.severity === 'high' ? '🔴' : finding.severity === 'medium' ? '🟡' : '🔵';
    return `  ${icon} [${finding.type}] ${finding.description}`;
  }).join('\n');
  
  return `${header}\n${findingsText}`;
}

/**
 * Validates tool parameters
 */
function validateToolParameters(directory?: string, includeTypes?: string[], severity?: string): Result<{
  rootDir: string;
  minSeverity: string;
  includeTypes?: string[];
}> {
  try {
    // Validate directory
    const rootDir = directory || process.cwd();
    if (!fs.existsSync(rootDir)) {
      return {
        success: false,
        error: new TechDebtError(
          `Directory does not exist: ${rootDir}`,
          ErrorCategory.Validation,
          false,
          { directory: rootDir }
        )
      };
    }

    if (!fs.statSync(rootDir).isDirectory()) {
      return {
        success: false,
        error: new TechDebtError(
          `Path is not a directory: ${rootDir}`,
          ErrorCategory.Validation,
          false,
          { directory: rootDir }
        )
      };
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high'];
    const minSeverity = severity || 'low';
    if (!validSeverities.includes(minSeverity)) {
      return {
        success: false,
        error: new TechDebtError(
          `Invalid severity level: ${minSeverity}. Must be one of: ${validSeverities.join(', ')}`,
          ErrorCategory.Validation,
          false,
          { severity: minSeverity, validSeverities }
        )
      };
    }

    // Validate include types
    if (includeTypes && includeTypes.length > 0) {
      const validTypes = ['comments', 'typing', 'debugging', 'modernization', 'deprecation', 'complexity', 'size'];
      const invalidTypes = includeTypes.filter(type => !validTypes.includes(type));
      if (invalidTypes.length > 0) {
        return {
          success: false,
          error: new TechDebtError(
            `Invalid include types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`,
            ErrorCategory.Validation,
            false,
            { invalidTypes, validTypes }
          )
        };
      }
    }

    return {
      success: true,
      data: { rootDir, minSeverity, includeTypes }
    };
  } catch (error) {
    return {
      success: false,
      error: new TechDebtError(
        `Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.Validation,
        false,
        { originalError: error }
      )
    };
  }
}

// Register the technical debt discovery tool with enhanced error handling
server.tool(
  "list-tech-debt",
  "List possible technical debt areas in the project source code.",
  {
    directory: z.string().optional().describe("Project directory to scan. Defaults to current working directory."),
    includeTypes: z.array(z.string()).optional().describe("Types of debt to include (comments, typing, debugging, etc.)"),
    severity: z.enum(["low", "medium", "high"]).optional().describe("Minimum severity level to report"),
  },
  async ({ directory, includeTypes, severity }) => {
    try {
      // Validate parameters
      const validationResult = validateToolParameters(directory, includeTypes, severity);
      if (!validationResult.success) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `❌ Validation Error: ${validationResult.error.message}`
          }]
        };
      }

      const { rootDir, minSeverity } = validationResult.data;
      const severityFilter = { low: 2, medium: 1, high: 0 };
      
      // Get source files
      const filesResult = getAllSourceFiles(rootDir);
      if (!filesResult.success) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `❌ File System Error: ${filesResult.error.message}`
          }]
        };
      }

      const { files, errors } = filesResult.data;
      if (errors.length > 0) {
        console.error(`⚠️ Recoverable errors encountered during file collection: ${errors.length}`);
      }
      if (files.length === 0) {
        return {
          content: [{
            type: "text",
            text: "📂 No source files found in the specified directory."
          }]
        };
      }

      const reports: string[] = [];
      let totalFindings = 0;
      const analysisErrors: TechDebtError[] = [];

      // Analyze each file with error recovery
      for (const file of files) {
        const analysisResult = analyzeFileForTechDebt(file);
        
        if (!analysisResult.success) {
          // Log recoverable analysis errors but continue
          if (analysisResult.error.recoverable) {
            console.error(`⚠️ Skipping file ${file}: ${analysisResult.error.message}`);
            analysisErrors.push(analysisResult.error);
            continue;
          } else {
            // Fatal analysis error
            return {
              isError: true,
              content: [{
                type: "text",
                text: `❌ Fatal Analysis Error: ${analysisResult.error.message}`
              }]
            };
          }
        }

        const findings = analysisResult.data;
        
        // Filter by severity and type if specified
        const filteredFindings = findings.filter(finding => {
          const severityMatch = severityFilter[finding.severity] >= severityFilter[minSeverity];
          const typeMatch = !includeTypes || includeTypes.includes(finding.type);
          return severityMatch && typeMatch;
        });

        if (filteredFindings.length > 0) {
          reports.push(formatFindings(filteredFindings, file));
          totalFindings += filteredFindings.length;
        }
      }

      // Prepare report with error summary if needed
      let errorSummary = '';
      if (analysisErrors.length > 0) {
        errorSummary = `\n⚠️ **Warnings**: ${analysisErrors.length} files could not be analyzed due to errors.\n`;
      }

      if (reports.length === 0) {
        return {
          content: [{
            type: "text",
            text: `✅ No technical debt found matching the specified criteria.\n\n📊 Scanned ${files.length} files.${errorSummary}`
          }]
        };
      }

      const summary = `🔍 **Technical Debt Report**\n📊 Found ${totalFindings} issues in ${reports.length} files (scanned ${files.length} total)${errorSummary}\n\n`;
      const fullReport = summary + reports.join('\n\n');

      return {
        content: [{
          type: "text",
          text: fullReport
        }]
      };

    } catch (error) {
      // Unexpected error - should not happen with proper Result handling
      console.error('💥 Unexpected error in tool execution:', error);
      return {
        isError: true,
        content: [{
          type: "text",
          text: `❌ Unexpected Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }]
      };
    }
  }
);

/**
 * Main server initialization and startup with enhanced error handling
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Tech Debt Discover Agent MCP Server running on stdio");
  } catch (error) {
    const techDebtError = new TechDebtError(
      `Failed to start MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ErrorCategory.Configuration,
      false,
      { originalError: error }
    );
    
    console.error(`❌ ${techDebtError.message}`);
    console.error(`📁 Category: ${techDebtError.category}`);
    console.error(`🔄 Recoverable: ${techDebtError.recoverable}`);
    
    if (techDebtError.context) {
      console.error(`📋 Context:`, techDebtError.context);
    }
    
    process.exit(1);
  }
}

// Start the server with proper error handling
main().catch((error) => {
  console.error("💥 Fatal error in main():", error);
  console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace available');
  process.exit(1);
});
