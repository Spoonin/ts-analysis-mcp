import { Project } from "ts-morph";

/**
 * CONTEXT.md › Ambient Project (ADR 0001).
 *
 * A single ts-morph Project, initialized once at startup and shared by every
 * tool for the whole server session. `reload()` is the only invalidation in
 * MVP (no file watcher).
 */
export class AmbientProject {
  private project: Project;

  constructor(private readonly tsconfigPath: string) {
    this.project = this.load();
  }

  private load(): Project {
    // fail-open: a project with compile errors still loads and answers.
    return new Project({
      tsConfigFilePath: this.tsconfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  }

  /** The live ts-morph Project. */
  get ts(): Project {
    return this.project;
  }

  /** Re-read tsconfig and all source files. Replaces the in-memory project. */
  reload(): void {
    this.project = this.load();
  }
}
