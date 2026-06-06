import { z } from "zod";
import { DiagnosticCategory } from "ts-morph";
import type { DiagnosticInfo, ResultPage } from "../types.js";
import type { ToolContext } from "./tool.js";
import { isInScope } from "../project/scope.js";

/**
 * get_diagnostics — CONTEXT.md › Diagnostic.
 *
 * Expose TypeScript compiler errors/warnings on demand. The server is
 * fail-open: diagnostics never block other tools; this tool surfaces them
 * only when the agent asks.
 */
export const getDiagnosticsSchema = {
  limit: z.number().int().positive().default(50),
};

const CATEGORY_MAP: Record<number, DiagnosticInfo["category"]> = {
  [DiagnosticCategory.Error]: "error",
  [DiagnosticCategory.Warning]: "warning",
  [DiagnosticCategory.Suggestion]: "suggestion",
  [DiagnosticCategory.Message]: "message",
};

export function getDiagnostics(
  args: { limit: number },
  ctx: ToolContext,
): ResultPage<DiagnosticInfo> {
  const all: DiagnosticInfo[] = [];

  for (const diag of ctx.project.ts.getPreEmitDiagnostics()) {
    const sf = diag.getSourceFile();
    const filePath = sf?.getFilePath() ?? null;

    // Filter to in-scope files only; diagnostics without a file (global) are included.
    if (filePath && !isInScope(filePath)) continue;

    const line = diag.getLineNumber() ?? null;

    all.push({
      file: filePath,
      line,
      category: CATEGORY_MAP[diag.getCategory()] ?? "message",
      code: diag.getCode(),
      message: diag.getMessageText().toString(),
    });
  }

  return {
    items: all.slice(0, args.limit),
    total: all.length,
    limit: args.limit,
  };
}
