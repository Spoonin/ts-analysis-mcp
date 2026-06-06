import { z } from "zod";
import type { SourceFile } from "ts-morph";
import type { ExportInfo } from "../types.js";
import type { ToolContext } from "./tool.js";
import { isInScope } from "../project/scope.js";

/**
 * get_exports — list all exports of a module, resolving re-exports to their
 * original source file.
 *
 * Uses ts-morph's `getExportedDeclarations()` which follows `export { X } from`
 * and `export * from` re-exports automatically.
 */
export const getExportsSchema = {
  file: z
    .string()
    .describe("File path (absolute or path-segment match) to inspect exports of."),
};

export function getExports(
  args: { file: string },
  ctx: ToolContext,
): { file: string; exports: ExportInfo[] } {
  const sf = findSourceFile(args.file, ctx);
  if (!sf) {
    throw new Error(`Source file not found: ${args.file}`);
  }

  const exportedDecls = sf.getExportedDeclarations();
  const exports: ExportInfo[] = [];

  for (const [name, declarations] of exportedDecls) {
    for (const decl of declarations) {
      const declFile = decl.getSourceFile();
      if (!isInScope(declFile.getFilePath())) continue;

      exports.push({
        name,
        kind: decl.getKindName(),
        sourceFile: declFile.getFilePath(),
        line: decl.getStartLineNumber(),
        isReExport: declFile !== sf,
      });
    }
  }

  // Sort by name for stable output.
  exports.sort((a, b) => a.name.localeCompare(b.name));

  return {
    file: sf.getFilePath(),
    exports,
  };
}

/**
 * Find a source file by path hint. Matches the same segment-boundary logic
 * used elsewhere: the hint must match the full path or a trailing segment
 * boundary (e.g. "components/index.ts" matches, bare "index.ts" matches
 * at a "/" boundary, but "dex.ts" does not).
 */
function findSourceFile(hint: string, ctx: ToolContext): SourceFile | undefined {
  const normalized = hint.replace(/\\/g, "/");
  for (const sf of ctx.project.ts.getSourceFiles()) {
    if (!isInScope(sf.getFilePath())) continue;
    const path = sf.getFilePath();
    if (path === normalized || path.endsWith(`/${normalized}`)) {
      return sf;
    }
  }
  return undefined;
}
