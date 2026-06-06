import { Node, SyntaxKind } from "ts-morph";
import {
  REFERENCE_KIND_POSITION,
  type ReferenceKind,
  type ReferencePosition,
} from "../types.js";

/**
 * CONTEXT.md › Reference Kind + Reference Position (ADR 0004).
 *
 * Classify a reference node by walking up to its parent context. Precedence is
 * fixed — *specific beats general*. An `other` fallback guarantees we never
 * throw on an unfamiliar node.
 */
export function classifyReference(
  node: Node,
  isDefinition: boolean,
): {
  refKind: ReferenceKind;
  position: ReferencePosition;
} {
  const refKind = classifyKind(node, isDefinition);
  return { refKind, position: REFERENCE_KIND_POSITION[refKind] };
}

function classifyKind(node: Node, isDefinition: boolean): ReferenceKind {
  // 1. Import / Export — checked BEFORE definition because TS language service
  //    marks import specifiers as "definitions" (they define the local binding),
  //    but our taxonomy classifies them as "import".
  if (hasAncestorOfKindDeep(node, SyntaxKind.ImportDeclaration) ||
      hasAncestorOfKindDeep(node, SyntaxKind.ImportSpecifier) ||
      hasAncestorOfKindDeep(node, SyntaxKind.ImportClause)) {
    return "import";
  }
  if (hasAncestorOfKindDeep(node, SyntaxKind.ExportDeclaration) ||
      hasAncestorOfKindDeep(node, SyntaxKind.ExportSpecifier) ||
      hasAncestorOfKindDeep(node, SyntaxKind.ExportAssignment)) {
    return "export";
  }

  // 2. Definition site (after import/export check).
  if (isDefinition) return "definition";

  // 3. Constructor injection — parameter of a Constructor (NestJS DI)
  if (isConstructorParameter(node)) return "constructor-injection";

  // 4. Type-position checks (specific before general)
  if (isInTypeArgument(node)) return "type-argument";
  if (hasAncestorOfKind(node, SyntaxKind.HeritageClause)) return "heritage";

  // 5. Value-position checks (specific before general)
  if (isNewExpressionCallee(node)) return "instantiation";
  if (isDecoratorCallee(node)) return "decorator";
  if (isInsideDecoratorArguments(node)) return "decorator-metadata";
  if (isStaticAccess(node)) return "static-access";

  // 6. Determine if type or value position
  if (isInTypePosition(node)) return "type-annotation";
  if (isInValuePosition(node)) return "value-reference";

  return "other";
}

// ── Tree helpers ──────────────────────────────────────────────────

function isDescendantOf(node: Node, ancestor: Node): boolean {
  let current: Node | undefined = node.getParent();
  while (current) {
    if (current === ancestor) return true;
    current = current.getParent();
  }
  return false;
}

// ── Ancestor helpers ──────────────────────────────────────────────

function hasAncestorOfKind(node: Node, kind: SyntaxKind): boolean {
  let current = node.getParent();
  while (current) {
    if (current.getKind() === kind) return true;
    // Don't walk past a statement/declaration boundary — keeps it fast.
    if (Node.isStatement(current) || Node.isClassDeclaration(current) || Node.isFunctionDeclaration(current) || Node.isVariableDeclaration(current)) break;
    current = current.getParent();
  }
  return false;
}

/** Walk upward without stopping at declaration boundaries (for broader checks). */
function hasAncestorOfKindDeep(node: Node, kind: SyntaxKind): boolean {
  let current = node.getParent();
  while (current) {
    if (current.getKind() === kind) return true;
    current = current.getParent();
  }
  return false;
}

// ── Specific classifiers ──────────────────────────────────────────

function isConstructorParameter(node: Node): boolean {
  // Walk up: Identifier → TypeReference → Parameter → Constructor
  let current = node.getParent();
  while (current) {
    if (Node.isParameterDeclaration(current)) {
      const parent = current.getParent();
      return !!parent && Node.isConstructorDeclaration(parent);
    }
    // Stop if we leave type-annotation territory
    if (Node.isStatement(current) || Node.isClassDeclaration(current) || Node.isFunctionDeclaration(current) || Node.isVariableDeclaration(current)) break;
    current = current.getParent();
  }
  return false;
}

