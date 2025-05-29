import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

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
 * Recursively collects all source files in a directory
 * @param dir Directory to scan
 * @param exts File extensions to include
 * @returns Array of file paths
 */
function getAllSourceFiles(dir: string, exts: string[] = DEFAULT_EXTENSIONS): string[] {
  const results: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !shouldSkipDirectory(entry.name)) {
        results.push(...getAllSourceFiles(fullPath, exts));
      } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return results;
}

/**
 * Determines if a directory should be skipped during scanning
 * @param dirName Directory name to check
 * @returns True if directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next'];
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
 * Analyzes a file for common technical debt patterns
 * @param filePath Path to the file to analyze
 * @returns Array of technical debt findings
 */
function analyzeFileForTechDebt(filePath: string): TechDebtFinding[] {
  const findings: TechDebtFinding[] = [];
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
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
    
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
  }
  
  return findings;
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

// Register the technical debt discovery tool
server.tool(
  "list-tech-debt",
  "List possible technical debt areas in the project source code.",
  {
    directory: z.string().optional().describe("Project directory to scan. Defaults to current working directory."),
    includeTypes: z.array(z.string()).optional().describe("Types of debt to include (comments, typing, debugging, etc.)"),
    severity: z.enum(["low", "medium", "high"]).optional().describe("Minimum severity level to report"),
  },
  async ({ directory, includeTypes, severity }) => {
    const rootDir = directory || process.cwd();
    const minSeverity = severity || "low";
    const severityFilter = { low: 2, medium: 1, high: 0 };
    
    let files: string[];
    try {
      files = getAllSourceFiles(rootDir);
    } catch (error: any) {
      return { 
        content: [{ 
          type: "text", 
          text: `❌ Error reading directory: ${error.message}` 
        }] 
      };
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
    
    for (const file of files) {
      const findings = analyzeFileForTechDebt(file);
      
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
    
    if (reports.length === 0) {
      return { 
        content: [{ 
          type: "text", 
          text: `✅ No technical debt found matching the specified criteria.\n\n📊 Scanned ${files.length} files.` 
        }] 
      };
    }
    
    const summary = `🔍 **Technical Debt Report**\n📊 Found ${totalFindings} issues in ${reports.length} files (scanned ${files.length} total)\n\n`;
    const fullReport = summary + reports.join('\n\n');
    
    return { 
      content: [{ 
        type: "text", 
        text: fullReport 
      }] 
    };
  }
);

/**
 * Main server initialization and startup
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Tech Debt Discover Agent MCP Server running on stdio");
  } catch (error) {
    console.error("❌ Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Start the server with proper error handling
main().catch((error) => {
  console.error("💥 Fatal error in main():", error);
  process.exit(1);
});
