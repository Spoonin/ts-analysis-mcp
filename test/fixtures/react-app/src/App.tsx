import { UserList, Button } from "./components";
import type { User } from "./types";

const mockUsers: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

export function App(): JSX.Element {
  return (
    <div>
      <h2>My App</h2>
      <UserList users={mockUsers} />
      <Button label="Add User" onClick={() => {}} variant="primary" />
    </div>
  );
}
