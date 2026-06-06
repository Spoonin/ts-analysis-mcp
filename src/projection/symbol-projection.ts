import { Node, type Type } from "ts-morph";
import type {
  ProjectedMember,
  SymbolProjection,
  TypeRendering,
} from "../types.js";

/**
 * CONTEXT.md › Symbol Projection + Type Rendering.
 *
 * One generic projection for ANY symbol kind. The raw ts-morph node is never
 * serialized; we extract a fixed lightweight field set. Every type/signature
 * is rendered in both `declared` and `resolved` form.
 */
export function projectSymbol(
  node: Node,
  opts: { includeSource: boolean } = { includeSource: false },
): SymbolProjection {
  const sourceFile = node.getSourceFile();

  return {
    kind: node.getKindName(),
    name: Node.hasName(node) ? node.getName() : "<anonymous>",
    file: sourceFile.getFilePath(),
    line: node.getStartLineNumber(),
    modifiers: getModifiers(node),
    decorators: getDecorators(node),
    heritage: getHeritage(node),
    members: getMembers(node),
    ...(opts.includeSource ? { source: node.getText() } : {}),
  };
}

function getModifiers(node: Node): string[] {
  if (Node.isModifierable(node)) {
    // getModifiers() includes decorator nodes; those are projected separately
    // in `decorators`, so exclude them here to avoid duplication.
    return node
      .getModifiers()
      .filter((m) => !Node.isDecorator(m))
      .map((m) => m.getText());
  }
  return [];
}

/** Decorator names with raw argument text, e.g. "Controller('users')". */
function getDecorators(node: Node): string[] {
  if (!Node.isDecoratable(node)) return [];
  return node.getDecorators().map((d) => {
    const args = d.getArguments();
    if (args.length === 0) {
      // Bare decorator with no call, e.g. `@Injectable` — keep just the name.
      return d.isDecoratorFactory() ? `${d.getName()}()` : d.getName();
    }
    return `${d.getName()}(${args.map((a) => a.getText()).join(", ")})`;
  });
}

/** extends / implements clause texts. */
function getHeritage(node: Node): string[] {
  const out: string[] = [];
  if (Node.isClassDeclaration(node) || Node.isClassExpression(node)) {
    const ext = node.getExtends();
    if (ext) out.push(`extends ${ext.getText()}`);
    for (const impl of node.getImplements()) {
      out.push(`implements ${impl.getText()}`);
    }
  } else if (Node.isInterfaceDeclaration(node)) {
    for (const ext of node.getExtends()) {
      out.push(`extends ${ext.getText()}`);
    }
  }
  return out;
}

/** Project members of classes, interfaces and enums. */
function getMembers(node: Node): ProjectedMember[] {
  let members: Node[] = [];
  if (
    Node.isClassDeclaration(node) ||
    Node.isInterfaceDeclaration(node) ||
    Node.isEnumDeclaration(node)
  ) {
    members = node.getMembers();
  }
  return members.map(projectMember);
}

function projectMember(member: Node): ProjectedMember {
  return {
    name: memberName(member),
    kind: member.getKindName(),
    signature: renderMemberSignature(member),
    decorators: getDecorators(member),
  };
}

function memberName(member: Node): string {
  if (Node.isConstructorDeclaration(member)) return "constructor";
  if (Node.hasName(member)) return member.getName();
  return "<anonymous>";
}

/** CONTEXT.md › Type Rendering for a member's type/signature. */
function renderMemberSignature(member: Node): TypeRendering {
  // Methods/functions: prefer the declared return-type node; resolve via type.
  if (
    Node.isMethodDeclaration(member) ||
    Node.isMethodSignature(member) ||
    Node.isFunctionDeclaration(member)
  ) {
    const declared = member.getReturnTypeNode()?.getText();
    return renderType(declared, member.getReturnType());
  }

  // Properties / fields: declared type node if present.
  if (
    Node.isPropertyDeclaration(member) ||
    Node.isPropertySignature(member)
  ) {
    const declared = member.getTypeNode()?.getText();
    return renderType(declared, member.getType());
  }

  // Enum members and anything else: fall back to the node's own type.
  return renderType(undefined, member.getType());
}

/** CONTEXT.md › Type Rendering — declared (as written) + resolved (via checker). */
export function renderType(
  declared: string | undefined,
  type: Type,
): TypeRendering {
  const resolved = type.getText();
  return {
    declared: declared ?? resolved,
    resolved,
  };
}
