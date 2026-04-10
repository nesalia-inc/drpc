"use client";

import { useState } from "react";
import type { User } from "@/app/shared/types";
import { client } from "@/app/lib/client";

interface CreateUserFormProps {
  onCreated: (user: User) => void;
}

export function CreateUserForm({ onCreated }: CreateUserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await client.users.create({ name, email });

    if (result.ok) {
      onCreated(result.value);
      setName("");
      setEmail("");
    } else {
      setError(result.error.message);
    }

    setLoading(false);
  };

  return (
    <section>
      <h2>Create User</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>
          Error: {error}
        </div>
      )}
    </section>
  );
}
