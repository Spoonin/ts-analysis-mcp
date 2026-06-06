import { z } from "zod";
import { Node } from "ts-morph";
import type { Reference, ResultPage } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";
import { parseSymbolRef } from "../projection/member-reference.js";
import { classifyReference } from "../projection/reference-kind.js";
import { isInScope } from "../project/scope.js";

/**
 * find_references — CONTEXT.md › Reference, Reference Kind, Reference Position.
 *
 * Find every in-scope usage of a symbol (including its declaration site).
 * Each item carries location, source line, refKind and position. Member
 * usages are found by passing a Member Reference (Container#member).
 */
export const findReferencesSchema = {
  name: z
    .string()
    .describe("Symbol name or Member Reference (Container#member)."),
  file: z.string().optional().describe("Disambiguate the target symbol by file."),
  limit: z.number().int().positive().default(50),
};

export function findReferences(
  args: { name: string; file?: string; limit: number },
  ctx: ToolContext,
): ResultPage<Reference> {
  const ref = parseSymbolRef(args.name);

  // Resolve target declaration(s).
  const containers = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => d.getName() === ref.container,
  );

  // If Member Reference, narrow to the member node(s).
  let targets: Node[] = [];
  if (ref.member) {
    for (const c of containers) {
      if (
        Node.isClassDeclaration(c) ||
        Node.isInterfaceDeclaration(c) ||
        Node.isEnumDeclaration(c)
      ) {
        const member = c.getMembers().find(
          (m) =>
            (Node.isConstructorDeclaration(m) && ref.member === "constructor") ||
            (Node.hasName(m) && m.getName() === ref.member),
        );
        if (member) targets.push(member);
      }
    }
  } else {
    targets = containers;
  }

  if (targets.length === 0) {
    return { items: [], total: 0, limit: args.limit };
  }

  // Collect references from all targets, dedup by location.
  const seen = new Set<string>();
  const all: Reference[] = [];

  for (const target of targets) {
    // Use LanguageService.findReferences which works with any Node.
    const nameNode = getNameNodeOrSelf(target);
    const referencedSymbols = ctx.project.ts
      .getLanguageService()
      .findReferences(nameNode);

    for (const refSymbol of referencedSymbols) {
      const definitionNode = refSymbol.getDefinition().getDeclarationNode();

      for (const refEntry of refSymbol.getReferences()) {
        const sf = refEntry.getSourceFile();
        if (!isInScope(sf.getFilePath())) continue;

        const refNode = refEntry.getNode();
        const line = refNode.getStartLineNumber();
        const col = refNode.getStart() - sf.getFullText().lastIndexOf("\n", refNode.getStart()) - 1;
        const key = `${sf.getFilePath()}:${line}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const isDefinition = refEntry.isDefinition() ||
          (definitionNode != null && isDefinitionByPosition(refNode, definitionNode));
        const { refKind, position } = classifyReference(refNode, isDefinition);

        const lines = sf.getFullText().split("\n");
        const text = lines[line - 1] ?? "";

        all.push({
          file: sf.getFilePath(),
          line,
          column: col,
          text: text.trimEnd(),
          refKind,
          position,
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

/** Get the name node of a declaration (for findReferences), or the node itself. */
function getNameNodeOrSelf(node: Node): Node {
  if (Node.hasName(node)) {
    const nameNode = (node as unknown as { getNameNode?(): Node | undefined }).getNameNode?.();
    if (nameNode) return nameNode;
  }
  return node;
}

/** Check if a reference node is at the same position as the definition node. */
function isDefinitionByPosition(refNode: Node, defNode: Node): boolean {
  return (
    refNode.getSourceFile() === defNode.getSourceFile() &&
    refNode.getStart() === defNode.getStart()
  );
}
