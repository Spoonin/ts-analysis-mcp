import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AmbientProject } from "./project/ambient-project.js";
import { jsonResult, type ToolContext } from "./tools/tool.js";

import { findSymbol, findSymbolSchema } from "./tools/find-symbol.js";
import { getSymbolInfo, getSymbolInfoSchema } from "./tools/get-symbol-info.js";
import { findReferences, findReferencesSchema } from "./tools/find-references.js";
import {
  findByDecorator,
  findByDecoratorSchema,
} from "./tools/find-by-decorator.js";
import { getDiagnostics, getDiagnosticsSchema } from "./tools/get-diagnostics.js";
import { reloadProject, reloadProjectSchema } from "./tools/reload-project.js";

export function createServer(project: AmbientProject): McpServer {
  const server = new McpServer({
    name: "ts-analysis-mcp",
    version: "0.1.0",
  });

  const ctx: ToolContext = { project };

  server.registerTool(
    "find_symbol",
    {
      description: "Locate symbols by name (exact/contains/regex). Returns all matches.",
      inputSchema: findSymbolSchema,
    },
    (args) => jsonResult(findSymbol(args, ctx)),
  );

  server.registerTool(
    "get_symbol_info",
    {
      description: "Full structural projection of a symbol. Accepts Name or Container#member.",
      inputSchema: getSymbolInfoSchema,
    },
    (args) => jsonResult(getSymbolInfo(args, ctx)),
  );

  server.registerTool(
    "find_references",
    {
      description: "Find all in-scope usages of a symbol, each classified by refKind/position.",
      inputSchema: findReferencesSchema,
    },
    (args) => jsonResult(findReferences(args, ctx)),
  );

  server.registerTool(
    "find_by_decorator",
    {
      description: "Find symbols decorated with a given decorator, with raw argument text.",
      inputSchema: findByDecoratorSchema,
    },
    (args) => jsonResult(findByDecorator(args, ctx)),
  );

  server.registerTool(
    "get_diagnostics",
    {
      description: "List TypeScript compiler errors/warnings in the project (fail-open).",
      inputSchema: getDiagnosticsSchema,
    },
    (args) => jsonResult(getDiagnostics(args, ctx)),
  );

  server.registerTool(
    "reload_project",
    {
      description: "Re-read tsconfig and source files, replacing the in-memory project.",
      inputSchema: reloadProjectSchema,
    },
    (args) => jsonResult(reloadProject(args, ctx)),
  );

  return server;
}
