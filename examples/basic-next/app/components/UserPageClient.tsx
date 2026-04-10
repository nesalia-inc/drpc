"use client";

import { useState } from "react";
import type { User } from "@/app/shared/types";
import { UserList } from "@/app/components/UserList";
import { UserDetail } from "@/app/components/UserDetail";
import { CreateUserForm } from "@/app/components/CreateUserForm";
import { ErrorBanner } from "@/app/components/ErrorBanner";

interface UserPageClientProps {
  initialUsers: User[];
}

export function UserPageClient({ initialUsers }: UserPageClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUserCreated = (user: User) => {
    setUsers([...users, user]);
  };

  return (
    <>
      <ErrorBanner message={error} />

      <UserList
        initialUsers={users}
        onSelect={(user) => setSelectedUser(user)}
      />

      {selectedUser && (
        <UserDetail
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <CreateUserForm onCreated={handleUserCreated} />
    </>
  );
}
