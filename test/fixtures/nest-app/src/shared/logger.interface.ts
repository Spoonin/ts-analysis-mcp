/** A contract implemented in the users module — exercises `heritage`. */
export interface Logger {
  log(message: string): void;
  error(message: string, trace?: string): void;
}
