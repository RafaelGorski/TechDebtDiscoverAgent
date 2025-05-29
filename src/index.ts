import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const server = new McpServer({
  name: "techdebt-discover-agent",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Helper: Recursively collect all .js/.ts files in a directory
function getAllSourceFiles(dir: string, exts: string[] = [".js", ".ts"]): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSourceFiles(filePath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(filePath);
    }
  });
  return results;
}

// Simple heuristics for technical debt
function analyzeFileForTechDebt(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf8");
  const findings: string[] = [];
  if (/TODO|FIXME|HACK|XXX/.test(content)) {
    findings.push("Contains TODO/FIXME/HACK/XXX comments");
  }
  if (/any\b/.test(content)) {
    findings.push("Uses 'any' type (TypeScript anti-pattern)");
  }
  if (/console\.log/.test(content)) {
    findings.push("Contains console.log statements");
  }
  if (/var\s+/.test(content)) {
    findings.push("Uses 'var' instead of 'let' or 'const'");
  }
  if (content.length > 2000 && content.split("\n").length > 100) {
    findings.push("Large file: consider splitting into smaller modules");
  }
  return findings;
}

server.tool(
  "list-tech-debt",
  "List possible technical debt areas in the project source code.",
  {
    directory: z.string().optional().describe("Project directory to scan. Defaults to current working directory."),
  },
  async ({ directory }) => {
    const rootDir = directory || process.cwd();
    let files;
    try {
      files = getAllSourceFiles(rootDir);
    } catch (e: any) {
      return { content: [{ type: "text", text: `Error reading directory: ${e.message}` }] };
    }
    const report = [];
    for (const file of files) {
      const findings = analyzeFileForTechDebt(file);
      if (findings.length > 0) {
        report.push(`File: ${file}\n- ${findings.join("\n- ")}`);
      }
    }
    if (report.length === 0) {
      return { content: [{ type: "text", text: "No obvious technical debt found in source files." }] };
    }
    return { content: [{ type: "text", text: report.join("\n\n") }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Tech Debt Discover Agent MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
