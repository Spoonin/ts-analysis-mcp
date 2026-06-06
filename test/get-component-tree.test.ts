import { describe, it, expect } from "vitest";
import { getComponentTree } from "../src/tools/get-component-tree.js";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject("react-app") };
}

describe("get_component_tree", () => {
  it("builds tree from App root", () => {
    const r = getComponentTree({ component: "App", depth: 5 }, ctx());
    expect(r.tree).not.toBeNull();
    expect(r.tree!.name).toBe("App");

    const childNames = r.tree!.children.map((c) => c.name);
    expect(childNames).toContain("UserList");
    expect(childNames).toContain("Button");
  });

  it("resolves nested children recursively", () => {
    const r = getComponentTree({ component: "App", depth: 5 }, ctx());
    const userList = r.tree!.children.find((c) => c.name === "UserList");
    expect(userList).toBeDefined();

    const userListChildren = userList!.children.map((c) => c.name);
    expect(userListChildren).toContain("UserCard");
    expect(userListChildren).toContain("Button");
  });

  it("includes file and line for each node", () => {
    const r = getComponentTree({ component: "App", depth: 5 }, ctx());
    expect(r.tree!.file).toContain("App.tsx");
    expect(r.tree!.line).toBeGreaterThan(0);

    for (const child of r.tree!.children) {
      expect(child.file).toBeTruthy();
      expect(child.line).toBeGreaterThan(0);
    }
  });

  it("respects depth limit", () => {
    const r = getComponentTree({ component: "App", depth: 1 }, ctx());
    expect(r.tree!.children.length).toBeGreaterThan(0);
    // At depth 1, children exist but grandchildren should be empty
    for (const child of r.tree!.children) {
      expect(child.children).toEqual([]);
    }
  });

  it("returns null for unknown component", () => {
    const r = getComponentTree({ component: "NonExistent", depth: 5 }, ctx());
    expect(r.tree).toBeNull();
  });

  it("handles leaf components with no JSX children", () => {
    const r = getComponentTree({ component: "Button", depth: 5 }, ctx());
    expect(r.tree).not.toBeNull();
    expect(r.tree!.name).toBe("Button");
    // Button only renders intrinsic <button>, no component children
    expect(r.tree!.children).toEqual([]);
  });

  it("deduplicates children rendered multiple times", () => {
    // UserList renders both UserCard and Button, each once in the tree
    const r = getComponentTree({ component: "UserList", depth: 1 }, ctx());
    const names = r.tree!.children.map((c) => c.name);
    const unique = [...new Set(names)];
    expect(names.length).toBe(unique.length);
  });

  it("UserCard renders Button as child", () => {
    const r = getComponentTree({ component: "UserCard", depth: 5 }, ctx());
    expect(r.tree!.name).toBe("UserCard");
    expect(r.tree!.children.map((c) => c.name)).toContain("Button");
  });
});
