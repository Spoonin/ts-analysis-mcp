/**
 * CONTEXT.md › Member Reference (ADR 0002).
 *
 * Parse "Container#member" into container path and member name.
 * The container path may include dots (namespace-qualified):
 *   "Auth.Token#verify" → { container: "Auth.Token", member: "verify" }
 *   "UserService"       → { container: "UserService", member: undefined }
 */
export interface ParsedRef {
  container: string;
  member: string | undefined;
}

export function parseSymbolRef(input: string): ParsedRef {
  const hashIdx = input.indexOf("#");
  if (hashIdx === -1) {
    return { container: input, member: undefined };
  }
  const container = input.slice(0, hashIdx);
  const member = input.slice(hashIdx + 1);
  if (!container) {
    throw new Error(`Invalid Member Reference "${input}": empty container before #`);
  }
  if (!member) {
    throw new Error(`Invalid Member Reference "${input}": empty member after #`);
  }
  return { container, member };
}
