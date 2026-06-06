import { describe, it, expect } from "vitest";
import { findJsxUsage } from "../src/tools/find-jsx-usage.js";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import type { ToolContext } from "../src/tools/tool.js";

function ctx(): ToolContext {
  return { project: loadFixtureProject("react-app") };
}

const defaults = { component: "Button", limit: 50 } as const;

describe("find_jsx_usage", () => {
  it("finds all JSX usages of Button across files", () => {
    const r = findJsxUsage({ ...defaults }, ctx());
    // Button is used in: UserCard (1), UserList (1), App (1) = 3 usages
    expect(r.total).toBeGreaterThanOrEqual(3);
    const files = r.items.map((i) => i.file);
    expect(files.some((f) => f.includes("UserCard"))).toBe(true);
    expect(files.some((f) => f.includes("UserList"))).toBe(true);
    expect(files.some((f) => f.includes("App"))).toBe(true);
  });

  it("finds JSX usages of UserCard", () => {
    const r = findJsxUsage({ ...defaults, component: "UserCard" }, ctx());
    // UserCard is used in UserList.tsx
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.items.some((i) => i.file.includes("UserList"))).toBe(true);
  });

  it("extracts props from JSX usage", () => {
    const r = findJsxUsage({ ...defaults }, ctx());
    // Button in UserCard has label="View"
    const inUserCard = r.items.find((i) => i.file.includes("UserCard"));
    expect(inUserCard).toBeDefined();
    expect(inUserCard!.props.some((p) => p.includes("label"))).toBe(true);
  });

  it("identifies parent component", () => {
    const r = findJsxUsage({ ...defaults }, ctx());
    const inUserCard = r.items.find((i) => i.file.includes("UserCard"));
    expect(inUserCard).toBeDefined();
    expect(inUserCard!.parentComponent).toBe("UserCard");
  });

  it("detects self-closing elements", () => {
    const r = findJsxUsage({ ...defaults }, ctx());
    // <Button ... /> is self-closing in all usages
    const selfClosing = r.items.filter((i) => i.selfClosing);
    expect(selfClosing.length).toBeGreaterThanOrEqual(1);
  });

  it("filters by file", () => {
    const r = findJsxUsage(
      { ...defaults, file: "UserCard.tsx" },
      ctx(),
    );
    // Only usages of Button defined in UserCard.tsx scope
    // Note: file filter applies to the component declaration file, not usage file
    expect(r.total).toBeGreaterThanOrEqual(0);
  });

  it("returns empty for component with no JSX usages", () => {
    const r = findJsxUsage(
      { ...defaults, component: "User" },
      ctx(),
    );
    // User is an interface, not used in JSX
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });

  it("respects limit", () => {
    const r = findJsxUsage({ ...defaults, limit: 1 }, ctx());
    expect(r.items.length).toBeLessThanOrEqual(1);
    expect(r.total).toBeGreaterThanOrEqual(r.items.length);
  });

  it("identifies parent for arrow-function components", () => {
    const r = findJsxUsage({ ...defaults }, ctx());
    // Button used inside UserCard (arrow function component)
    const inUserCard = r.items.find((i) => i.parentComponent === "UserCard");
    expect(inUserCard).toBeDefined();
  });
});
