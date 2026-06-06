import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { AmbientProject } from "../../src/project/ambient-project.js";

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to a fixture's tsconfig.json. */
export function fixtureTsconfig(name: string): string {
  return resolve(here, "..", "fixtures", name, "tsconfig.json");
}

/** Load a fixture project as an AmbientProject. */
export function loadFixtureProject(name = "nest-app"): AmbientProject {
  return new AmbientProject(fixtureTsconfig(name));
}