function isInTypeArgument(node: Node): boolean {
  let current = node.getParent();
  while (current) {
    // TypeReference with type arguments: Repository<X>
    if (current.getKind() === SyntaxKind.TypeReference) {
      const parent = current.getParent();
      // Check if this node is in the type arguments, not the type name itself
      if (parent) {
        const typeArgs = current.getChildrenOfKind(SyntaxKind.TypeReference);
        // Simpler: if the node is inside a TypeReference that itself has type arguments,
        // and the node is not the identifier of the outer TypeReference
        const outerTypeRef = node.getFirstAncestorByKind(SyntaxKind.TypeReference);
        if (outerTypeRef) {
          const typeArgNodes = outerTypeRef.getTypeArguments?.();
          if (typeArgNodes && typeArgNodes.length > 0) {
            for (const ta of typeArgNodes) {
              if (ta === node || isDescendantOf(node, ta)) return true;
            }
          }
        }
      }
    }
    if (Node.isStatement(current)) break;
    current = current.getParent();
  }
  return false;
}

function isNewExpressionCallee(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  return parent.getKind() === SyntaxKind.NewExpression &&
    parent.getChildAtIndex(1) === node; // child 0 = 'new' keyword, child 1 = expression
}

function isDecoratorCallee(node: Node): boolean {
  // @Injectable() → Decorator > CallExpression > Identifier
  // @Injectable   → Decorator > Identifier
  let current = node.getParent();
  while (current) {
    if (Node.isDecorator(current)) return true;
    if (current.getKind() === SyntaxKind.CallExpression) {
      const parent = current.getParent();
      return !!parent && Node.isDecorator(parent);
    }
    break;
  }
  return false;
}

function isInsideDecoratorArguments(node: Node): boolean {
  // @Module({ providers: [UserService] })
  // We need to find a Decorator ancestor, and verify that `node` is inside
  // the arguments, not the callee.
  let current: Node | undefined = node;
  while (current) {
    if (Node.isDecorator(current)) return false; // we reached the decorator itself as callee
    const parent = current.getParent();
    if (parent && Node.isDecorator(parent)) {
      // `current` is a direct child of Decorator — is it the callee or an argument?
      // In a decorator factory `@Foo(args)`, the structure is Decorator > CallExpression
      // If current is the CallExpression's argument, we want true.
      // But we already checked isDecoratorCallee above (higher priority), so if we
      // get here the node is inside argument expressions.
      return false;
    }
    if (parent && parent.getKind() === SyntaxKind.CallExpression) {
      const grandparent = parent.getParent();
      if (grandparent && Node.isDecorator(grandparent)) {
        // `node` is inside the call expression of a decorator.
        // Check it's in the arguments, not the callee position.
        const callExpr = parent;
        const firstChild = callExpr.getChildAtIndex(0);
        if (firstChild !== current && current !== firstChild) {
          return true;
        }
        return false;
      }
    }
    current = parent;
  }
  return false;
}

function isStaticAccess(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  // X.create() → PropertyAccessExpression where X is the expression (left side)
  return parent.getKind() === SyntaxKind.PropertyAccessExpression &&
    parent.getChildAtIndex(0) === node;
}

function isInTypePosition(node: Node): boolean {
  return hasAncestorOfKindDeep(node, SyntaxKind.TypeReference) ||
    hasAncestorOfKindDeep(node, SyntaxKind.TypeAliasDeclaration) ||
    hasAncestorOfKindDeep(node, SyntaxKind.InterfaceDeclaration);
}

function isInValuePosition(node: Node): boolean {
  // If it's not clearly a type position, and it has ancestors that are value contexts
  return hasAncestorOfKindDeep(node, SyntaxKind.CallExpression) ||
    hasAncestorOfKindDeep(node, SyntaxKind.VariableDeclaration) ||
    hasAncestorOfKindDeep(node, SyntaxKind.BinaryExpression) ||
    hasAncestorOfKindDeep(node, SyntaxKind.ReturnStatement) ||
    hasAncestorOfKindDeep(node, SyntaxKind.ArrayLiteralExpression) ||
    hasAncestorOfKindDeep(node, SyntaxKind.PropertyAssignment) ||
    hasAncestorOfKindDeep(node, SyntaxKind.ExpressionStatement);
}
