import type { ZodRawShape } from "zod";
import type { AmbientProject } from "../project/ambient-project.js";

/** Context handed to every tool handler. */
export interface ToolContext {
  project: AmbientProject;
}

/** A registrable MCP tool definition. */
export interface ToolDef<Shape extends ZodRawShape> {
  name: string;
  description: string;
  schema: Shape;
  handler: (
    args: { [K in keyof Shape]: ReturnTypeOf<Shape[K]> },
    ctx: ToolContext,
  ) => Promise<unknown> | unknown;
}

// Helper: infer the parsed type of a zod schema entry.
type ReturnTypeOf<T> = T extends { _output: infer O } ? O : unknown;

/** Wrap a JSON-serializable result into MCP tool-result content. */
export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}
