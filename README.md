# TechDebtDiscoverAgent MCP Server

This project implements a Model Context Protocol (MCP) server in TypeScript for technical debt discovery. It exposes a tool `list-tech-debt` that scans your project source code for common technical debt patterns (e.g., TODOs, use of 'any', console.log, large files, etc.) and reports possible areas for improvement.

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Install dependencies
```
npm install
```

### Build the project
```
npm run build
```

### Run the server
```
npm start
```

The server will run using stdio transport for MCP clients.

## MCP Integration
- See `.vscode/mcp.json` for VS Code integration.
- See [MCP documentation](https://modelcontextprotocol.io/quickstart/server) for more info.

## Custom Copilot Instructions
See `.github/copilot-instructions.md` for workspace-specific Copilot guidance.
