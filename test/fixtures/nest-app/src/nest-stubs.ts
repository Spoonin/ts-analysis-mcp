/**
 * Minimal stand-ins for @nestjs/common decorators so the fixture compiles
 * without pulling real NestJS dependencies. Shape mirrors the real ones
 * closely enough for AST/decorator analysis.
 */
export function Injectable(): ClassDecorator {
  return () => {};
}

export function Controller(_prefix?: string): ClassDecorator {
  return () => {};
}

export interface ModuleMetadata {
  controllers?: unknown[];
  providers?: unknown[];
  imports?: unknown[];
  exports?: unknown[];
}

export function Module(_metadata: ModuleMetadata): ClassDecorator {
  return () => {};
}

export function Get(_path?: string): MethodDecorator {
  return () => {};
}

export function Inject(_token?: unknown): ParameterDecorator {
  return () => {};
}
