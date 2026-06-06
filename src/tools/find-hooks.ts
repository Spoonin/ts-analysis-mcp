import { z } from "zod";
import { Node, SyntaxKind } from "ts-morph";
import type { HookCall } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";

/**
 * find_hooks — find all React hook calls inside a component or custom hook.
 *
 * Scans the function body for call expressions matching the `use*` naming
 * convention. Works with any hook-based library (React, Redux, Zustand,
 * React Query, custom hooks) — no library-specific logic needed.
 */
export const findHooksSchema = {
  component: z
    .string()
    .describe("Component or custom hook name to analyze (e.g. 'UserList', 'useAuth')."),
  file: z
    .string()
    .optional()
    .describe("Disambiguate by file (path segment match)."),
};

export function findHooks(
  args: { component: string; file?: string },
  ctx: ToolContext,
): { component: string; file: string; hooks: HookCall[] } {
  const declarations = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => d.getName() === args.component,
  );

  if (declarations.length === 0) {
    throw new Error(`Symbol not found: ${args.component}`);
  }

  const decl = declarations[0]!;
  const body = getBody(decl);

  if (!body) {
    return {
      component: args.component,
      file: decl.getSourceFile().getFilePath(),
      hooks: [],
    };
  }

  const hooks = collectHookCalls(body);

  return {
    component: args.component,
    file: decl.getSourceFile().getFilePath(),
    hooks,
  };
}

/**
 * Collect all `use*()` call expressions at the top level of the function body.
 *
 * React's Rules of Hooks dictate hooks are called at the top level of a component,
 * not inside loops/conditions/callbacks. We scan all call expressions in the body
 * but only match those whose callee starts with "use" (convention).
 */
function collectHookCalls(body: Node): HookCall[] {
  const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression);
  const hooks: HookCall[] = [];

  for (const call of calls) {
    const hookName = getHookName(call);
    if (!hookName) continue;

    const args = call
      .getArguments()
      .map((a) => a.getText())
      .join(", ");

    hooks.push({
      hook: hookName,
      args,
      line: call.getStartLineNumber(),
    });
  }

  return hooks;
}

/**
 * Extract hook name from a call expression. Returns the name if it matches
 * the `use*` convention, otherwise null.
 *
 * Handles:
 * - `useState(...)` → "useState"
 * - `React.useState(...)` → "useState"
 * - `useCustomHook(...)` → "useCustomHook"
 */
function getHookName(call: Node): string | null {
  if (!Node.isCallExpression(call)) return null;

  const expr = call.getExpression();

  // Direct call: useState(...)
  if (Node.isIdentifier(expr)) {
    const name = expr.getText();
    if (isHookName(name)) return name;
  }

  // Property access: React.useState(...)
  if (Node.isPropertyAccessExpression(expr)) {
    const name = expr.getName();
    if (isHookName(name)) return name;
  }

  return null;
}

function isHookName(name: string): boolean {
  return name.length > 3 && name.startsWith("use") && name[3]! === name[3]!.toUpperCase();
}

/** Get the function body of a component or hook declaration. */
function getBody(decl: Node): Node | undefined {
  if (Node.isFunctionDeclaration(decl)) {
    return decl.getBody();
  }
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      return init.getBody();
    }
    return undefined;
  }
  if (Node.isClassDeclaration(decl)) {
    // Class components don't use hooks (usually), but check render()
    const render = decl.getMethod("render");
    return render?.getBody();
  }
  return undefined;
}
