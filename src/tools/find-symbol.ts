import { z } from "zod";
import type { ResultPage, SymbolProjection } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";
import { projectSymbol } from "../projection/symbol-projection.js";
import { nameMatcher } from "../projection/name-match.js";

/**
 * find_symbol — CONTEXT.md › Symbol Resolution, Name Match Mode.
 *
 * Locate symbols by name. Ambiguous names resolve to multiple symbols; all
 * matches are returned as a Result Page. `match` controls exact/contains/regex.
 */
export const findSymbolSchema = {
  name: z.string().describe("Symbol name (or pattern, when match != exact)."),
  match: z
    .enum(["exact", "contains", "regex"])
    .default("exact")
    .describe("Name Match Mode. Strict by default."),
  file: z
    .string()
    .optional()
    .describe("Narrow resolution to a single source file (relative to project)."),
  limit: z.number().int().positive().default(50),
  include_source: z.boolean().default(false),
};

export function findSymbol(
  args: {
    name: string;
    match: "exact" | "contains" | "regex";
    file?: string;
    limit: number;
    include_source: boolean;
  },
  ctx: ToolContext,
): ResultPage<SymbolProjection> {
  const matches = nameMatcher(args.name, args.match);
  const decls = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => matches(d.getName()!),
  );
  // Project only the kept page — projection resolves types via the checker and
  // is expensive, so truncate declarations before projecting (true total kept).
  const items = decls
    .slice(0, args.limit)
    .map((d) => projectSymbol(d, { includeSource: args.include_source }));
  return { items, total: decls.length, limit: args.limit };
}
