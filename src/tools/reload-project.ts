import { z } from "zod";
import type { ToolContext } from "./tool.js";

/**
 * reload_project — CONTEXT.md › Ambient Project (ADR 0001).
 *
 * The only invalidation mechanism in MVP. Re-reads tsconfig and all source
 * files, replacing the in-memory Ambient Project.
 */
export const reloadProjectSchema = {};

export function reloadProject(
  _args: Record<string, never>,
  ctx: ToolContext,
): { reloaded: true } {
  ctx.project.reload();
  return { reloaded: true };
}
