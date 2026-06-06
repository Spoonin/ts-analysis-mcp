# ADR 0001 — Ambient Project lifecycle

**Status:** Accepted

## Context

The server needs a `ts-morph Project` to answer every analysis tool call. Two models were considered:

- **Ambient Project** — one instance, initialized at startup, shared across all tool calls for the session.
- **Transient Project** — instance created (or fetched from LRU cache) per call, keyed by a caller-supplied `projectRoot`.

The MCP stdio transport physically binds one server process to one workspace in the IDE/agent host. Each tool call therefore always refers to the same workspace.

## Decision

Use the Ambient Project model.

## Consequences

- Tool signatures have no `projectRoot` parameter — cleaner API, less noise in the agent's context window.
- Cold-start cost (parsing tsconfig + source files) is paid once per server session, not per call.
- File changes are not reflected until the server is restarted or a `reload_project` tool is called explicitly. A file-watcher is deferred to post-MVP.
- A single server process cannot analyze two different projects simultaneously; that use-case requires two server instances.
