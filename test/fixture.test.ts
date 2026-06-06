import { describe, expect, it } from "vitest";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { isInScope } from "../src/project/scope.js";

describe("Stage 0 — fixture & AmbientProject", () => {
  it("loads the nest-app fixture without throwing", () => {
    const project = loadFixtureProject();
    const files = project.ts.getSourceFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  it("finds the seeded symbols", () => {
    const project = loadFixtureProject();
    expect(project.ts.getSourceFiles().some((f) => !!f.getClass("UserService"))).toBe(true);
    expect(project.ts.getSourceFiles().some((f) => !!f.getClass("UsersController"))).toBe(true);
    expect(project.ts.getSourceFiles().some((f) => !!f.getEnum("UserRole"))).toBe(true);
    expect(project.ts.getSourceFiles().some((f) => !!f.getInterface("Logger"))).toBe(true);
  });

  it("has two symbols named `User` across files (ambiguous resolution)", () => {
    const project = loadFixtureProject();
    const userDecls = project.ts
      .getSourceFiles()
      .flatMap((f) => [f.getClass("User"), f.getTypeAlias("User")])
      .filter((d): d is NonNullable<typeof d> => !!d);
    expect(userDecls.length).toBe(2);
  });

  it("treats all fixture files as in-scope (no node_modules in realpath)", () => {
    const project = loadFixtureProject();
    for (const f of project.ts.getSourceFiles()) {
      expect(isInScope(f.getFilePath())).toBe(true);
    }
  });

  it("reload() replaces the project without throwing", () => {
    const project = loadFixtureProject();
    const before = project.ts.getSourceFiles().length;
    project.reload();
    expect(project.ts.getSourceFiles().length).toBe(before);
  });
});
