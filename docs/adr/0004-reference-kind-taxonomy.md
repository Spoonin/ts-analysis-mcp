# ADR 0004 — Reference Kind taxonomy with a position invariant

**Status:** Accepted

## Context

`find_references` returns every site where a symbol appears. A bare location is weak; agents want to know *how* the symbol is used (is this the definition? an import? a `new`? NestJS DI wiring inside `@Module`?) so they can filter without opening every file.

TypeScript offers no ready-made classification — each reference node must be classified by inspecting its parent. Done ad hoc, such a taxonomy drifts: kinds overlap, gaps fall through, and agents that filter on kind values break when the set changes.

## Decision

Attach two fields to every reference item: a fine-grained `refKind` (closed enum) and a coarse `position` (`declaration` | `import-export` | `type` | `value`).

- Every `refKind` maps to exactly one `position`. A new `refKind` cannot be added without assigning a position — this is a structural completeness invariant, not a convention.
- Classification follows fixed *specific-beats-general* precedence (e.g. a constructor-parameter type is `constructor-injection`, not `type-annotation`; a class inside `@Module({ providers: [...] })` is `decorator-metadata`, not `value-reference`).
- An `other` fallback guarantees the tool never throws on an unfamiliar node.

The full enum is recorded in CONTEXT.md (Reference Kind).

## Consequences

- Agents get a cheap two-level filter: coarse (`position: "type"`) or fine (`refKind: "constructor-injection"`). NestJS DI wiring is directly queryable via `decorator-metadata` and `constructor-injection`.
- The position invariant prevents taxonomy drift: completeness is checkable by construction.
- `refKind` is orthogonal to the symbol's own `kind` (from Symbol Projection): `refKind` answers "how is it used here", `kind` answers "what is it". They are never merged, so the definition site is `definition` regardless of whether the symbol is a class or interface.
- Renaming or removing an enum value is a breaking change for agents that filter on it; the closed enum is therefore part of the tool's contract.
- Per-node classification has a small runtime cost and known edge cases, absorbed by the `other` bucket.
