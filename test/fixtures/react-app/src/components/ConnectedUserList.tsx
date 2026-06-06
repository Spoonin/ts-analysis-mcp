import { useSelector, useDispatch, useEffect, useCallback } from "../react-stubs";
import { UserList } from "./UserList";
import type { User } from "../types";

export function ConnectedUserList(): JSX.Element {
  const users = useSelector((state: { users: { list: User[] } }) => state.users.list);
  const loading = useSelector((state: { users: { loading: boolean } }) => state.users.loading);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch({ type: "users/fetch" });
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch({ type: "users/fetch" });
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  return <UserList users={users} />;
}
