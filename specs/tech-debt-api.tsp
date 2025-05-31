import "@typespec/json-schema";
import "@typespec/openapi3";

using TypeSpec.JsonSchema;
using TypeSpec.OpenAPI;

@service({
  title: "Technical Debt Discovery MCP Server",
  version: "1.0.0",
  description: "MCP Server for discovering technical debt patterns in source code"
})
namespace TechDebtDiscovery;

/**
 * Severity levels for technical debt findings
 */
enum Severity {
  low: "low",
  medium: "medium", 
  high: "high"
}

/**
 * Types of technical debt that can be detected
 */
enum DebtType {
  comments: "comments",
  typing: "typing",
  debugging: "debugging",
  modernization: "modernization",
  deprecation: "deprecation",
  complexity: "complexity",
  size: "size"
}

/**
 * Error categories for better error handling
 */
enum ErrorCategory {
  filesystem: "filesystem",
  permission: "permission",
  validation: "validation", 
  analysis: "analysis",
  configuration: "configuration"
}

/**
 * Technical debt finding with location and severity information
 */
model TechDebtFinding {
  /** Type of technical debt detected */
  type: DebtType;
  
  /** Human-readable description of the issue */
  description: string;
  
  /** Severity level of the finding */
  severity: Severity;
  
  /** Line number where the issue was found (optional) */
  lineNumber?: int32;
  
  /** Column number where the issue was found (optional) */
  columnNumber?: int32;
  
  /** Code snippet showing the problematic code (optional) */
  codeSnippet?: string;
}

/**
 * File analysis result containing findings for a single file
 */
model FileAnalysis {
  /** Relative path to the analyzed file */
  filePath: string;
  
  /** Array of technical debt findings in this file */
  findings: TechDebtFinding[];
  
  /** File size in bytes */
  fileSize: int32;
  
  /** Number of lines in the file */
  lineCount: int32;
  
  /** Timestamp when the file was analyzed */
  analyzedAt: utcDateTime;
}

/**
 * Summary statistics for the technical debt analysis
 */
model AnalysisSummary {
  /** Total number of files scanned */
  totalFiles: int32;
  
  /** Number of files with findings */
  filesWithFindings: int32;
  
  /** Total number of findings across all files */
  totalFindings: int32;
  
  /** Breakdown of findings by severity */
  findingsBySeverity: {
    high: int32;
    medium: int32;
    low: int32;
  };
  
  /** Breakdown of findings by type */
  findingsByType: Record<int32>;
  
  /** Number of files that could not be analyzed due to errors */
  errorCount: int32;
}

/**
 * Complete technical debt analysis report
 */
model TechDebtReport {
  /** Summary statistics for the analysis */
  summary: AnalysisSummary;
  
  /** Detailed analysis results for each file */
  fileAnalyses: FileAnalysis[];
  
  /** Any errors encountered during analysis */
  errors: TechDebtError[];
  
  /** Configuration used for the analysis */
  configuration: AnalysisConfiguration;
  
  /** Timestamp when the analysis was performed */
  generatedAt: utcDateTime;
}

/**
 * Error information with categorization
 */
model TechDebtError {
  /** Error message */
  message: string;
  
  /** Category of the error */
  category: ErrorCategory;
  
  /** Whether the error is recoverable */
  recoverable: boolean;
  
  /** Additional context about the error */
  context?: Record<unknown>;
  
  /** File path where the error occurred (if applicable) */
  filePath?: string;
}

/**
 * Configuration options for technical debt analysis
 */
model AnalysisConfiguration {
  /** Directory to scan for source files */
  directory: string;
  
  /** File extensions to include in the scan */
  extensions: string[];
  
  /** Types of technical debt to look for */
  includeTypes?: DebtType[];
  
  /** Minimum severity level to report */
  minSeverity: Severity;
  
  /** Directories to skip during scanning */
  skipDirectories: string[];
  
  /** File size thresholds */
  thresholds: {
    maxFileSize: int32;
    maxLineCount: int32;
    complexConditionLength: int32;
  };
}

/**
 * MCP Tool parameters for the list-tech-debt tool
 */
model ListTechDebtParameters {
  /** Project directory to scan. Defaults to current working directory. */
  directory?: string;
  
  /** Types of debt to include (comments, typing, debugging, etc.) */
  includeTypes?: DebtType[];
  
  /** Minimum severity level to report */
  severity?: Severity;
  
  /** Maximum number of findings to return */
  limit?: int32;
  
  /** Whether to include line numbers in findings */
  includeLineNumbers?: boolean = false;
  
  /** Whether to include code snippets in findings */
  includeCodeSnippets?: boolean = false;
}

/**
 * MCP Tool response for the list-tech-debt tool
 */
model ListTechDebtResponse {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Technical debt report (present if successful) */
  report?: TechDebtReport;
  
  /** Error information (present if failed) */
  error?: TechDebtError;
  
  /** Formatted text report for display */
  formattedReport: string;
}

/**
 * Result wrapper for better error handling
 */
model Result<T, E = TechDebtError> {
  /** Whether the operation was successful */
  success: boolean;
  
  /** Data returned by the operation (if successful) */
  data?: T;
  
  /** Error information (if failed) */
  error?: E;
}

/**
 * File system operation result
 */
model FileSystemResult {
  /** List of source files found */
  files: string[];
  
  /** Any errors encountered during file system operations */
  errors: TechDebtError[];
}
