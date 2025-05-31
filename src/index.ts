import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// Import TypeSpec-generated types
import {
  TechDebtFinding,
  TechDebtError,
  ErrorCategory,
  Severity,
  DebtType,
  FileAnalysis,
  AnalysisSummary,
  TechDebtReport,
  AnalysisConfiguration,
  ListTechDebtParameters,
  ListTechDebtResponse,
  Result,
  FileSystemResult
} from "./types/generated.js";

/**
 * Custom error class with categorization (extends TypeSpec-generated interface)
 */
class TechDebtErrorImpl extends Error implements TechDebtError {
  constructor(
    message: string,
    public category: ErrorCategory,
    public recoverable: boolean = true,
    public context?: Record<string, unknown>,
    public filePath?: string
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

// Configuration constants based on TypeSpec
const DEFAULT_CONFIGURATION: AnalysisConfiguration = {
  directory: process.cwd(),
  extensions: [".js", ".ts", ".jsx", ".tsx"],
  minSeverity: Severity.Low,
  skipDirectories: [
    'node_modules', '.git', 'dist', 'build', 'coverage', 
    '.nyc_output', '__coverage__', '.coverage', 'c8-coverage',
    '.next', '.nuxt', '.vscode', '.idea'
  ],
  thresholds: {
    maxFileSize: 2000,
    maxLineCount: 100,
    complexConditionLength: 50
  }
};

// Technical debt patterns to detect
const DEBT_PATTERNS = {
  [DebtType.Comments]: /TODO|FIXME|HACK|XXX|BUG/i,
  [DebtType.Typing]: /:\s*any\b|as\s+any\b/,
  [DebtType.Debugging]: /console\.(log|debug|info|warn|error)/,
  [DebtType.Modernization]: /var\s+/,
  [DebtType.Deprecation]: /@deprecated|\.deprecated/i,
  [DebtType.Complexity]: /if\s*\([^)]{50,}\)/,
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
      error: new TechDebtErrorImpl(
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category,
        false,
        { originalError: error },
        filePath
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
      error: new TechDebtErrorImpl(
        `Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category,
        true,
        { originalError: error },
        dir
      )
    };
  }
}

/**
 * Determines if a directory should be skipped during scanning
 */
function shouldSkipDirectory(dirName: string, skipDirs: string[]): boolean {
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}

/**
 * Recursively collects all source files in a directory with error handling
 */
function getAllSourceFiles(config: AnalysisConfiguration): Result<FileSystemResult> {
  const results: string[] = [];
  const errors: TechDebtError[] = [];
  
  function collectFiles(currentDir: string): void {
    const dirResult = safeReadDirectory(currentDir);
    
    if (!dirResult.success) {
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
      
      if (entry.isDirectory() && !shouldSkipDirectory(entry.name, config.skipDirectories)) {
        try {
          collectFiles(fullPath);
        } catch (error) {
          if (error instanceof TechDebtErrorImpl && error.recoverable) {
            console.error(`⚠️ Error in subdirectory ${fullPath}: ${error.message}`);
            errors.push(error);
          } else {
            throw error;
          }
        }
      } else if (entry.isFile() && config.extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  
  try {
    collectFiles(config.directory);
    return { success: true, data: { files: results, errors } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof TechDebtErrorImpl 
        ? error 
        : new TechDebtErrorImpl(
            `Fatal error during file collection: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ErrorCategory.FileSystem,
            false,
            { originalError: error },
            config.directory
          )
    };
  }
}

/**
 * Analyzes a file for common technical debt patterns with error handling
 */
