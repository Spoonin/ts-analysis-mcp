import { z } from "zod";
import { Node } from "ts-morph";
import type { ResultPage, SymbolProjection } from "../types.js";
import type { ToolContext } from "./tool.js";
import { collectNamedDeclarations } from "../project/symbols.js";
import { projectSymbol } from "../projection/symbol-projection.js";
import { parseSymbolRef } from "../projection/member-reference.js";

/**
 * get_symbol_info — CONTEXT.md › Symbol Projection, Member Reference.
 *
 * Return the full generic projection for a named symbol. Accepts a bare name
 * (`UserService`) or a Member Reference (`UserService#findOne`). Ambiguous
 * names yield all matches as a Result Page.
 */
export const getSymbolInfoSchema = {
  name: z
    .string()
    .describe("Symbol name or Member Reference (Container#member)."),
  file: z.string().optional().describe("Narrow resolution to one source file."),
  include_source: z.boolean().default(false),
};

export function getSymbolInfo(
  args: { name: string; file?: string; include_source: boolean },
  ctx: ToolContext,
): ResultPage<SymbolProjection> {
  const ref = parseSymbolRef(args.name);
  const decls = collectNamedDeclarations(ctx.project, { file: args.file }).filter(
    (d) => d.getName() === ref.container,
  );

  if (!ref.member) {
    // Bare symbol — project each match.
    const items = decls.map((d) =>
      projectSymbol(d, { includeSource: args.include_source }),
    );
    return { items, total: items.length, limit: items.length };
  }

  // Member Reference — find the member inside each matching container.
  const items: SymbolProjection[] = [];
  for (const decl of decls) {
    const memberNode = findMember(decl, ref.member);
    if (memberNode) {
      items.push(
        projectSymbol(memberNode, { includeSource: args.include_source }),
      );
    }
  }
  return { items, total: items.length, limit: items.length };
}

function findMember(container: Node, memberName: string): Node | undefined {
  if (
    Node.isClassDeclaration(container) ||
    Node.isInterfaceDeclaration(container) ||
    Node.isEnumDeclaration(container)
  ) {
    return container
      .getMembers()
      .find(
        (m) =>
          (Node.isConstructorDeclaration(m) && memberName === "constructor") ||
          (Node.hasName(m) && m.getName() === memberName),
      );
  }
  return undefined;
}
