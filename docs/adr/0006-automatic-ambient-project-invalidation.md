# ADR 0006 — Automatic Ambient Project invalidation

**Status:** Accepted (supersedes the "manual reload only" consequence of [ADR 0001](0001-ambient-project-lifecycle.md))

## Context

The Ambient Project (ADR 0001) is a single warm `ts-morph Project` built once at
startup so every tool query is cheap. ADR 0001 deferred a file-watcher to post-MVP, which
left one correctness defect: **silent staleness** — after a file is edited on disk,
queries keep returning the old picture until someone calls `reload_project`. The failure
is silent (no error, just wrong answers), which is the worst kind for an agent reasoning
about code.

Three designs were considered to fix this:

1. **Full statelessness** — rebuild the program per call. Rejected: it throws away the one
   property the server is built around (warm-query latency); on a monorepo each call would
   cost seconds, at which point the tool is slower than `tsc` + grep.
2. **File-watcher** (chokidar / `ts.watch`) — a background watcher maintains a dirty set;
   queries refresh only dirty files. Near-zero per-call cost, but adds a dependency and a
   watcher lifecycle, and only works when the server is co-located with the files.
3. **Lazy mtime-on-call** — before each query, `stat` the in-scope source files and
   `refreshFromFileSystemSync()` only those whose mtime changed; re-glob the tsconfig to
   pick up new files. No dependency, fully synchronous, host-agnostic.

## Decision

Adopt **lazy mtime-on-call** (option 3), detecting modified, added, and deleted files.

`AmbientProject` keeps a `path → mtimeMs` map and exposes `ensureFresh()`:
- **Modified/deleted sweep:** for each in-scope loaded file, `statSync` and compare mtime;
  refresh changed files, drop files that no longer exist (`ENOENT`).
- **Added sweep:** `addSourceFilesFromTsConfig(tsconfigPath)` re-globs and adds only files
  not already loaded (ts-morph dedupes by path, so unchanged files are not reparsed).

`server.ts` calls `ensureFresh()` through a single `fresh()` wrapper before every query
tool. `reload_project` is kept as a full-rebuild escape hatch for drift recovery
(e.g. tsconfig changes). The whole sweep is fail-open: a single unreadable file never
breaks a query.

Scope is restricted via the existing `isInScope` predicate (ADR 0003), so `node_modules`
dependency files — which don't change mid-session and could number in the thousands — are
never stat-ed.

## Consequences

- Edits, additions, and deletions are reflected automatically; `reload_project` becomes
  rarely needed rather than the only invalidation mechanism.
- Warm-query latency is preserved: unchanged files are stat-ed but not reparsed.
- The accepted cost is one `stat` per in-scope file per query plus a tsconfig re-glob —
  cheap relative to a parse, but non-zero on very large projects. If that ever bites, a
  debounce or a file-watcher (option 2) can be layered on without changing the chokepoint.
- No new runtime dependency; tool handlers stay synchronous
  (`refreshFromFileSystemSync`).
