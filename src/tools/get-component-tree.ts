import { z } from "zod";
import { Node, SyntaxKind } from "ts-morph";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";
import { isInScope } from "../project/scope.js";

export interface ComponentTreeNode {
  name: string;
  file: string;
  line: number;
  children: ComponentTreeNode[];
}

export const getComponentTreeSchema = {
  component: z.string().describe("Root component name to build the tree from."),
  file: z.string().optional().describe("Disambiguate root component by file (path segment match)."),
  depth: z.number().int().positive().default(5).describe("Max tree depth."),
};

export function getComponentTree(
  args: { component: string; file?: string; depth: number },
  ctx: ToolContext,
): { tree: ComponentTreeNode | null } {
  const declarations = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => d.getName() === args.component,
  );

  if (declarations.length === 0) {
    return { tree: null };
  }

  const decl = declarations[0]!;
  const visiting = new Set<string>();
  const tree = buildNode(decl, ctx, args.depth, visiting);

  return { tree };
}

function buildNode(
  decl: Node & { getName(): string | undefined },
  ctx: ToolContext,
  remainingDepth: number,
  visiting: Set<string>,
): ComponentTreeNode {
  const sf = decl.getSourceFile();
  const name = (Node.hasName(decl) ? decl.getName() : undefined) ?? "<anonymous>";
  const nodeKey = `${sf.getFilePath()}:${name}`;

  const node: ComponentTreeNode = {
    name,
    file: sf.getFilePath(),
    line: decl.getStartLineNumber(),
    children: [],
  };

  if (remainingDepth <= 0 || visiting.has(nodeKey)) {
    return node;
  }

  visiting.add(nodeKey);

  // Find the function/class body to scan for JSX.
  const body = getComponentBody(decl);
  if (body) {
    const childNames = collectRenderedComponents(body);
    const allDecls = collectNamedDeclarations(ctx.project);

    for (const childName of childNames) {
      const childDecl = allDecls.find((d) => d.getName() === childName);
      if (childDecl && isInScope(childDecl.getSourceFile().getFilePath())) {
        node.children.push(buildNode(childDecl, ctx, remainingDepth - 1, visiting));
      }
    }
  }

  visiting.delete(nodeKey);

  return node;
}

/**
 * Get the body node of a component declaration — the subtree we scan for JSX.
 *
 * Handles: function declarations, arrow functions in variable declarations,
 * function expressions, and class declarations (for class components).
 */
function getComponentBody(decl: Node): Node | undefined {
  // function MyComponent() { ... }
  if (Node.isFunctionDeclaration(decl)) {
    return decl.getBody();
  }

  // const MyComponent = () => { ... }  or  const MyComponent = function() { ... }
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      return init.getBody();
    }
    return init;
  }

  // class MyComponent { render() { ... } }
  if (Node.isClassDeclaration(decl)) {
    const render = decl.getMethod("render");
    if (render) return render.getBody();
    return decl;
  }

  return undefined;
}

/**
 * Scan a node's descendants for JSX element tag names that refer to
 * user-defined components (capitalized, not intrinsic HTML elements).
 * Returns deduplicated component names in order of first appearance.
 */
function collectRenderedComponents(body: Node): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const jsxElements = [
    ...body.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];

  for (const jsx of jsxElements) {
    const tagName = jsx.getTagNameNode().getText();
    // User-defined components start with uppercase; skip intrinsic elements (div, span, etc.)
    if (tagName[0] && tagName[0] === tagName[0].toUpperCase() && /^[A-Z]/.test(tagName)) {
      if (!seen.has(tagName)) {
        seen.add(tagName);
        result.push(tagName);
      }
    }
  }

  return result;
}
