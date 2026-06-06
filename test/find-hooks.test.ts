import { describe, it, expect } from "vitest";
import { findHooks } from "../src/tools/find-hooks.js";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject("react-app") };
}

const defaults = { depth: 1 } as const;

describe("find_hooks", () => {
  it("finds Redux hooks in ConnectedUserList", () => {
    const r = findHooks({ component: "ConnectedUserList", ...defaults }, ctx());
    expect(r.component).toBe("ConnectedUserList");
    const hookNames = r.hooks.map((h) => h.hook);
    expect(hookNames).toContain("useSelector");
    expect(hookNames).toContain("useDispatch");
    expect(hookNames).toContain("useEffect");
    expect(hookNames).toContain("useCallback");
  });

  it("extracts selector argument text", () => {
    const r = findHooks({ component: "ConnectedUserList", ...defaults }, ctx());
    const selectors = r.hooks.filter((h) => h.hook === "useSelector");
    expect(selectors.length).toBeGreaterThanOrEqual(1);
    // First selector reads state.users.list
    expect(selectors.some((s) => s.args.includes("state.users.list"))).toBe(true);
  });

  it("finds useState and useEffect in custom hook", () => {
    const r = findHooks({ component: "useAuth", ...defaults }, ctx());
    expect(r.component).toBe("useAuth");
    const hookNames = r.hooks.map((h) => h.hook);
    expect(hookNames).toContain("useState");
    expect(hookNames).toContain("useEffect");
  });

  it("counts multiple useState calls", () => {
    const r = findHooks({ component: "useAuth", ...defaults }, ctx());
    const useStates = r.hooks.filter((h) => h.hook === "useState");
    expect(useStates.length).toBe(2);
  });

  it("includes line numbers", () => {
    const r = findHooks({ component: "ConnectedUserList", ...defaults }, ctx());
    for (const h of r.hooks) {
      expect(h.line).toBeGreaterThan(0);
    }
  });

  it("returns empty hooks for component without hooks", () => {
    const r = findHooks({ component: "Button", ...defaults }, ctx());
    expect(r.hooks).toEqual([]);
  });

  it("throws for unknown component", () => {
    expect(() => findHooks({ component: "NonExistent", ...defaults }, ctx())).toThrow(
      /not found/i,
    );
  });

  it("returns file path", () => {
    const r = findHooks({ component: "ConnectedUserList", ...defaults }, ctx());
    expect(r.file).toContain("ConnectedUserList.tsx");
  });

  // --- Hook chain (depth > 1) ---

  it("resolves hook chain for App → useAuth → useState/useEffect", () => {
    const r = findHooks({ component: "App", depth: 3 }, ctx());
    const useAuth = r.hooks.find((h) => h.hook === "useAuth");
    expect(useAuth).toBeDefined();
    expect(useAuth!.chain).toBeDefined();
    expect(useAuth!.chain!.length).toBeGreaterThan(0);

    const chainHooks = useAuth!.chain!.map((h) => h.hook);
    expect(chainHooks).toContain("useState");
    expect(chainHooks).toContain("useEffect");
  });

  it("does not add chain at depth 1 (default)", () => {
    const r = findHooks({ component: "App", depth: 1 }, ctx());
    const useAuth = r.hooks.find((h) => h.hook === "useAuth");
    expect(useAuth).toBeDefined();
    expect(useAuth!.chain).toBeUndefined();
  });

  it("does not add chain for external hooks (not in project)", () => {
    const r = findHooks({ component: "ConnectedUserList", depth: 3 }, ctx());
    // useSelector/useDispatch are stubs — imported but not declared in project as functions
    const useSelector = r.hooks.find((h) => h.hook === "useSelector");
    expect(useSelector).toBeDefined();
    expect(useSelector!.chain).toBeUndefined();
  });

  it("handles depth 2 — resolves one level of custom hooks", () => {
    const r = findHooks({ component: "App", depth: 2 }, ctx());
    const useAuth = r.hooks.find((h) => h.hook === "useAuth");
    expect(useAuth).toBeDefined();
    expect(useAuth!.chain).toBeDefined();

    // At depth 2, useAuth's internal hooks are shown but their chains are not
    for (const inner of useAuth!.chain!) {
      expect(inner.chain).toBeUndefined();
    }
  });
});
