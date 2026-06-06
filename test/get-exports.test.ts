import { describe, it, expect } from "vitest";
import { getExports } from "../src/tools/get-exports.js";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject("react-app") };
}

describe("get_exports", () => {
  it("lists direct exports of a file", () => {
    const r = getExports({ file: "components/Button.tsx" }, ctx());
    expect(r.file).toContain("Button.tsx");
    const button = r.exports.find((e) => e.name === "Button");
    expect(button).toBeDefined();
    expect(button!.isReExport).toBe(false);
    expect(button!.kind).toBe("FunctionDeclaration");
  });

  it("resolves barrel re-exports", () => {
    const r = getExports({ file: "components/index.ts" }, ctx());
    expect(r.exports.length).toBeGreaterThanOrEqual(3);

    const names = r.exports.map((e) => e.name);
    expect(names).toContain("Button");
    expect(names).toContain("UserCard");
    expect(names).toContain("UserList");

    // All are re-exports — declared in other files
    for (const exp of r.exports) {
      expect(exp.isReExport).toBe(true);
      expect(exp.sourceFile).not.toContain("index.ts");
    }
  });

  it("shows sourceFile pointing to original declaration", () => {
    const r = getExports({ file: "components/index.ts" }, ctx());
    const button = r.exports.find((e) => e.name === "Button");
    expect(button).toBeDefined();
    expect(button!.sourceFile).toContain("Button.tsx");
  });

  it("exports interface types", () => {
    const r = getExports({ file: "types.ts" }, ctx());
    const user = r.exports.find((e) => e.name === "User");
    expect(user).toBeDefined();
    expect(user!.kind).toBe("InterfaceDeclaration");
    expect(user!.isReExport).toBe(false);
  });

  it("throws for non-existent file", () => {
    expect(() => getExports({ file: "nonexistent.ts" }, ctx())).toThrow(
      /not found/i,
    );
  });

  it("matches file by segment boundary", () => {
    // "types.ts" should match "src/types.ts" but not a hypothetical "xtypes.ts"
    const r = getExports({ file: "types.ts" }, ctx());
    expect(r.file).toContain("/types.ts");
  });

  it("sorts exports by name", () => {
    const r = getExports({ file: "components/index.ts" }, ctx());
    const names = r.exports.map((e) => e.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });
});
