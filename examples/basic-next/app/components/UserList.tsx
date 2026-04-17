"use client";

import { useState } from "react";
import type { User } from "@/app/shared/types";
import { client } from "@/app/lib/client";

interface UserListProps {
  initialUsers: User[];
  onSelect: (user: User) => void;
}

export function UserList({ initialUsers, onSelect }: UserListProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const result = await client.users.list();
    if (result.ok) {
      setUsers(result.value);
    }
    setLoading(false);
  };

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2>Users</h2>
      <button onClick={refresh} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <button onClick={() => onSelect(user)}>
              {user.name} ({user.email})
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
