import { z } from "zod";
import { Node, SyntaxKind } from "ts-morph";
import type { HookCall } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations, type NamedDeclaration } from "../project/symbols.js";

/**
 * find_hooks — find all React hook calls inside a component or custom hook.
 *
 * Scans the function body for call expressions matching the `use*` naming
 * convention. Works with any hook-based library (React, Redux, Zustand,
 * React Query, custom hooks) — no library-specific logic needed.
 *
 * With depth > 1, recursively resolves custom hooks that exist in the
 * project to show their internal hook calls (hook chain).
 */
export const findHooksSchema = {
  component: z
    .string()
    .describe("Component or custom hook name to analyze (e.g. 'UserList', 'useAuth')."),
  file: z
    .string()
    .optional()
    .describe("Disambiguate by file (path segment match)."),
  depth: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe("Depth for hook chain resolution. 1 = direct hooks only, >1 = recurse into custom hooks."),
};

export function findHooks(
  args: { component: string; file?: string; depth: number },
  ctx: ToolContext,
): { component: string; file: string; hooks: HookCall[] } {
  const allDecls = collectNamedDeclarations(ctx.project);
  const declarations = (args.file
    ? collectNamedDeclarations(ctx.project, { file: args.file })
    : allDecls
  ).filter((d) => d.getName() === args.component);

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

  const visiting = new Set<string>();
  const hooks = collectHookCalls(body, allDecls, args.depth, visiting);

  return {
    component: args.component,
    file: decl.getSourceFile().getFilePath(),
    hooks,
  };
}

/**
 * Collect all `use*()` call expressions in the function body.
 * When remainingDepth > 1, custom hooks found in the project are
 * recursively resolved to show their internal hook calls.
 */
function collectHookCalls(
  body: Node,
  allDecls: NamedDeclaration[],
  remainingDepth: number,
  visiting: Set<string>,
): HookCall[] {
  const calls = body.getDescendantsOfKind(SyntaxKind.CallExpression);
  const hooks: HookCall[] = [];

  for (const call of calls) {
    const hookName = getHookName(call);
    if (!hookName) continue;

    const args = call
      .getArguments()
      .map((a) => a.getText())
      .join(", ");

    const hookCall: HookCall = {
      hook: hookName,
      args,
      line: call.getStartLineNumber(),
    };

    // Recurse into custom hooks that exist in the project.
    if (remainingDepth > 1) {
      const chain = resolveChain(hookName, allDecls, remainingDepth - 1, visiting);
      if (chain && chain.length > 0) {
        hookCall.chain = chain;
      }
    }

    hooks.push(hookCall);
  }

  return hooks;
}

/**
 * Try to resolve a custom hook's internal hook calls.
 * Returns null if the hook is not found in the project (external/built-in).
 */
function resolveChain(
  hookName: string,
  allDecls: NamedDeclaration[],
  remainingDepth: number,
  visiting: Set<string>,
): HookCall[] | null {
  if (visiting.has(hookName)) return null; // cycle

  const hookDecl = allDecls.find((d) => d.getName() === hookName);
  if (!hookDecl) return null; // external hook, can't resolve

  const hookBody = getBody(hookDecl);
  if (!hookBody) return null;

  visiting.add(hookName);
  const chain = collectHookCalls(hookBody, allDecls, remainingDepth, visiting);
  visiting.delete(hookName);

  return chain;
}

/**
 * Extract hook name from a call expression. Returns the name if it matches
 * the `use*` convention, otherwise null.
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
    const render = decl.getMethod("render");
    return render?.getBody();
  }
  return undefined;
}
