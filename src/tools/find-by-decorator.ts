import { z } from "zod";
import { Node, type SourceFile } from "ts-morph";
import type { DecoratorMatch, ResultPage } from "../types.js";
import type { ToolContext } from "./tool.js";
import { isInScope } from "../project/scope.js";
import { projectSymbol } from "../projection/symbol-projection.js";

/**
 * find_by_decorator — CONTEXT.md › Decorator Match.
 *
 * Find all in-scope symbols decorated with a given decorator (by name).
 * Returns the projected symbol plus the decorator's raw argument text
 * (e.g. "'users'" for @Controller('users')). Matching is by name only.
 */
export const findByDecoratorSchema = {
  decorator: z
    .string()
    .describe("Decorator name without '@', e.g. 'Controller', 'Injectable'."),
  limit: z.number().int().positive().default(50),
  include_source: z.boolean().default(false),
};

export function findByDecorator(
  args: { decorator: string; limit: number; include_source: boolean },
  ctx: ToolContext,
): ResultPage<DecoratorMatch> {
  const all: DecoratorMatch[] = [];

  for (const sf of ctx.project.ts.getSourceFiles()) {
    if (!isInScope(sf.getFilePath())) continue;
    collectDecoratorMatches(sf, args.decorator, args.include_source, all);
  }

  return {
    items: all.slice(0, args.limit),
    total: all.length,
    limit: args.limit,
  };
}

function collectDecoratorMatches(
  sf: SourceFile,
  decoratorName: string,
  includeSource: boolean,
  out: DecoratorMatch[],
): void {
  // Scan classes and their members for the target decorator.
  for (const cls of sf.getClasses()) {
    checkNode(cls, decoratorName, includeSource, out);
    for (const member of cls.getMembers()) {
      if (Node.isDecoratable(member)) {
        checkNode(member, decoratorName, includeSource, out);
      }
    }
  }

  // Scan top-level functions (rare but possible, e.g. custom decorators on functions).
  for (const fn of sf.getFunctions()) {
    checkNode(fn, decoratorName, includeSource, out);
  }
}

function checkNode(
  node: Node,
  decoratorName: string,
  includeSource: boolean,
  out: DecoratorMatch[],
): void {
  if (!Node.isDecoratable(node)) return;
  for (const d of node.getDecorators()) {
    if (d.getName() === decoratorName) {
      out.push({
        symbol: projectSymbol(node, { includeSource }),
        decoratorName: d.getName(),
        argsText: d
          .getArguments()
          .map((a) => a.getText())
          .join(", "),
      });
    }
  }
}
