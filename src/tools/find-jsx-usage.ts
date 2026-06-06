import { z } from "zod";
import { Node } from "ts-morph";
import type { JsxUsage, ResultPage } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";
import { isInScope } from "../project/scope.js";

/**
 * find_jsx_usage — find all JSX render sites of a component.
 *
 * Uses LanguageService.findReferences() to locate every reference to the
 * component symbol, then filters to those inside JsxOpeningElement or
 * JsxSelfClosingElement tag-name positions. Handles aliased imports
 * naturally because findReferences follows the symbol, not the name text.
 */
export const findJsxUsageSchema = {
  component: z.string().describe("Component name to find JSX usages of."),
  file: z.string().optional().describe("Limit search to file (path segment match)."),
  limit: z.number().int().positive().default(50),
};

export function findJsxUsage(
  args: { component: string; file?: string; limit: number },
  ctx: ToolContext,
): ResultPage<JsxUsage> {
  // Find target declarations matching the component name.
  const declarations = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => d.getName() === args.component,
  );

  if (declarations.length === 0) {
    return { items: [], total: 0, limit: args.limit };
  }

  const seen = new Set<string>();
  const all: JsxUsage[] = [];

  for (const decl of declarations) {
    const nameNode = getNameNodeOrSelf(decl);
    const referencedSymbols = ctx.project.ts
      .getLanguageService()
      .findReferences(nameNode);

    for (const refSymbol of referencedSymbols) {
      for (const refEntry of refSymbol.getReferences()) {
        const sf = refEntry.getSourceFile();
        if (!isInScope(sf.getFilePath())) continue;

        const refNode = refEntry.getNode();
        const jsxElement = getEnclosingJsxElement(refNode);
        if (!jsxElement) continue;

        const line = refNode.getStartLineNumber();
        const col =
          refNode.getStart() -
          sf.getFullText().lastIndexOf("\n", refNode.getStart()) -
          1;
        const key = `${sf.getFilePath()}:${line}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);

        all.push({
          component: refNode.getText(),
          file: sf.getFilePath(),
          line,
          column: col,
          parentComponent: findParentComponent(refNode),
          props: extractProps(jsxElement),
          selfClosing: Node.isJsxSelfClosingElement(jsxElement),
        });
      }
    }
  }

  return {
    items: all.slice(0, args.limit),
    total: all.length,
    limit: args.limit,
  };
}

/**
 * If the reference node is the tag-name identifier of a JsxOpeningElement
 * or JsxSelfClosingElement, return that JSX element. Otherwise null.
 */
function getEnclosingJsxElement(node: Node): Node | null {
  const parent = node.getParent();
  if (!parent) return null;

  // <Foo ... /> — JsxSelfClosingElement contains the tag name directly
  if (Node.isJsxSelfClosingElement(parent)) {
    return parent;
  }

  // <Foo ...>...</Foo> — JsxOpeningElement contains the tag name
  if (Node.isJsxOpeningElement(parent)) {
    return parent;
  }

  return null;
}

/** Extract props from a JSX element as raw attribute strings. */
function extractProps(jsxElement: Node): string[] {
  const props: string[] = [];

  // Both JsxSelfClosingElement and JsxOpeningElement have getAttributes()
  if (
    Node.isJsxSelfClosingElement(jsxElement) ||
    Node.isJsxOpeningElement(jsxElement)
  ) {
    for (const attr of jsxElement.getAttributes()) {
      if (Node.isJsxAttribute(attr)) {
        const name = attr.getNameNode().getText();
        const init = attr.getInitializer();
        if (init) {
          props.push(`${name}=${init.getText()}`);
        } else {
          // Boolean shorthand, e.g. <Foo disabled />
          props.push(name);
        }
      } else if (Node.isJsxSpreadAttribute(attr)) {
        props.push(`{...${attr.getExpression().getText()}}`);
      }
    }
  }

  return props;
}

/** Walk up the AST to find the enclosing function/class component name. */
function findParentComponent(node: Node): string | null {
  let current: Node | undefined = node.getParent();
  while (current) {
    // function MyComponent() { ... }
    if (Node.isFunctionDeclaration(current) && current.getName()) {
      return current.getName()!;
    }
    // const MyComponent = () => { ... }  or  const MyComponent = function() { ... }
    if (
      (Node.isArrowFunction(current) || Node.isFunctionExpression(current))
    ) {
      const varDecl = current.getParent();
      if (varDecl && Node.isVariableDeclaration(varDecl) && varDecl.getName()) {
        return varDecl.getName();
      }
    }
    // class MyComponent extends Component { ... }
    if (Node.isClassDeclaration(current) && current.getName()) {
      return current.getName()!;
    }
    // Method inside a class (e.g. render())
    if (Node.isMethodDeclaration(current) && current.getName()) {
      const classDecl = current.getParent();
      if (classDecl && Node.isClassDeclaration(classDecl) && classDecl.getName()) {
        return classDecl.getName()!;
      }
    }
    current = current.getParent();
  }
  return null;
}

/** Get the name node of a declaration (for findReferences), or the node itself. */
function getNameNodeOrSelf(node: Node): Node {
  if (Node.hasName(node)) {
    const nameNode = (node as unknown as { getNameNode?(): Node | undefined }).getNameNode?.();
    if (nameNode) return nameNode;
  }
  return node;
}
