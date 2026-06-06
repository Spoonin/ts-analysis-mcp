# ADR 0005 — Greenfield on ts-morph, not forking an existing MCP server

**Status:** Accepted

## Context

Several open-source TypeScript MCP servers already exist. Before building from scratch, we evaluated whether to fork or build upon one. The two closest candidates:

- **`SiroSuzume/mcp-ts-morph`** (MIT, ts-morph-based) — 8 tools, all refactoring-oriented (rename, move symbol, change signature, find unused exports). Loads the project per call (a Transient Project keyed by a tsconfig path passed to each tool). No decorator or NestJS tooling.
- **`mizchi/lsmcp`** (MIT, LSP/`tsgo`-based) — 13 LSP tools plus high-level project/symbol tools. Multi-language. References and hover come from the language server, not ts-morph. No decorator or NestJS tooling. Requires Node 22.

Two facts drove the decision:

1. **The decorator layer is our differentiator and exists in no candidate.** Decorator queries (`find_by_decorator`, `decorator-metadata` reference classification) are not Language Server primitives — they require ts-morph AST traversal. So ts-morph is in the stack regardless of whether we fork.
2. **The candidates conflict with decisions already made.** `SiroSuzume` uses the Transient Project model we rejected in ADR 0001, is refactoring-first (we chose navigation-first), and has its own response shapes that bypass our Symbol Projection (ADR 0004 area) and Reference Kind taxonomy (ADR 0004). `lsmcp` uses an LSP engine rather than ts-morph and is a heavy multi-language framework.

Forking would inherit a rejected lifecycle, a different primary purpose, and foreign response shapes — saving only the thin `findReferencesAsNodes` wrapper that ts-morph already provides cheaply.

## Decision

Build greenfield on ts-morph. Do not fork an existing MCP server.

Use `SiroSuzume/mcp-ts-morph` (MIT) as a *reference* for one narrow concern — how to resolve a symbol by position and collect its references via ts-morph — when implementing `find_references`. Reference only; no code is vendored.

## Consequences

- All prior decisions (Ambient Project, realpath scope, hash member notation, Reference Kind taxonomy, dual Type Rendering) land cleanly without re-litigation against a fork's conventions.
- We own the full surface and can keep it navigation-first and decorator-native.
- We reimplement generic navigation (find references, symbol projection) ourselves, but ts-morph does the heavy lifting, so the cost is modest.
- If a future need arises for heavy refactoring tools (rename, move), `SiroSuzume`'s MIT code remains available as a reference or a complementary server.
