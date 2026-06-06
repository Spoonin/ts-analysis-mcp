import type { Node, SourceFile } from "ts-morph";
import type { AmbientProject } from "./ambient-project.js";
import { isInScope } from "./scope.js";

/** A named top-level declaration we can project. */
export type NamedDeclaration = Node & { getName(): string | undefined };

/**
 * Collect all in-scope, named top-level declarations across the project:
 * classes, interfaces, enums, functions, type aliases.
 *
 * @param opts.file — if given, restrict to source files whose path ends with
 *   this suffix (relative path match), per CONTEXT.md › Symbol Resolution.
 */
export function collectNamedDeclarations(
  project: AmbientProject,
  opts: { file?: string } = {},
): NamedDeclaration[] {
  const out: NamedDeclaration[] = [];
  for (const sf of project.ts.getSourceFiles()) {
    if (!isInScope(sf.getFilePath())) continue;
    if (opts.file && !matchesFile(sf, opts.file)) continue;
    out.push(...namedDeclarationsOf(sf));
  }
  return out;
}

function namedDeclarationsOf(sf: SourceFile): NamedDeclaration[] {
  const decls = [
    ...sf.getClasses(),
    ...sf.getInterfaces(),
    ...sf.getEnums(),
    ...sf.getFunctions(),
    ...sf.getTypeAliases(),
    ...sf.getVariableDeclarations(),
  ];
  return decls.filter((d) => d.getName() !== undefined) as NamedDeclaration[];
}

/**
 * Match a caller-supplied file hint against a source file's path. The hint must
 * match either the whole path or a trailing path segment — a bare suffix
 * without a separator boundary (e.g. "user.ts" vs "superuser.ts") does not
 * match, to avoid silently selecting the wrong file.
 */
function matchesFile(sf: SourceFile, hint: string): boolean {
  const path = sf.getFilePath();
  const normalized = hint.replace(/\\/g, "/");
  return path === normalized || path.endsWith(`/${normalized}`);
}
