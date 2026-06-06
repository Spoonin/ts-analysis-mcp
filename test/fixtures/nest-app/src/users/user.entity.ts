/** Enum — exercises projection of enum members. */
export enum UserRole {
  Admin = "admin",
  Member = "member",
}

/** Plain domain class. Note: the name `User` also appears as a type alias
 *  in user.service.ts to exercise ambiguous Symbol Resolution. */
export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public role: UserRole,
  ) {}
}
