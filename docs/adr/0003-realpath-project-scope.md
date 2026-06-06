# ADR 0003 — Project scope by realpath, excluding node_modules

**Status:** Accepted

## Context

Search tools (`find_references`, `find_by_decorator`, …) must restrict results to the project's own code and exclude external dependencies, which otherwise drown the agent in irrelevant matches (e.g. internal references inside TypeORM).

The naive filter is "exclude any file whose path contains a `node_modules` segment." But in a monorepo, local workspace packages are symlinked into `node_modules` (e.g. `node_modules/@myorg/shared` → `libs/shared`). TypeScript resolves imports of `@myorg/shared` to a path *through* that symlink, so the import-resolved path contains `node_modules` even though the file is the project's own source. The naive filter would wrongly exclude it.

## Decision

A file is in scope if its **realpath** (all symlinks resolved) contains no `node_modules` segment.

## Consequences

- Monorepo workspace packages stay in scope: their realpath resolves back to the source location (`libs/shared/...`), which has no `node_modules` segment.
- Git submodules stay in scope: they physically live in the project tree.
- Genuine external dependencies are excluded: their realpath remains under `node_modules` (including pnpm's `node_modules/.pnpm/...` store).
- Every search tool resolves realpath per candidate file before deciding inclusion. This is a small per-file syscall cost.
- For workspace-package references to exist in the Ambient Project at all, the loaded tsconfig must reach those source files (via `paths` mapping or `include`). If a local package resolves only to compiled `.d.ts` under `node_modules`, there is no source to navigate regardless of this rule.
