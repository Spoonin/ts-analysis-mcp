import { Injectable } from "../nest-stubs";
import type { Logger } from "../shared/logger.interface";
import { User, UserRole } from "./user.entity";

@Injectable()
export class UserService implements Logger {
  private readonly users: User[] = [];

  log(message: string): void {
    console.log(`[users] ${message}`);
  }

  error(message: string, trace?: string): void {
    console.error(`[users] ${message}`, trace ?? "");
  }

  findOne(id: string): Promise<User | undefined> {
    return Promise.resolve(this.users.find((u) => u.id === id));
  }

  update(id: string, patch: Partial<Pick<User, "name" | "role">>): Promise<User> {
    const user = new User(id, patch.name ?? "", patch.role ?? UserRole.Member);
    return Promise.resolve(user);
  }
}