function analyzeFileForTechDebt(filePath: string, config: AnalysisConfiguration): Result<FileAnalysis> {
  const findings: TechDebtFinding[] = [];
  
  const fileResult = safeReadFile(filePath);
  if (!fileResult.success) {
    return {
      success: false,
      error: new TechDebtErrorImpl(
        `Cannot analyze file: ${fileResult.error.message}`,
        ErrorCategory.Analysis,
        true,
        { originalError: fileResult.error },
        filePath
      )
    };
  }
  
  try {
    const content = fileResult.data;
    const lines = content.split('\n');
    const stats = fs.statSync(filePath);
    
    // Check patterns based on include types
    const typesToCheck = config.includeTypes || Object.values(DebtType);
    
    for (const debtType of typesToCheck) {
      const pattern = DEBT_PATTERNS[debtType];
      if (pattern && pattern.test(content)) {
        let severity: Severity;
        let description: string;
        
        switch (debtType) {
          case DebtType.Comments:
            severity = Severity.Medium;
            description = 'Contains TODO/FIXME/HACK/XXX comments';
            break;
          case DebtType.Typing:
            severity = Severity.High;
            description = "Uses 'any' type (TypeScript anti-pattern)";
            break;
          case DebtType.Debugging:
            severity = Severity.Low;
            description = 'Contains console.log statements';
            break;
          case DebtType.Modernization:
            severity = Severity.Medium;
            description = "Uses 'var' instead of 'let' or 'const'";
            break;
          case DebtType.Deprecation:
            severity = Severity.High;
            description = 'Uses deprecated APIs or marked as deprecated';
            break;
          case DebtType.Complexity:
            severity = Severity.Medium;
            description = 'Contains complex conditional statements';
            break;
          default:
            continue;
        }
        
        findings.push({
          type: debtType,
          description,
          severity
        });
      }
    }
    
    // Check file size
    if (typesToCheck.includes(DebtType.Size) && 
        (stats.size > config.thresholds.maxFileSize || lines.length > config.thresholds.maxLineCount)) {
      findings.push({
        type: DebtType.Size,
        description: `Large file (${lines.length} lines): consider splitting into smaller modules`,
        severity: Severity.Medium
      });
    }
    
    return { 
      success: true, 
      data: {
        filePath: path.relative(config.directory, filePath),
        findings,
        fileSize: stats.size,
        lineCount: lines.length,
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: new TechDebtErrorImpl(
        `Error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.Analysis,
        true,
        { originalError: error },
        filePath
      )
    };
  }
}

/**
 * Validates tool parameters using TypeSpec types
 */
function validateToolParameters(params: Partial<ListTechDebtParameters>): Result<AnalysisConfiguration> {
  try {
    const config: AnalysisConfiguration = {
      ...DEFAULT_CONFIGURATION,
      directory: params.directory || DEFAULT_CONFIGURATION.directory,
      minSeverity: params.severity || DEFAULT_CONFIGURATION.minSeverity,
      includeTypes: params.includeTypes
    };

    // Validate directory
    if (!fs.existsSync(config.directory)) {
      return {
        success: false,
        error: new TechDebtErrorImpl(
          `Directory does not exist: ${config.directory}`,
          ErrorCategory.Validation,
          false,
          { directory: config.directory }
        )
      };
    }

    if (!fs.statSync(config.directory).isDirectory()) {
      return {
        success: false,
        error: new TechDebtErrorImpl(
          `Path is not a directory: ${config.directory}`,
          ErrorCategory.Validation,
          false,
          { directory: config.directory }
        )
      };
    }

    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error: new TechDebtErrorImpl(
        `Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCategory.Validation,
        false,
        { originalError: error }
      )
    };
  }
}

// Register the technical debt discovery tool with TypeSpec types
server.tool(
  "list-tech-debt",
  "List possible technical debt areas in the project source code.",
  {
    directory: z.string().optional().describe("Project directory to scan. Defaults to current working directory."),
    includeTypes: z.array(z.enum(["comments", "typing", "debugging", "modernization", "deprecation", "complexity", "size"])).optional().describe("Types of debt to include"),
    severity: z.enum(["low", "medium", "high"]).optional().describe("Minimum severity level to report"),
  },
  async (params): Promise<ListTechDebtResponse> => {
    try {
      // Validate parameters using TypeSpec types
      const validationResult = validateToolParameters(params);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          formattedReport: `❌ Validation Error: ${validationResult.error.message}`
        };
      }

      const config = validationResult.data;
      
      // Get source files
      const filesResult = getAllSourceFiles(config);
      if (!filesResult.success) {
        return {
          success: false,
          error: filesResult.error,
          formattedReport: `❌ File System Error: ${filesResult.error.message}`
        };
      }

      const { files, errors: fsErrors } = filesResult.data;
      const analysisErrors: TechDebtError[] = [...fsErrors];
      const fileAnalyses: FileAnalysis[] = [];

      // Analyze each file
      for (const file of files) {
        const analysisResult = analyzeFileForTechDebt(file, config);
        
        if (!analysisResult.success) {
          if (analysisResult.error.recoverable) {
            analysisErrors.push(analysisResult.error);
            continue;
          } else {
            return {
              success: false,
              error: analysisResult.error,
              formattedReport: `❌ Fatal Analysis Error: ${analysisResult.error.message}`
            };
          }
        }

        const fileAnalysis = analysisResult.data;
        
        // Filter findings by severity
        const severityOrder = { [Severity.Low]: 2, [Severity.Medium]: 1, [Severity.High]: 0 };
        const minSeverityOrder = severityOrder[config.minSeverity];
        
        fileAnalysis.findings = fileAnalysis.findings.filter(
          finding => severityOrder[finding.severity] <= minSeverityOrder
        );

        if (fileAnalysis.findings.length > 0) {
          fileAnalyses.push(fileAnalysis);
        }
      }

      // Generate summary
      const summary: AnalysisSummary = {
        totalFiles: files.length,
        filesWithFindings: fileAnalyses.length,
        totalFindings: fileAnalyses.reduce((sum, fa) => sum + fa.findings.length, 0),
        findingsBySeverity: {
          high: fileAnalyses.reduce((sum, fa) => sum + fa.findings.filter(f => f.severity === Severity.High).length, 0),
          medium: fileAnalyses.reduce((sum, fa) => sum + fa.findings.filter(f => f.severity === Severity.Medium).length, 0),
          low: fileAnalyses.reduce((sum, fa) => sum + fa.findings.filter(f => f.severity === Severity.Low).length, 0)
        },
        findingsByType: Object.values(DebtType).reduce((acc, type) => {
          acc[type] = fileAnalyses.reduce((sum, fa) => sum + fa.findings.filter(f => f.type === type).length, 0);
          return acc;
        }, {} as Record<string, number>),
        errorCount: analysisErrors.length
      };

      const report: TechDebtReport = {
        summary,
        fileAnalyses,
        errors: analysisErrors,
        configuration: config,
        generatedAt: new Date()
      };

      // Format report for display
      const formattedReport = formatTechDebtReport(report);

      return {
        success: true,
        report,
        formattedReport
      };

    } catch (error) {
      const techDebtError = new TechDebtErrorImpl(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        ErrorCategory.Configuration,
        false,
        { originalError: error }
      );

      return {
        success: false,
        error: techDebtError,
        formattedReport: `❌ ${techDebtError.message}`
      };
    }
  }
);

