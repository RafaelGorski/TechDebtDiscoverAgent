/**
 * Generated TypeScript types from TypeSpec specification
 * Run 'npm run typespec:compile' to regenerate
 */

export enum Severity {
  Low = "low",
  Medium = "medium",
  High = "high"
}

export enum DebtType {
  Comments = "comments",
  Typing = "typing", 
  Debugging = "debugging",
  Modernization = "modernization",
  Deprecation = "deprecation",
  Complexity = "complexity",
  Size = "size"
}

export enum ErrorCategory {
  FileSystem = "filesystem",
  Permission = "permission",
  Validation = "validation",
  Analysis = "analysis", 
  Configuration = "configuration"
}

export interface TechDebtFinding {
  type: DebtType;
  description: string;
  severity: Severity;
  lineNumber?: number;
  columnNumber?: number;
  codeSnippet?: string;
}

export interface FileAnalysis {
  filePath: string;
  findings: TechDebtFinding[];
  fileSize: number;
  lineCount: number;
  analyzedAt: Date;
}

export interface AnalysisSummary {
  totalFiles: number;
  filesWithFindings: number;
  totalFindings: number;
  findingsBySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  findingsByType: Record<string, number>;
  errorCount: number;
}

export interface TechDebtReport {
  summary: AnalysisSummary;
  fileAnalyses: FileAnalysis[];
  errors: TechDebtError[];
  configuration: AnalysisConfiguration;
  generatedAt: Date;
}

export interface TechDebtError {
  message: string;
  category: ErrorCategory;
  recoverable: boolean;
  context?: Record<string, unknown>;
  filePath?: string;
}

export interface AnalysisConfiguration {
  directory: string;
  extensions: string[];
  includeTypes?: DebtType[];
  minSeverity: Severity;
  skipDirectories: string[];
  thresholds: {
    maxFileSize: number;
    maxLineCount: number;
    complexConditionLength: number;
  };
}

export interface ListTechDebtParameters {
  directory?: string;
  includeTypes?: DebtType[];
  severity?: Severity;
  limit?: number;
  includeLineNumbers?: boolean;
  includeCodeSnippets?: boolean;
}

export interface ListTechDebtResponse {
  success: boolean;
  report?: TechDebtReport;
  error?: TechDebtError;
  formattedReport: string;
}

export interface Result<T, E = TechDebtError> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface FileSystemResult {
  files: string[];
  errors: TechDebtError[];
}
