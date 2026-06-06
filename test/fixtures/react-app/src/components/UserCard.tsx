import { Button } from "./Button";
import type { User } from "../types";

interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
}

export const UserCard = ({ user, onSelect }: UserCardProps): JSX.Element => {
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <Button label="View" onClick={() => onSelect?.(user)} />
    </div>
  );
};
