import { describe, expect, it } from "vitest";
import type { ClassDeclaration } from "ts-morph";
import { loadFixtureProject } from "./helpers/load-fixture.js";
import { projectSymbol } from "../src/projection/symbol-projection.js";

function getClass(name: string): ClassDeclaration {
  const project = loadFixtureProject();
  const decl = project.ts
    .getSourceFiles()
    .map((f) => f.getClass(name))
    .find((c): c is ClassDeclaration => !!c);
  if (!decl) throw new Error(`class ${name} not found`);
  return decl;
}

describe("Stage 1 — projectSymbol", () => {
  it("projects a class: kind, name, decorators, heritage", () => {
    const p = projectSymbol(getClass("UserService"));
    expect(p.kind).toBe("ClassDeclaration");
    expect(p.name).toBe("UserService");
    expect(p.decorators).toContain("Injectable()");
    expect(p.heritage).toContain("implements Logger");
  });

  it("captures decorator argument text", () => {
    const p = projectSymbol(getClass("UsersController"));
    expect(p.decorators).toContain('Controller("users")');
  });

  it("does not duplicate decorators inside modifiers (review #1)", () => {
    const p = projectSymbol(getClass("UserService"));
    expect(p.decorators).toContain("Injectable()");
    expect(p.modifiers).toContain("export");
    // The decorator must NOT leak into modifiers.
    expect(p.modifiers.some((m) => m.includes("Injectable"))).toBe(false);
  });

  it("names the constructor member instead of <anonymous> (review #4)", () => {
    const p = projectSymbol(getClass("UsersController"));
    const ctor = p.members.find((m) => m.kind === "Constructor");
    expect(ctor?.name).toBe("constructor");
  });

  it("projects member-level decorators (review #5)", () => {
    const p = projectSymbol(getClass("UsersController"));
    const getOne = p.members.find((m) => m.name === "getOne");
    expect(getOne?.decorators).toContain('Get(":id")');
    // A plain member has an empty decorator list, not undefined.
    const svcMembers = projectSymbol(getClass("UserService")).members;
    expect(svcMembers.find((m) => m.name === "findOne")?.decorators).toEqual([]);
  });

  it("projects members with dual Type Rendering (declared + resolved)", () => {
    const p = projectSymbol(getClass("UserService"));
    const findOne = p.members.find((m) => m.name === "findOne");
    expect(findOne).toBeDefined();
    expect(findOne!.kind).toBe("MethodDeclaration");
    // declared form preserves what was written
    expect(findOne!.signature.declared).toBe("Promise<User | undefined>");
    // resolved form comes from the checker (also a Promise of User|undefined)
    expect(findOne!.signature.resolved).toContain("Promise");
  });

  it("projects an enum's members", () => {
    const project = loadFixtureProject();
    const en = project.ts
      .getSourceFiles()
      .map((f) => f.getEnum("UserRole"))
      .find((e) => !!e)!;
    const p = projectSymbol(en);
    expect(p.kind).toBe("EnumDeclaration");
    expect(p.members.map((m) => m.name).sort()).toEqual(["Admin", "Member"]);
  });

  it("projects an interface's members", () => {
    const project = loadFixtureProject();
    const iface = project.ts
      .getSourceFiles()
      .map((f) => f.getInterface("Logger"))
      .find((i) => !!i)!;
    const p = projectSymbol(iface);
    expect(p.kind).toBe("InterfaceDeclaration");
    expect(p.members.map((m) => m.name).sort()).toEqual(["error", "log"]);
  });

  it("omits source by default, includes it on request", () => {
    const cls = getClass("UsersController");
    expect(projectSymbol(cls).source).toBeUndefined();
    const withSrc = projectSymbol(cls, { includeSource: true });
    expect(withSrc.source).toContain("class UsersController");
  });
});
