import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { getSymbolInfo } from "../src/tools/get-symbol-info.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject() };
}

const defaults = { include_source: false };

describe("Stage 3 — get_symbol_info", () => {
  it("returns projection for a bare symbol name", () => {
    const r = getSymbolInfo({ ...defaults, name: "UserService" }, ctx());
    expect(r.total).toBe(1);
    expect(r.items[0]!.name).toBe("UserService");
    expect(r.items[0]!.members.length).toBeGreaterThan(0);
  });

  it("resolves a Member Reference (Container#member)", () => {
    const r = getSymbolInfo({ ...defaults, name: "UserService#findOne" }, ctx());
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("MethodDeclaration");
    expect(r.items[0]!.name).toBe("findOne");
  });

  it("resolves constructor via Member Reference", () => {
    const r = getSymbolInfo({ ...defaults, name: "UsersController#constructor" }, ctx());
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("Constructor");
  });

  it("returns empty for a non-existent member", () => {
    const r = getSymbolInfo({ ...defaults, name: "UserService#nonExistent" }, ctx());
    expect(r.total).toBe(0);
  });

  it("ambiguous bare name returns all matches", () => {
    const r = getSymbolInfo({ ...defaults, name: "User" }, ctx());
    expect(r.total).toBe(2);
  });

  it("file hint narrows resolution", () => {
    const r = getSymbolInfo(
      { ...defaults, name: "User", file: "legacy/user.ts" },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.kind).toBe("TypeAliasDeclaration");
  });

  it("throws on malformed Member Reference", () => {
    expect(() => getSymbolInfo({ ...defaults, name: "#member" }, ctx())).toThrow(
      /empty container/,
    );
    expect(() => getSymbolInfo({ ...defaults, name: "Foo#" }, ctx())).toThrow(
      /empty member/,
    );
  });
});
