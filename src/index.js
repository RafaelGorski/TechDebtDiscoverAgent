"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
var fs_1 = require("fs");
var path_1 = require("path");
var server = new mcp_js_1.McpServer({
    name: "techdebt-discover-agent",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Helper: Recursively collect all .js/.ts files in a directory
function getAllSourceFiles(dir, exts) {
    if (exts === void 0) { exts = [".js", ".ts"]; }
    var results = [];
    var list = fs_1.default.readdirSync(dir);
    list.forEach(function (file) {
        var filePath = path_1.default.join(dir, file);
        var stat = fs_1.default.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllSourceFiles(filePath, exts));
        }
        else if (exts.includes(path_1.default.extname(file))) {
            results.push(filePath);
        }
    });
    return results;
}
// Simple heuristics for technical debt
function analyzeFileForTechDebt(filePath) {
    var content = fs_1.default.readFileSync(filePath, "utf8");
    var findings = [];
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
server.tool("list-tech-debt", "List possible technical debt areas in the project source code.", {
    directory: zod_1.z.string().optional().describe("Project directory to scan. Defaults to current working directory."),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var rootDir, files, report, _i, files_1, file, findings;
    var directory = _b.directory;
    return __generator(this, function (_c) {
        rootDir = directory || process.cwd();
        try {
            files = getAllSourceFiles(rootDir);
        }
        catch (e) {
            return [2 /*return*/, { content: [{ type: "text", text: "Error reading directory: ".concat(e.message) }] }];
        }
        report = [];
        for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
            file = files_1[_i];
            findings = analyzeFileForTechDebt(file);
            if (findings.length > 0) {
                report.push("File: ".concat(file, "\n- ").concat(findings.join("\n- ")));
            }
        }
        if (report.length === 0) {
            return [2 /*return*/, { content: [{ type: "text", text: "No obvious technical debt found in source files." }] }];
        }
        return [2 /*return*/, { content: [{ type: "text", text: report.join("\n\n") }] }];
    });
}); });
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("Tech Debt Discover Agent MCP Server running on stdio");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
