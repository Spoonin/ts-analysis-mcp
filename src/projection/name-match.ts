import type { ResultPage } from "../types.js";

export type MatchMode = "exact" | "contains" | "regex";

/** CONTEXT.md › Name Match Mode — build a predicate for a query + mode. */
export function nameMatcher(query: string, mode: MatchMode): (name: string) => boolean {
  switch (mode) {
    case "exact":
      return (name) => name === query;
    case "contains":
      return (name) => name.includes(query);
    case "regex": {
      let re: RegExp;
      try {
        re = new RegExp(query);
      } catch (err) {
        throw new Error(
          `Invalid regex in find_symbol query: ${(err as Error).message}`,
        );
      }
      return (name) => re.test(name);
    }
  }
}

/** CONTEXT.md › Result Page — truncate items to `limit`, report true total. */
export function toResultPage<T>(all: T[], limit: number): ResultPage<T> {
  return {
    items: all.slice(0, limit),
    total: all.length,
    limit,
  };
}
