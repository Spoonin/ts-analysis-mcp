# ts-analysis-mcp

MCP server for structural navigation of TypeScript / NestJS codebases via [ts-morph](https://ts-morph.com).

Gives AI agents deep, decorator-aware understanding of your TypeScript project — beyond what a language server or plain file reading can provide.

## Why

AI agents working with large NestJS codebases need to understand **structure**: who injects what, which controller handles which route, how modules are wired. Plain `grep` and file reading miss the semantic layer. Language servers give hover/go-to-definition but can't answer "find all classes decorated with `@Controller` and show me their route prefixes."

This server fills that gap with six tools powered by the TypeScript compiler's own type checker.

## Tools

| Tool | What it does |
|---|---|
| `find_symbol` | Locate symbols by name (`exact` / `contains` / `regex`). Returns file, line, kind. |
| `get_symbol_info` | Full structural projection of a symbol: members, decorators, heritage, types. Accepts `Container#member` notation. |
| `find_references` | Find all usages of a symbol, each classified by kind (`import`, `constructor-injection`, `decorator-metadata`, `heritage`, …) and position (`declaration`, `import-export`, `type`, `value`). |
| `find_by_decorator` | Find all symbols decorated with a given decorator, with raw argument text (e.g. route prefix from `@Controller('users')`). |
| `get_diagnostics` | List TypeScript compiler errors/warnings (fail-open — diagnostics never block other tools). |
| `reload_project` | Re-read tsconfig and source files after external changes. |

## Quick start

### With Claude Code

```bash
claude mcp add ts-analysis -- npx ts-analysis-mcp
```

### With Cursor / Windsurf

Add to your MCP config (`.cursor/mcp.json` or equivalent):

```json
{
  "mcpServers": {
    "ts-analysis": {
      "command": "npx",
      "args": ["ts-analysis-mcp"]
    }
  }
}
```

### With an explicit project path

```bash
npx ts-analysis-mcp --project ./path/to/tsconfig.json
```

Without `--project`, the server walks up from `cwd` to find the nearest `tsconfig.json` (same as `tsc`).

## Key design decisions

These are documented as [ADRs](./docs/adr/) for full context:

- **Ambient Project** — one `ts-morph Project` per server session, not per call. Fast, matches the stdio-per-workspace model.
- **Generic projection** — a single response shape for any symbol kind (class, interface, enum, function, type alias). No per-kind schemas to learn.
- **Dual type rendering** — every type shown as both `declared` (what you wrote: `Promise<User>`) and `resolved` (what the checker computed: `Promise<import("...").User>`).
- **Realpath scope** — workspace packages in monorepos stay in scope; `node_modules` dependencies are excluded. Symlinks are resolved to avoid false exclusions.
- **Reference Kind taxonomy** — 13 fine-grained classifications (`definition`, `import`, `export`, `constructor-injection`, `type-annotation`, `type-argument`, `heritage`, `instantiation`, `decorator`, `decorator-metadata`, `static-access`, `value-reference`, `other`) grouped into 4 positions (`declaration`, `import-export`, `type`, `value`).

## Example output

```bash
# Find all @Controller classes with their route prefixes
find_by_decorator("Controller")
```

```json
{
  "items": [{
    "symbol": {
      "kind": "ClassDeclaration",
      "name": "UsersController",
      "file": "src/users/users.controller.ts",
      "line": 6,
      "modifiers": ["export"],
      "decorators": ["Controller(\"users\")"],
      "heritage": [],
      "members": [
        { "name": "constructor", "kind": "Constructor", "signature": { "declared": "...", "resolved": "..." }, "decorators": [] },
        { "name": "getOne", "kind": "MethodDeclaration", "signature": { "declared": "Promise<User | undefined>", "resolved": "..." }, "decorators": ["Get(\":id\")"] }
      ]
    },
    "decoratorName": "Controller",
    "argsText": "\"users\""
  }],
  "total": 1,
  "limit": 50
}
```

## Development

```bash
git clone https://github.com/Spoonin/ts-analysis-mcp.git
cd ts-analysis-mcp
npm install
npm run build
npm test
```

### Scripts

| Script | What it does |
|---|---|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode compilation |
| `npm test` | Run all tests (vitest) |
| `npm run test:watch` | Watch mode tests |
| `npm run typecheck` | Type-check without emitting |

## License

MIT
