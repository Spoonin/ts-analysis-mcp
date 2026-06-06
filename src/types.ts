/**
 * Shared response types. These mirror the terms defined in CONTEXT.md —
 * keep them in sync with the glossary, not the other way around.
 */

/** CONTEXT.md › Result Page */
export interface ResultPage<T> {
  /** Up to `limit` items (default limit 50). */
  items: T[];
  /** Total number of matches found, even if `items` is truncated. */
  total: number;
  /** The limit that was applied to produce `items`. */
  limit: number;
}

/** CONTEXT.md › Type Rendering — every type/signature is given in both forms. */
export interface TypeRendering {
  /** Text as written in source (aliases / generic names / `keyof` preserved). */
  declared: string;
  /** Type as computed by the TypeScript checker (aliases & generics expanded). */
  resolved: string;
}

/** A member of a projected symbol (method, property, enum variant, …). */
export interface ProjectedMember {
  name: string;
  /** ts-morph SyntaxKind name, e.g. "MethodDeclaration". */
  kind: string;
  signature: TypeRendering;
  /** Member-level decorators with raw argument text, e.g. "Get(':id')". */
  decorators: string[];
}

/** CONTEXT.md › Symbol Projection — one generic shape for any symbol kind. */
export interface SymbolProjection {
  /** ts-morph SyntaxKind name of the declaration. */
  kind: string;
  name: string;
  file: string;
  line: number;
  modifiers: string[];
  /** Decorator names with raw argument text, e.g. "Controller('users')". */
  decorators: string[];
  /** extends / implements clauses. */
  heritage: string[];
  members: ProjectedMember[];
  /** Present only when the caller passes `include_source: true`. */
  source?: string;
}

/** CONTEXT.md › Reference Position — the coarse completeness axis. */
export type ReferencePosition =
  | "declaration"
  | "import-export"
  | "type"
  | "value";

/** CONTEXT.md › Reference Kind — closed enumeration, grouped by position. */
export type ReferenceKind =
  // declaration
  | "definition"
  // import-export
  | "import"
  | "export"
  // type
  | "constructor-injection"
  | "type-annotation"
  | "type-argument"
  | "heritage"
  // value
  | "instantiation"
  | "decorator"
  | "decorator-metadata"
  | "static-access"
  | "value-reference"
  // fallback
  | "other";

/** CONTEXT.md › Reference Position invariant: each ReferenceKind maps to exactly one position. */
export const REFERENCE_KIND_POSITION: Record<ReferenceKind, ReferencePosition> = {
  definition: "declaration",
  import: "import-export",
  export: "import-export",
  "constructor-injection": "type",
  "type-annotation": "type",
  "type-argument": "type",
  heritage: "type",
  instantiation: "value",
  decorator: "value",
  "decorator-metadata": "value",
  "static-access": "value",
  "value-reference": "value",
  other: "value",
};

/** CONTEXT.md › Reference — one usage site of a symbol. */
export interface Reference {
  file: string;
  line: number;
  column: number;
  /** Source text of the line containing the reference. */
  text: string;
  refKind: ReferenceKind;
  position: ReferencePosition;
}

/** CONTEXT.md › Decorator Match — result row from find_by_decorator. */
export interface DecoratorMatch {
  symbol: SymbolProjection;
  decoratorName: string;
  /** Raw source text of the decorator arguments, e.g. "'users'". */
  argsText: string;
}

/** CONTEXT.md › JSX Usage — one JSX render site of a component. */
export interface JsxUsage {
  /** Component name as used in JSX (may be aliased import name). */
  component: string;
  file: string;
  line: number;
  column: number;
  /** Enclosing function/class component name, or null if top-level. */
  parentComponent: string | null;
  /** Props as raw attribute text, e.g. ["label=\"View\"", "onClick={handleClick}"]. */
  props: string[];
  /** Whether <Foo /> (self-closing) vs <Foo>...</Foo>. */
  selfClosing: boolean;
}

/** CONTEXT.md › Export Info — one exported symbol from a module. */
export interface ExportInfo {
  /** Exported name (what consumers import). */
  name: string;
  /** Declaration kind, e.g. "ClassDeclaration", "FunctionDeclaration". */
  kind: string;
  /** File where the symbol is actually declared. */
  sourceFile: string;
  /** Line in the source file. */
  line: number;
  /** True if this file re-exports from another file. */
  isReExport: boolean;
}

/** CONTEXT.md › Hook Call — one hook invocation inside a component or custom hook. */
export interface HookCall {
  /** Hook function name, e.g. "useState", "useSelector", "useAuth". */
  hook: string;
  /** Raw argument text, e.g. "state => state.users.list" or "true". */
  args: string;
  line: number;
  /** Recursive chain — internal hooks of a custom hook (present when depth > 1). */
  chain?: HookCall[];
}

/** CONTEXT.md › Diagnostic. */
export interface DiagnosticInfo {
  file: string | null;
  line: number | null;
  category: "error" | "warning" | "suggestion" | "message";
  code: number;
  message: string;
}
