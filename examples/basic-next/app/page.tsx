/**
 * Main page - Server Component
 *
 * Fetches initial data on the server and renders client components.
 */

import { api } from "@/server/api";
import type { User } from "@/app/shared/types";
import { UserList } from "@/app/components/UserList";
import { UserDetail } from "@/app/components/UserDetail";
import { CreateUserForm } from "@/app/components/CreateUserForm";
import { ErrorBanner } from "@/app/components/ErrorBanner";
import { UserPageClient } from "@/app/components/UserPageClient";

// Server Component - fetches initial data
export default async function Home() {
  // Fetch initial users directly on the server (no HTTP needed)
  const initialResult = await api.users.list();
  const initialUsers: User[] = initialResult.ok ? initialResult.value : [];

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>@deessejs/server + Next.js Example</h1>

      {/* Client component handles all interactivity */}
      <UserPageClient initialUsers={initialUsers} />

      {/* API Examples */}
      <section
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <h3>API Endpoints</h3>
        <ul>
          <li>
            <code>POST /api/users.list</code> - List all users
          </li>
          <li>
            <code>POST /api/users.get</code> - Get user by ID
          </li>
          <li>
            <code>POST /api/users.create</code> - Create user
          </li>
        </ul>
        <p style={{ fontSize: "0.875rem", color: "#666" }}>
          Note: <code>users.count</code> (internal) is NOT exposed via HTTP
        </p>
      </section>
    </main>
  );
}
