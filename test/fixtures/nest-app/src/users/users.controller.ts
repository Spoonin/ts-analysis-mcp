import { Controller, Get } from "../nest-stubs";
import { UserService } from "./user.service";
import type { User } from "./user.entity";

@Controller("users")
export class UsersController {
  // constructor-injection: UserService appears as a constructor parameter type.
  constructor(private readonly userService: UserService) {}

  @Get(":id")
  getOne(id: string): Promise<User | undefined> {
    return this.userService.findOne(id);
  }
}
