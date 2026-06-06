import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { findSymbol } from "../src/tools/find-symbol.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject() };
}

const defaults = { match: "exact" as const, limit: 50, include_source: false };

describe("Stage 2 — find_symbol", () => {
  it("exact match finds a single class", () => {
    const r = findSymbol({ ...defaults, name: "UserService" }, ctx());
    expect(r.total).toBe(1);
    expect(r.items[0]!.name).toBe("UserService");
    expect(r.items[0]!.kind).toBe("ClassDeclaration");
  });

  it("exact match for ambiguous `User` returns both symbols", () => {
    const r = findSymbol({ ...defaults, name: "User" }, ctx());
    expect(r.total).toBe(2);
    const kinds = r.items.map((i) => i.kind).sort();
    expect(kinds).toEqual(["ClassDeclaration", "TypeAliasDeclaration"]);
  });

  it("contains mode is exploratory", () => {
    const r = findSymbol(
      { ...defaults, name: "User", match: "contains" },
      ctx(),
    );
    const names = r.items.map((i) => i.name).sort();
    expect(names).toEqual(
      expect.arrayContaining(["User", "UserRole", "UserService", "UsersController"]),
    );
  });

  it("regex mode matches by pattern", () => {
    const r = findSymbol(
      { ...defaults, name: "^Users.*", match: "regex" },
      ctx(),
    );
    const names = r.items.map((i) => i.name).sort();
    expect(names).toEqual(["UsersController", "UsersModule"]);
  });

  it("invalid regex throws a clear error", () => {
    expect(() =>
      findSymbol({ ...defaults, name: "(", match: "regex" }, ctx()),
    ).toThrow(/Invalid regex/);
  });

  it("file hint disambiguates", () => {
    const r = findSymbol(
      { ...defaults, name: "User", file: "legacy/user.ts" },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("TypeAliasDeclaration");
  });

  it("file hint requires a segment boundary, not a bare suffix (review #3)", () => {
    // "user.ts" is a bare suffix of ".../legacy/user.ts" but NOT a path
    // segment of ".../users/user.entity.ts"; it must not over-match.
    const r = findSymbol(
      { ...defaults, name: "User", match: "contains", file: "ntity.ts" },
      ctx(),
    );
    // "ntity.ts" has no separator boundary in any path → matches nothing.
    expect(r.total).toBe(0);
  });

  it("truncates before projecting but reports true total (review #2)", () => {
    const r = findSymbol(
      { ...defaults, name: "User", match: "contains", limit: 2 },
      ctx(),
    );
    expect(r.items.length).toBe(2);
    expect(r.total).toBeGreaterThan(2);
  });

  it("respects limit while reporting true total", () => {
    const r = findSymbol(
      { ...defaults, name: "User", match: "contains", limit: 1 },
      ctx(),
    );
    expect(r.items.length).toBe(1);
    expect(r.total).toBeGreaterThan(1);
    expect(r.limit).toBe(1);
  });
});
