"use client";

import type { User } from "@/app/shared/types";

interface UserDetailProps {
  user: User;
  onClose: () => void;
}

export function UserDetail({ user, onClose }: UserDetailProps) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2>Selected User</h2>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>Name:</strong> {user.name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <button onClick={onClose}>Close</button>
    </section>
  );
}
