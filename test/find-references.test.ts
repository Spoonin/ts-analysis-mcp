import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { findReferences } from "../src/tools/find-references.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject() };
}

describe("Stage 5+6 — find_references", () => {
  it("finds references to UserService including definition", () => {
    const r = findReferences({ name: "UserService", limit: 50 }, ctx());
    expect(r.total).toBeGreaterThan(0);

    const kinds = new Set(r.items.map((i) => i.refKind));
    // Definition site should be present.
    expect(kinds.has("definition")).toBe(true);
    // At least one import.
    expect(kinds.has("import")).toBe(true);
  });

  it("classifies constructor injection", () => {
    const r = findReferences({ name: "UserService", limit: 50 }, ctx());
    // UsersController constructor param.
    const ctorInjections = r.items.filter(
      (i) => i.refKind === "constructor-injection",
    );
    expect(ctorInjections.length).toBeGreaterThanOrEqual(1);
  });

  it("classifies decorator-metadata (providers array)", () => {
    const r = findReferences({ name: "UserService", limit: 50 }, ctx());
    const metadata = r.items.filter((i) => i.refKind === "decorator-metadata");
    // UserService appears in @Module({ providers: [UserService], exports: [UserService] })
    expect(metadata.length).toBeGreaterThanOrEqual(1);
  });

  it("reports position alongside refKind", () => {
    const r = findReferences({ name: "UserService", limit: 50 }, ctx());
    for (const item of r.items) {
      expect(item.position).toBeDefined();
      expect(["declaration", "import-export", "type", "value"]).toContain(
        item.position,
      );
    }
  });

  it("each item carries source text of the line", () => {
    const r = findReferences({ name: "UserService", limit: 50 }, ctx());
    for (const item of r.items) {
      expect(item.text.length).toBeGreaterThan(0);
    }
  });

  it("respects the limit parameter", () => {
    const r = findReferences({ name: "UserService", limit: 2 }, ctx());
    expect(r.items.length).toBeLessThanOrEqual(2);
  });

  it("resolves Member Reference for find_references", () => {
    const r = findReferences({ name: "UserService#findOne", limit: 50 }, ctx());
    expect(r.total).toBeGreaterThan(0);
    // The method definition should appear.
    expect(r.items.some((i) => i.refKind === "definition")).toBe(true);
  });

  it("returns empty for unknown symbol", () => {
    const r = findReferences({ name: "NonExistent", limit: 50 }, ctx());
    expect(r.total).toBe(0);
  });

  it("classifies heritage (implements Logger)", () => {
    const r = findReferences({ name: "Logger", limit: 50 }, ctx());
    const heritage = r.items.filter((i) => i.refKind === "heritage");
    expect(heritage.length).toBeGreaterThanOrEqual(1);
  });
});
