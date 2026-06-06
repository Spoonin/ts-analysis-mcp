import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * CONTEXT.md › Workspace Root.
 *
 * Resolution order:
 *   1. `--project <path>` flag, if supplied (path to a tsconfig.json or its dir).
 *   2. Nearest ancestor of process.cwd() that contains a tsconfig.json.
 * Throws if neither yields a tsconfig.json — the server refuses to start.
 */
export function resolveTsconfigPath(argv: string[], cwd: string): string {
  const explicit = readProjectFlag(argv);
  if (explicit) {
    const p = resolve(cwd, explicit);
    const tsconfig = p.endsWith(".json") ? p : join(p, "tsconfig.json");
    if (!existsSync(tsconfig)) {
      throw new Error(`--project points to a missing tsconfig: ${tsconfig}`);
    }
    return tsconfig;
  }

  const found = findUp("tsconfig.json", cwd);
  if (!found) {
    throw new Error(
      "No tsconfig.json found from CWD upward. Pass --project <path> to specify one.",
    );
  }
  return found;
}

function readProjectFlag(argv: string[]): string | undefined {
  const i = argv.indexOf("--project");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith("--project="));
  return eq?.slice("--project=".length);
}

function findUp(filename: string, startDir: string): string | undefined {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, filename);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}
