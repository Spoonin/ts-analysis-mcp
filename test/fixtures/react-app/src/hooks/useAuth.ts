import { useState, useEffect } from "../react-stubs";
import type { User } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
    setUser({ id: 1, name: "Alice", email: "alice@example.com" });
  }, []);

  return { user, loading };
}
