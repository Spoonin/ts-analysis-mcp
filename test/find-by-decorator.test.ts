import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { findByDecorator } from "../src/tools/find-by-decorator.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject() };
}

describe("Stage 4 — find_by_decorator", () => {
  it("finds all @Injectable classes", () => {
    const r = findByDecorator(
      { decorator: "Injectable", limit: 50, include_source: false },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.symbol.name).toBe("UserService");
    expect(r.items[0]!.decoratorName).toBe("Injectable");
    expect(r.items[0]!.argsText).toBe("");
  });

  it("finds @Controller with argument text", () => {
    const r = findByDecorator(
      { decorator: "Controller", limit: 50, include_source: false },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.symbol.name).toBe("UsersController");
    expect(r.items[0]!.argsText).toBe('"users"');
  });

  it("finds @Module with complex argument text", () => {
    const r = findByDecorator(
      { decorator: "Module", limit: 50, include_source: false },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.argsText).toContain("controllers");
    expect(r.items[0]!.argsText).toContain("providers");
  });

  it("finds method-level decorators (@Get)", () => {
    const r = findByDecorator(
      { decorator: "Get", limit: 50, include_source: false },
      ctx(),
    );
    expect(r.total).toBe(1);
    expect(r.items[0]!.symbol.name).toBe("getOne");
    expect(r.items[0]!.argsText).toBe('":id"');
  });

  it("returns empty for non-existent decorator", () => {
    const r = findByDecorator(
      { decorator: "NonExistent", limit: 50, include_source: false },
      ctx(),
    );
    expect(r.total).toBe(0);
  });

  it("respects limit", () => {
    const r = findByDecorator(
      { decorator: "Injectable", limit: 1, include_source: false },
      ctx(),
    );
    expect(r.items.length).toBeLessThanOrEqual(1);
  });
});
