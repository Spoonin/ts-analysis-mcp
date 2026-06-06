# ADR 0002 — Hash notation for member references

**Status:** Accepted

## Context

Tools must let callers address a member of a container symbol (a method or property of a class, an enum member, etc.) using a single string argument. Three syntaxes were considered:

- **Dot notation** — `UserService.findOne`
- **Hash notation** — `UserService#findOne`
- **Structural** — separate `{ symbol, member }` fields

Dot notation collides with namespace paths. TypeScript allows `export namespace Auth { export class Token {} }`, so `Auth.Token` is already a valid container path. A string like `Auth.Token.verify` is ambiguous: is `verify` a member, or is the whole thing a deeper namespace path?

## Decision

Use hash notation: the dot-separated container path, then `#`, then the member name — e.g. `Auth.Token#verify`.

## Consequences

- The `#` separator unambiguously splits the (possibly namespace-qualified) container path from the member name. No collision with namespace paths.
- The reference stays a single string, which is lighter for an agent to pass than a structural object.
- The form matches TSDoc link syntax (`{@link Class#method}`), so it is familiar to TypeScript developers.
- Every tool that accepts a symbol name must parse on `#` to detect member references; this parsing rule is shared across the tool surface.
