import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { getDiagnostics } from "../src/tools/get-diagnostics.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject() };
}

describe("Stage 7 — get_diagnostics", () => {
  it("returns diagnostics as a ResultPage", () => {
    const r = getDiagnostics({ limit: 50 }, ctx());
    // Fixture should compile cleanly.
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const r = getDiagnostics({ limit: 1 }, ctx());
    expect(r.items.length).toBeLessThanOrEqual(1);
  });
});
