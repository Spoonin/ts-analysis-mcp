import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { AmbientProject } from "../../src/project/ambient-project.js";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to a fixture's directory. */
export function fixtureDir(name: string): string {
  return resolve(here, "..", "fixtures", name);
}

/** Absolute path to a fixture's tsconfig.json. */
export function fixtureTsconfig(name: string): string {
  return resolve(fixtureDir(name), "tsconfig.json");
}

/** Load a fixture project as an AmbientProject. */
export function loadFixtureProject(name = "nest-app"): AmbientProject {
  return new AmbientProject(fixtureTsconfig(name));
}

/**
 * Copy a fixture into a throwaway temp dir and load it, so a test can mutate
 * source files on disk without polluting the repo. Returns the project, the
 * temp root, and a `cleanup()` that removes the temp dir.
 */
export function loadTempFixtureProject(name = "nest-app"): {
  project: AmbientProject;
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(resolve(tmpdir(), `ts-analysis-${name}-`));
  cpSync(fixtureDir(name), root, { recursive: true });
  const project = new AmbientProject(resolve(root, "tsconfig.json"));
  return {
    project,
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
