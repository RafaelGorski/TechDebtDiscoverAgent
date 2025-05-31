# 🔍 Technical Debt Discovery MCP Server

An advanced Model Context Protocol (MCP) server for automated technical debt analysis. This TypeScript-based server intelligently scans your codebase to identify common debt patterns and provides actionable insights for code improvement.

## ✨ Features

- **🎯 Smart Pattern Detection**: Identifies TODO/FIXME comments, TypeScript `any` usage, console statements, deprecated APIs, and more
- **📊 Severity Classification**: Categorizes findings as low, medium, or high severity
- **🎨 Rich Reporting**: Provides formatted reports with emojis, severity indicators, and file statistics
- **⚙️ Configurable Filtering**: Filter by debt type, severity level, or specific patterns
- **🚀 Performance Optimized**: Efficiently skips irrelevant directories (node_modules, .git, etc.)
- **📁 Multi-Language Support**: Supports .js, .ts, .jsx, .tsx files

## 📋 Features Overview

For a comprehensive list of all features, implementation status, and technical details, see **[FUNCTIONALITY.md](./FUNCTIONALITY.md)**.

### Quick Feature Summary
- 🔍 **Pattern Detection**: TODO comments, TypeScript `any` usage, console statements, deprecated APIs
- 📁 **Smart Scanning**: Recursive directory traversal with intelligent filtering
- 🎯 **Severity Levels**: High/Medium/Low categorization with visual indicators
- ⚙️ **Configurable**: Filter by type, severity, and target directory
- 🔌 **MCP Integration**: Ready for LLM integration via Model Context Protocol

## 🔧 Technical Debt Patterns Detected

| Pattern | Severity | Description |
|---------|----------|-------------|
| TODO/FIXME Comments | Medium | Unfinished work markers |
| TypeScript `any` Usage | High | Type safety violations |
| Console Statements | Low | Debug code left in production |
| `var` Declarations | Medium | Outdated variable declarations |
| Deprecated APIs | High | Usage of deprecated functions |
| Complex Conditions | Medium | Overly complex if statements |
| Large Files | Medium | Files exceeding size thresholds |

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- TypeScript (for development)

### Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Start the MCP server**
   ```bash
   npm start
   ```

The server runs using stdio transport for seamless MCP client integration.

## 📖 Usage

### Basic Scan
Scan the current directory for all technical debt:
```json
{
  "tool": "list-tech-debt"
}
```

### Advanced Filtering
Scan with specific criteria:
```json
{
  "tool": "list-tech-debt",
  "arguments": {
    "directory": "/path/to/project",
    "severity": "medium",
    "includeTypes": ["typing", "complexity", "deprecation"]
  }
}
```

### Sample Output
```
🔍 Technical Debt Report
📊 Found 5 issues in 3 files (scanned 12 total)

📁 **src/components/UserForm.tsx**
  🔴 [typing] Uses 'any' type (TypeScript anti-pattern)
  🟡 [complexity] Contains complex conditional statements

📁 **src/utils/helpers.js**
  🟡 [modernization] Uses 'var' instead of 'let' or 'const'
  🔵 [debugging] Contains console.log statements
```

## 🔧 Configuration

The server supports the following parameters:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `directory` | string | Directory to scan | Current working directory |
| `includeTypes` | string[] | Debt types to include | All types |
| `severity` | enum | Minimum severity level | "low" |

### Supported Debt Types
- `comments` - TODO/FIXME/HACK comments
- `typing` - TypeScript any usage
- `debugging` - Console statements
- `modernization` - Outdated syntax
- `deprecation` - Deprecated APIs
- `complexity` - Complex conditions
- `size` - Large files

## 🔗 MCP Integration

### VS Code Integration
This server integrates seamlessly with VS Code through MCP:
- Configuration available in `.vscode/mcp.json`
- Use with GitHub Copilot for enhanced code analysis
- Real-time technical debt detection during development

### Client Integration
For other MCP clients, connect using stdio transport:
```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Server automatically handles MCP protocol communication
```

## 🛠️ Development

### Project Structure
```
src/
├── index.ts          # Main MCP server implementation
├── index.js          # Compiled JavaScript (generated)
build/                # Build output directory
test.js               # Test utilities
```

### Key Components
- **Pattern Detection Engine**: Configurable regex patterns for debt identification
- **File Scanner**: Recursive directory traversal with intelligent filtering
- **Report Generator**: Rich formatting with severity-based sorting
- **MCP Tool Handler**: Protocol-compliant tool registration and execution

### Extending Debt Patterns
Add new patterns to the `DEBT_PATTERNS` constant:
```typescript
const DEBT_PATTERNS = {
  // Existing patterns...
  newPattern: /your-regex-here/g,
} as const;
```

## 📚 Resources

- **[Model Context Protocol Documentation](https://modelcontextprotocol.io/quickstart/server)** - Complete MCP guide
- **[MCP SDK Reference](https://github.com/modelcontextprotocol/create-python-server)** - SDK examples and patterns
- **[Technical Debt Best Practices](https://modelcontextprotocol.io/llms-full.txt)** - Industry guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Custom Copilot Instructions**: See `.github/copilot-instructions.md` for workspace-specific AI guidance.