/**
 * Formats technical debt report using TypeSpec types
 */
function formatTechDebtReport(report: TechDebtReport): string {
  const { summary, fileAnalyses } = report;
  
  if (summary.totalFindings === 0) {
    return `✅ No technical debt found matching the specified criteria.\n\n📊 Scanned ${summary.totalFiles} files.`;
  }

  const summaryText = `🔍 **Technical Debt Report**\n📊 Found ${summary.totalFindings} issues in ${summary.filesWithFindings} files (scanned ${summary.totalFiles} total)\n\n`;
  
  const fileReports = fileAnalyses.map(fileAnalysis => {
    const sortedFindings = fileAnalysis.findings.sort((a, b) => {
      const severityOrder = { [Severity.High]: 0, [Severity.Medium]: 1, [Severity.Low]: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    const header = `📁 **${fileAnalysis.filePath}**`;
    const findingsText = sortedFindings.map(finding => {
      const icon = finding.severity === Severity.High ? '🔴' : finding.severity === Severity.Medium ? '🟡' : '🔵';
      return `  ${icon} [${finding.type}] ${finding.description}`;
    }).join('\n');
    
    return `${header}\n${findingsText}`;
  }).join('\n\n');

  return summaryText + fileReports;
}

/**
 * Main server initialization and startup with enhanced error handling
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 Tech Debt Discover Agent MCP Server running on stdio");
  } catch (error) {
    const techDebtError = new TechDebtErrorImpl(
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
