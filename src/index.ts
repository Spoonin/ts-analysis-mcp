#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AmbientProject } from "./project/ambient-project.js";
import { resolveTsconfigPath } from "./project/workspace-root.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // CONTEXT.md › Workspace Root — resolve tsconfig before anything else.
  const tsconfigPath = resolveTsconfigPath(process.argv.slice(2), process.cwd());

  // stderr only — stdout is the MCP stdio transport channel.
  console.error(`[ts-analysis-mcp] loading project: ${tsconfigPath}`);
  const project = new AmbientProject(tsconfigPath);

  const server = createServer(project);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[ts-analysis-mcp] ready on stdio");
}

main().catch((err) => {
  console.error("[ts-analysis-mcp] fatal:", err);
  process.exit(1);
});
