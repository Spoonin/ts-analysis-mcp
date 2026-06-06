import { Module } from "../nest-stubs";
import { UsersController } from "./users.controller";
import { UserService } from "./user.service";

// decorator-metadata: UserService / UsersController appear as values inside
// the @Module decorator's argument arrays.
@Module({
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
