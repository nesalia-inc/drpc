/**
 * Example 01: Basic Query and Mutation
 *
 * Demonstrates:
 * - Creating a QueryBuilder
 * - Defining queries and mutations
 * - Creating an API instance
 * - Calling procedures
 */

import { QueryBuilder, createAPI } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { ok } from "@deessejs/fp";
import { z } from "zod";

// ============================================
// 1. Define types
// ============================================

interface Context {
  db: { users: Array<{ id: string; name: string }> };
}

// ============================================
// 2. Create a QueryBuilder (no context needed here)
// ============================================

const t = createQueryBuilder<Context>();

// ============================================
// 2. Define procedures
// ============================================

// Query with no args
const listUsers = t.query({
  handler: async (ctx) => {
    return ok(ctx.db.users);
  },
});

// Query with args (validated via Zod)
const getUser = t.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find((u) => u.id === args.id);
    if (!user) {
      return ok(null);
    }
    return ok(user);
  },
});

// Mutation (same as query but for writes)
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const newUser = { id: String(ctx.db.users.length + 1), name: args.name };
    ctx.db.users.push(newUser);
    return ok(newUser);
  },
});

// ============================================
// 3. Create router and API
// ============================================

const router = t.router({
  users: {
    list: listUsers,
    get: getUser,
    create: createUser,
  },
});

const api = createAPI({
  router,
  context: {
    db: {
      users: [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
    },
  },
});

// ============================================
// 4. Call procedures (fully typed!)
// ============================================

async function main() {
  // api.users.list() -> Promise<Result<Array<{id: string, name: string}>>>
  const users = await api.users.list();
  console.log("Users:", users);

  // api.users.get({ id: "1" }) -> Promise<Result<{id: string, name: string} | null>>
  const user = await api.users.get({ id: "1" });
  console.log("User 1:", user);

  // api.users.create({ name: "Charlie" }) -> Promise<Result<{id: string, name: string}>>
  const newUser = await api.users.create({ name: "Charlie" });
  console.log("Created:", newUser);
}

main();
