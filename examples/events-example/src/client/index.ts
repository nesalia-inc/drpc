/**
 * Client Setup
 *
 * This module demonstrates how a client application would
 * interact with the API. In a real application, this would
 * use an HTTP client to make requests to the server.
 *
 * For this example, we reuse the same executor for demonstration.
 * In production, you would use fetch or an HTTP client to
 * communicate with your server.
 */

import { api } from "../server";

// Re-export types for client usage
export type { AppRouter } from "../server/routers";

// Client API interface - describes what the client can call
export interface ClientAPI {
  users: {
    list: () => Promise<{ id: number; name: string; email: string }[]>;
    get: (args: { id: number }) => Promise<{ id: number; name: string; email: string } | null>;
    create: (args: { name: string; email: string }) => Promise<{ id: number; name: string; email: string }>;
    update: (args: { id: number; name?: string; email?: string }) => Promise<{ id: number; name: string; email: string }>;
    delete: (args: { id: number }) => Promise<{ deleted: boolean; id: number }>;
  };
}

// Helper function to create a client that wraps the executor
// In a real application, this would make HTTP requests instead
export function createClient(): ClientAPI {
  return {
    users: {
      list: async () => {
        const result = await api.execute("users.list", {});
        if (!result.ok) {
          throw new Error(`Failed to list users: ${result.error}`);
        }
        return result.value as { id: number; name: string; email: string }[];
      },
      get: async (args) => {
        const result = await api.execute("users.get", args);
        if (!result.ok) {
          return null;
        }
        return result.value as { id: number; name: string; email: string };
      },
      create: async (args) => {
        const result = await api.execute("users.create", args);
        if (!result.ok) {
          throw new Error(`Failed to create user: ${result.error}`);
        }
        return result.value as { id: number; name: string; email: string };
      },
      update: async (args) => {
        const result = await api.execute("users.update", args);
        if (!result.ok) {
          throw new Error(`Failed to update user: ${result.error}`);
        }
        return result.value as { id: number; name: string; email: string };
      },
      delete: async (args) => {
        const result = await api.execute("users.delete", args);
        if (!result.ok) {
          throw new Error(`Failed to delete user: ${result.error}`);
        }
        return result.value as { deleted: boolean; id: number };
      },
    },
  };
}
