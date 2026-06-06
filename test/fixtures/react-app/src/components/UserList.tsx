import { UserCard } from "./UserCard";
import { Button } from "./Button";
import type { User } from "../types";

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps): JSX.Element {
  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <UserCard user={u} />
          </li>
        ))}
      </ul>
      <Button label="Refresh" variant="secondary" />
    </div>
  );
}
