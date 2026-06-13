# ts-analysis-mcp — Glossary

## Decorator Match
A result from `find_by_decorator`: the decorated symbol plus the decorator's name and the raw source text of its arguments (e.g. `'users'` for `@Controller('users')`). Matching is by decorator name only; argument text is returned for the caller to inspect, not used as a filter.

## Diagnostic
A TypeScript compiler error or warning in the analysed project. The server operates in fail-open mode: diagnostics do not block tool responses. A dedicated `get_diagnostics` tool exposes them on demand.

## Result Page
The payload returned by list-style tools (`find_references`, `find_by_decorator`, etc.): an array of up to `limit` items (default 50) plus a `total` count. If `total > limit`, the caller should narrow the query rather than paginate.

## Member Reference
A string that addresses a member of a container symbol, using the form `Container#member` (e.g. `UserService#findOne`, `Auth.Token#verify`). The dot-separated part before `#` is the container path (which may itself include namespaces); the part after `#` is the member name. Distinct from a bare symbol name, which has no `#`.

## Name Match Mode
How `find_symbol` interprets the query string against symbol names. One of: `exact` (default — name equals the query), `contains` (name includes the query as a substring, for exploratory search), or `regex` (name matches the query as a regular expression). Strict by default to favour the common case where the agent already knows the name.

## Symbol Resolution
How a tool turns a name (e.g. `"UserService"`) into one or more symbols. By default a name may resolve to multiple symbols across files, and all matches are returned as a Result Page. An optional `file` argument narrows resolution to a single source file when the caller already knows which symbol it means.

## Symbol Projection
The structured payload a tool returns for a symbol. A single generic projection is applied to any symbol kind (class, interface, enum, function, type alias, …) rather than a hand-crafted shape per kind. Fixed lightweight field set: `kind`, `name`, `file`, `line`, `modifiers`, `decorators`, `heritage` (extends/implements), and `members` (each with `name`, `kind`, and `signature`). The raw ts-morph AST node is never serialized directly. Source text is excluded by default; callers opt in via `include_source: true`.

## Type Rendering
Every type or signature in a Symbol Projection is given in two forms: **declared** (the text as written in source — preserves aliases, generic names, `keyof`, etc.) and **resolved** (the type as computed by the TypeScript checker — aliases and generics expanded). Both are returned so the agent can choose; the resolved form is the value ts-morph adds over plain file reading.

## Reference
Any location in source code where a named symbol appears — including its own declaration site. Does not include usages of the symbol's *members* (method calls, property accesses). This is what `find_references` returns. Each reference item carries: `file`, `line`, `column`, the source `text` of that line, a `refKind` (see Reference Kind), and a `position` (see Reference Position).

## Reference Position
The coarse axis every reference belongs to, used as a top-level filter and as a completeness invariant — every Reference Kind maps to exactly one position. One of: `declaration`, `import-export`, `type`, `value`. A new Reference Kind cannot exist without being assigned a position, which structurally prevents the taxonomy from drifting.

## Reference Kind
The fine-grained classification of how a symbol is used at a reference site. Closed enumeration, grouped by Reference Position:

- **declaration**: `definition` (the symbol's own declaration site).
- **import-export**: `import`, `export`.
- **type**: `constructor-injection` (constructor parameter type — NestJS DI), `type-annotation` (any other type usage), `type-argument` (`Repository<X>`), `heritage` (`extends`/`implements`).
- **value**: `instantiation` (`new X()`), `decorator` (`@X()`), `decorator-metadata` (symbol as a value inside a decorator argument, e.g. `@Module({ providers: [X] })`), `static-access` (`X.create()`), `value-reference` (any other value usage).
- **fallback**: `other` (anything unclassified; the tool never throws on an unfamiliar node).

Classification follows fixed precedence — *specific beats general*: `definition` → `import`/`export` → `constructor-injection` before `type-annotation` → `decorator`/`decorator-metadata`/`static-access` before `value-reference` → else by position → `other`.

## Navigation Session
The primary use-case of the server: an AI agent reading an unfamiliar codebase to understand its structure — finding symbols, inspecting members, tracing dependencies — before writing or modifying code.

## Project Scope
The set of source files a search tool considers. A file is in scope if its **realpath** (path with all symlinks resolved) contains no `node_modules` segment. This keeps monorepo workspace packages in scope (their `node_modules/@org/pkg` symlink resolves back to e.g. `libs/shared`, which has no `node_modules` segment) and git submodules in scope (they live in the tree), while excluding genuine external dependencies (whose realpath stays under `node_modules`). Contrast with filtering by the literal import-resolved path, which would wrongly exclude symlinked workspace packages.

## Workspace Root
The directory that serves as the root of the analysed TypeScript project. Determined at server startup: the value of `--project` flag if supplied, otherwise the nearest ancestor directory of `process.cwd()` that contains a `tsconfig.json`. The server refuses to start if no `tsconfig.json` is found.

## Ambient Project
The single `ts-morph Project` instance that is initialized once at server startup and lives for the entire server session. All tools operate against this shared instance. Contrast with Transient Project. The project auto-invalidates: before each query, `ensureFresh()` (ADR 0006) stats in-scope source files and refreshes only those whose mtime changed, drops deleted files, and picks up newly added ones — so edits are reflected without a manual `reload_project`, which remains only as a full-rebuild escape hatch.

## Transient Project
(Rejected alternative.) A `ts-morph Project` created or retrieved from a cache on each tool call, keyed by a caller-supplied `projectRoot` path. Rejected in favour of Ambient Project.
