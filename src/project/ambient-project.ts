import { statSync } from "node:fs";
import { Project } from "ts-morph";
import { isInScope } from "./scope.js";

/**
 * CONTEXT.md › Ambient Project (ADR 0001, ADR 0006).
 *
 * A single ts-morph Project, initialized once at startup and shared by every
 * tool for the whole server session. `ensureFresh()` performs lazy, incremental
 * invalidation (called before each query): it refreshes only the in-scope files
 * whose mtime changed, drops deleted files, and picks up newly added ones.
 * `reload()` remains the full-rebuild escape hatch.
 */
export class AmbientProject {
  private project: Project;
  /** Absolute in-scope source path → last-seen mtimeMs. */
  private mtimes = new Map<string, number>();

  constructor(private readonly tsconfigPath: string) {
    this.project = this.load();
    this.seedMtimes();
  }

  private load(): Project {
    // fail-open: a project with compile errors still loads and answers.
    return new Project({
      tsConfigFilePath: this.tsconfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  }

  /** Record current mtimes for every in-scope source file. */
  private seedMtimes(): void {
    this.mtimes.clear();
    for (const sf of this.project.getSourceFiles()) {
      const path = sf.getFilePath();
      if (!isInScope(path)) continue;
      this.rememberMtime(path);
    }
  }

  private rememberMtime(path: string): void {
    try {
      this.mtimes.set(path, statSync(path).mtimeMs);
    } catch {
      // Unreadable/just-deleted: leave it out so the next sweep treats it as gone.
      this.mtimes.delete(path);
    }
  }

  /** The live ts-morph Project. */
  get ts(): Project {
    return this.project;
  }

  /**
   * Lazy, incremental invalidation. Refresh in-scope files whose mtime changed,
   * drop deleted files, and add newly created ones. Fail-open: a single bad file
   * must never break a query.
   */
  ensureFresh(): void {
    // Modified / deleted sweep over already-loaded in-scope files.
    for (const sf of this.project.getSourceFiles()) {
      const path = sf.getFilePath();
      if (!isInScope(path)) continue;
      try {
        const mtime = statSync(path).mtimeMs;
        if (mtime !== this.mtimes.get(path)) {
          sf.refreshFromFileSystemSync();
          this.mtimes.set(path, mtime);
        }
      } catch {
        // Gone from disk (ENOENT) or unreadable: drop it from the project.
        try {
          sf.refreshFromFileSystemSync();
        } catch {
          // ignore — the file may already be detached
        }
        this.mtimes.delete(path);
      }
    }

    // Added sweep: re-glob the tsconfig. ts-morph dedupes existing files by path,
    // so only genuinely new files are parsed.
    try {
      const added = this.project.addSourceFilesFromTsConfig(this.tsconfigPath);
      for (const sf of added) {
        const path = sf.getFilePath();
        if (isInScope(path)) this.rememberMtime(path);
      }
    } catch {
      // tsconfig glob failure: keep serving the warm project.
    }
  }

  /** Re-read tsconfig and all source files. Replaces the in-memory project. */
  reload(): void {
    this.project = this.load();
    this.seedMtimes();
  }
}
