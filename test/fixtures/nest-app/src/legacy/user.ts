/** A second symbol named `User` (a type alias) in a different file, so that
 *  resolving the name `User` is ambiguous — exercises Symbol Resolution
 *  returning multiple matches. */
export type User = {
  id: string;
  displayName: string;
};
