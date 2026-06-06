import { realpathSync } from "node:fs";
import { sep } from "node:path";

/**
 * CONTEXT.md › Project Scope (ADR 0003).
 *
 * A file is in scope iff its realpath (symlinks resolved) contains no
 * `node_modules` segment. This keeps monorepo workspace packages and git
 * submodules in scope while excluding genuine external dependencies.
 */
const NODE_MODULES_SEGMENT = `${sep}node_modules${sep}`;

export function isInScope(filePath: string): boolean {
  let real: string;
  try {
    real = realpathSync(filePath);
  } catch {
    // If we can't resolve it, fall back to the literal path.
    real = filePath;
  }
  // Pad with separators so we match whole segments, not substrings.
  const padded = `${sep}${real}${sep}`;
  return !padded.includes(NODE_MODULES_SEGMENT);
}
