import { z } from "zod";
import type { ToolContext } from "./tool.js";

/**
 * reload_project — CONTEXT.md › Ambient Project (ADR 0001, ADR 0006).
 *
 * Full-rebuild escape hatch. Edits, additions, and deletions are now picked up
 * automatically by AmbientProject.ensureFresh() before each query, so this is
 * rarely needed — reserve it for recovering from drift (e.g. tsconfig changes).
 * Re-reads tsconfig and all source files, replacing the in-memory project.
 */
export const reloadProjectSchema = {};

export function reloadProject(
  _args: Record<string, never>,
  ctx: ToolContext,
): { reloaded: true } {
  ctx.project.reload();
  return { reloaded: true };
}
