import { rmSync, utimesSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadTempFixtureProject } from "./helpers/load-fixture.js";
import type { AmbientProject } from "../src/project/ambient-project.js";
import { findSymbol } from "../src/tools/find-symbol.js";
import { getDiagnostics } from "../src/tools/get-diagnostics.js";
import type { ToolContext } from "../src/tools/tool.js";

const findDefaults = { match: "exact" as const, limit: 50, include_source: false };

/** Push a file's mtime safely into the future so the mtime sweep always sees a change. */
function bumpMtime(path: string): void {
  const future = new Date(Date.now() + 5_000);
  utimesSync(path, future, future);
}

describe("ADR 0006 — automatic Ambient Project invalidation", () => {
  let project: AmbientProject;
  let root: string;
  let cleanup: () => void;
  let ctx: ToolContext;

  beforeEach(() => {
    ({ project, root, cleanup } = loadTempFixtureProject("nest-app"));
    ctx = { project };
  });

  afterEach(() => cleanup());

  it("picks up a symbol added to an existing file (modified)", () => {
    expect(findSymbol({ ...findDefaults, name: "FreshlyAdded" }, ctx).total).toBe(0);

    const file = resolve(root, "src/users/user.service.ts");
    writeFileSync(file, "\nexport class FreshlyAdded {}\n", { flag: "a" });
    bumpMtime(file);
    project.ensureFresh();

    const r = findSymbol({ ...findDefaults, name: "FreshlyAdded" }, ctx);
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("ClassDeclaration");
  });

  it("picks up a brand-new file (added)", () => {
    expect(findSymbol({ ...findDefaults, name: "BrandNewService" }, ctx).total).toBe(0);

    writeFileSync(
      resolve(root, "src/users/extra.ts"),
      "export class BrandNewService {}\n",
    );
    project.ensureFresh();

    expect(findSymbol({ ...findDefaults, name: "BrandNewService" }, ctx).total).toBe(1);
  });

  it("drops a deleted file's symbols without crashing diagnostics (deleted)", () => {
    // legacy/user.ts holds the `User` type alias; user.entity.ts holds the class.
    expect(findSymbol({ ...findDefaults, name: "User" }, ctx).total).toBe(2);

    rmSync(resolve(root, "src/legacy/user.ts"));
    project.ensureFresh();

    const r = findSymbol({ ...findDefaults, name: "User" }, ctx);
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("ClassDeclaration");
    // fail-open: diagnostics over a now-broken project must not throw.
    expect(() => getDiagnostics({ limit: 50 }, ctx)).not.toThrow();
  });

  it("is a no-op when nothing changed (unchanged sanity)", () => {
    project.ensureFresh();
    const r = findSymbol({ ...findDefaults, name: "UserService" }, ctx);
    expect(r.total).toBe(1);
    expect(r.items[0]!.name).toBe("UserService");
  });
});
