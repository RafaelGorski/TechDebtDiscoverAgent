# Functionality Tracking

This document tracks all features and capabilities of the Technical Debt Discovery MCP Server.

## 🎯 Project Scope & MCP Tools Concept

**This project implements MCP (Model Context Protocol) Tools only** - specifically designed to enable LLM clients (such as GitHub Copilot, Claude Desktop, or other AI assistants) to perform technical debt discovery actions through this server.

### MCP Tools Architecture
- **Server Role**: Exposes tools that LLMs can call to analyze codebases
- **Client Integration**: Works with MCP-compatible clients (Copilot, Claude Desktop, etc.)
- **Tool-based Interaction**: LLMs invoke the `list-tech-debt` tool with parameters
- **Structured Responses**: Returns formatted technical debt reports for LLM consumption
- **No Direct UI**: This is a backend service - interaction happens through LLM clients

### Supported MCP Concepts
- ✅ **Tools**: `list-tech-debt` tool for codebase analysis
- ❌ **Resources**: Not implemented (would be static content access)
- ❌ **Prompts**: Not implemented (would be prompt templates)
- ❌ **Sampling**: Not applicable (would be LLM text generation)

The server acts as a specialized technical debt analysis service that LLMs can leverage to provide intelligent code quality insights to developers.

### 📚 Learn More About MCP Tools
- [MCP Tools Documentation](https://modelcontextprotocol.io/docs/concepts/tools) - Official documentation explaining MCP Tools concept
- [Model Context Protocol](https://modelcontextprotocol.io/) - Main MCP specification and overview

### 🔧 Development & Testing Tools
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - **Recommended for debugging and testing** this MCP server
  - Interactive web interface for testing MCP tools
  - Real-time debugging of server responses
  - Parameter validation and error testing
  - Essential for development workflow
- **TypeSpec Compiler**: `npm run typespec:compile` - Generate types and schemas
- **TypeSpec Watch Mode**: `npm run typespec:watch` - Auto-regenerate on changes
- **API Documentation**: Auto-generated from TypeSpec specifications

## 🚀 Completed Features

### Core Scanning Engine
- **Status**: ✅ Implemented
- **Description**: Recursive file system scanning with configurable extensions
- **Implementation**: `getAllSourceFiles()` function
- **Features**:
  - Supports multiple file extensions (`.js`, `.ts`, `.jsx`, `.tsx`)
  - Recursive directory traversal
  - Smart directory filtering (skips `node_modules`, `.git`, etc.)
  - Error handling for inaccessible directories

### Technical Debt Pattern Detection
- **Status**: ✅ Implemented
- **Description**: Regex-based pattern matching for common technical debt indicators
- **Implementation**: `DEBT_PATTERNS` constant and `analyzeFileForTechDebt()` function
- **Patterns Detected**:
  - 🟡 **Comment-based debt**: TODO, FIXME, HACK, XXX, BUG comments
  - 🔴 **TypeScript any usage**: Detects `: any` and `as any` patterns
  - 🔵 **Debug statements**: console.log, console.debug, etc.
  - 🟡 **Legacy declarations**: `var` instead of `let`/`const`
  - 🔴 **Deprecated APIs**: `@deprecated` annotations
  - 🟡 **Complex conditions**: Long if-statement conditions (>50 chars)
  - 🟡 **Large files**: Files exceeding size thresholds

### MCP Tool Interface
- **Status**: ✅ Implemented
- **Description**: Model Context Protocol tool for LLM integration
- **Implementation**: `server.tool("list-tech-debt", ...)` registration
- **Parameters**:
  - `directory` (optional): Target scan directory
  - `includeTypes` (optional): Filter by debt types
  - `severity` (optional): Minimum severity filter

### Reporting System
- **Status**: ✅ Implemented
- **Description**: Formatted output with severity-based sorting and emoji indicators
- **Implementation**: `formatFindings()` function
- **Features**:
  - Severity-based sorting (high → medium → low)
  - Color-coded emoji indicators (🔴🟡🔵)
  - Relative path display
  - Summary statistics

### Error Handling
- **Status**: ✅ Enhanced Implementation
- **Description**: Comprehensive error handling with Result/Either pattern and error categorization
- **Implementation**: `Result<T, E>` type, `TechDebtError` class, and safe wrapper functions
- **Features**:
  - **Result/Either pattern**: Type-safe error propagation without exceptions
  - **Error categorization**: Filesystem, Permission, Validation, Analysis, Configuration
  - **Recoverable vs Fatal errors**: Graceful degradation for non-critical failures
  - **Structured error context**: Additional error information for debugging
  - **Safe wrapper functions**: `safeReadFile()`, `safeReadDirectory()` for filesystem operations
  - **Parameter validation**: Comprehensive input validation with detailed error messages
  - **Error recovery strategies**: Continue scanning when individual files fail
  - **Detailed error reporting**: Category, recoverability, and context information

#### Error Categories
- **FileSystem**: Missing files, invalid paths
- **Permission**: Access denied, read-only restrictions  
- **Validation**: Invalid parameters, malformed input
- **Analysis**: Code parsing errors, pattern matching failures
- **Configuration**: Server startup, transport issues

#### Error Response Format
```typescript
// Success response
{
  content: [{ type: "text", text: "..." }]
}

// Error response  
{
  isError: true,
  content: [{ type: "text", text: "❌ Error: detailed message" }]
}
```

## 🔄 Configuration & Thresholds

### File Size Thresholds
```typescript
const LARGE_FILE_THRESHOLD = {
  characters: 2000,
  lines: 100,
};
```

### Default File Extensions
```typescript
const DEFAULT_EXTENSIONS = [".js", ".ts", ".jsx", ".tsx"];
```

### Severity Levels
- 🔴 **High**: TypeScript `any` usage, deprecated APIs
- 🟡 **Medium**: TODO comments, `var` usage, complex conditions, large files
- 🔵 **Low**: Console statements

## 📊 Technical Specifications

### Dependencies
- `@modelcontextprotocol/sdk`: MCP server framework
- `zod`: Schema validation
- `fs`: File system operations
- `path`: Path manipulation
- **`@typespec/compiler`**: TypeSpec compiler for API specification
- **`@typespec/json-schema`**: JSON Schema generation from TypeSpec
- **`@typespec/openapi3`**: OpenAPI 3.0 generation from TypeSpec

### Type Safety & API Design
- **TypeSpec Integration**: API types and interfaces defined in TypeSpec
- **Generated TypeScript Types**: Automatic type generation from TypeSpec specifications
- **JSON Schema**: API validation schemas generated from TypeSpec
- **OpenAPI 3.0**: Complete API documentation generated automatically
- **Type-safe MCP Integration**: All MCP tool parameters and responses use generated types

### API Specification
- **TypeSpec Definition**: `specs/tech-debt-api.tsp` - Complete API specification
- **Generated Types**: `src/types/generated.ts` - TypeScript interfaces and enums
- **Schema Validation**: JSON Schema files for parameter validation
- **Documentation**: Auto-generated OpenAPI documentation

## 🎯 Future Enhancement Opportunities

### Potential Improvements
1. **Line-number reporting**: Add specific line numbers for each finding
2. **Cyclomatic complexity**: Measure and report function complexity
3. **Dependency analysis**: Detect outdated or vulnerable dependencies
4. **Code duplication**: Identify duplicate code blocks
5. **Performance metrics**: File-level performance indicators
6. **Custom patterns**: User-configurable debt patterns
7. **Historical tracking**: Track debt changes over time
8. **Integration hooks**: Git hooks for automated scanning
9. **Export formats**: JSON, CSV, or XML output options
10. **Async processing**: Parallel file processing for large codebases

### Architecture Considerations
- **Plugin system**: Modular pattern detection system
- **Configuration files**: `.techdebt.config.js` support
- **Language support**: Additional programming languages
- **IDE integration**: VS Code extension compatibility
- **CI/CD integration**: GitHub Actions, Jenkins plugins

## 🔧 Development Notes

### Code Organization
- Single-file architecture for simplicity
- Clear separation of concerns:
  - File scanning logic
  - Pattern detection
  - Report formatting
  - MCP tool registration
  - Server management

### Testing Strategy
- Unit tests for pattern detection
- Integration tests for file scanning
- End-to-end tests for MCP tool functionality

### Documentation Standards
- JSDoc comments for all public functions
- Type annotations for better IDE support
- Clear parameter and return value descriptions