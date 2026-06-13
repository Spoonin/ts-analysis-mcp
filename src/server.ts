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
import { findJsxUsage, findJsxUsageSchema } from "./tools/find-jsx-usage.js";
import { getExports, getExportsSchema } from "./tools/get-exports.js";
import {
  getComponentTree,
  getComponentTreeSchema,
} from "./tools/get-component-tree.js";
import { findHooks, findHooksSchema } from "./tools/find-hooks.js";

export function createServer(project: AmbientProject): McpServer {
  const server = new McpServer({
    name: "ts-analysis-mcp",
    version: "0.4.0",
  });

  const ctx: ToolContext = { project };

  // Freshness chokepoint: every query tool refreshes changed files first, so
  // edits/adds/deletes are reflected without a manual reload_project (ADR 0006).
  const fresh =
    <A>(fn: (a: A, c: ToolContext) => unknown) =>
    (a: A) => {
      project.ensureFresh();
      return jsonResult(fn(a, ctx));
    };

  server.registerTool(
    "find_symbol",
    {
      description: "Locate symbols by name (exact/contains/regex). Returns all matches.",
      inputSchema: findSymbolSchema,
    },
    fresh(findSymbol),
  );

  server.registerTool(
    "get_symbol_info",
    {
      description: "Full structural projection of a symbol. Accepts Name or Container#member.",
      inputSchema: getSymbolInfoSchema,
    },
    fresh(getSymbolInfo),
  );

  server.registerTool(
    "find_references",
    {
      description: "Find all in-scope usages of a symbol, each classified by refKind/position.",
      inputSchema: findReferencesSchema,
    },
    fresh(findReferences),
  );

  server.registerTool(
    "find_by_decorator",
    {
      description: "Find symbols decorated with a given decorator, with raw argument text.",
      inputSchema: findByDecoratorSchema,
    },
    fresh(findByDecorator),
  );

  server.registerTool(
    "get_diagnostics",
    {
      description: "List TypeScript compiler errors/warnings in the project (fail-open).",
      inputSchema: getDiagnosticsSchema,
    },
    fresh(getDiagnostics),
  );

  server.registerTool(
    "reload_project",
    {
      description:
        "Force a full rebuild of the in-memory project (rarely needed: edits, adds, and deletes are picked up automatically; use this only to recover from drift).",
      inputSchema: reloadProjectSchema,
    },
    (args) => jsonResult(reloadProject(args, ctx)),
  );

  server.registerTool(
    "find_jsx_usage",
    {
      description: "Find all JSX render sites of a component, with props and parent component.",
      inputSchema: findJsxUsageSchema,
    },
    fresh(findJsxUsage),
  );

  server.registerTool(
    "get_exports",
    {
      description: "List all exports of a module, resolving re-exports to their original source.",
      inputSchema: getExportsSchema,
    },
    fresh(getExports),
  );

  server.registerTool(
    "get_component_tree",
    {
      description:
        "Build a component render tree from a root component, recursively resolving JSX children.",
      inputSchema: getComponentTreeSchema,
    },
    fresh(getComponentTree),
  );

  server.registerTool(
    "find_hooks",
    {
      description:
        "Find all React hook calls (useState, useSelector, useEffect, custom hooks, …) inside a component or hook.",
      inputSchema: findHooksSchema,
    },
    fresh(findHooks),
  );

  return server;
}
