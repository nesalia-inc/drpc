/**
 * Example 02: Nested Routers
 *
 * Demonstrates:
 * - Organizing procedures in nested router structure
 * - Deep nesting (api.v1.users.list)
 * - Router flattening utilities
 */

import { createAPI, flattenRouter, getPublicRoutes } from "../src/index.js";
import { createQueryBuilder } from "../src/query/index.js";
import { ok } from "@deessejs/fp";
import { z } from "zod";

// ============================================
// 1. Create QueryBuilder
// ============================================

interface Context {
  version: string;
}

const t = createQueryBuilder<Context>();

// ============================================
// 2. Define nested router structure
// ============================================

// API v1 - Users
const usersRouter = t.router({
  list: t.query({ handler: async () => ok([]) }),
  get: t.query({
    args: z.object({ id: z.string() }),
    handler: async (_, args) => ok({ id: args.id, name: "User" }),
  }),
  create: t.mutation({
    args: z.object({ name: z.string() }),
    handler: async (_, args) => ok({ id: "1", name: args.name }),
  }),
});

// API v1 - Posts
const postsRouter = t.router({
  list: t.query({ handler: async () => ok([]) }),
  get: t.query({
    args: z.object({ id: z.string() }),
    handler: async (_, args) => ok({ id: args.id, title: "Post" }),
  }),
});

// API v1 router
const v1Router = t.router({
  users: usersRouter,
  posts: postsRouter,
});

// Root router
const router = t.router({
  api: t.router({
    v1: v1Router,
  }),
});

// ============================================
// 3. Create API
// ============================================

const api = createAPI({
  router,
  context: { version: "v1" },
});

// ============================================
// 4. Access nested procedures
// ============================================

async function main() {
  // Deep nesting: api.api.v1.users.list()
  const users = await api.api.v1.users.list();
  console.log("V1 Users:", users);

  // api.api.v1.posts.get({ id: "1" })
  const post = await api.api.v1.posts.get({ id: "1" });
  console.log("Post:", post);

  // TypeScript knows the type at each level
  // api.api.v1.users -> { list, get, create }
  // api.api.v1.users.list -> () => Promise<Result<User[]>>

  // ============================================
  // 5. Router utilities
  // ============================================

  // flattenRouter: Converts nested router to flat array of { path, procedure }
  const flat = flattenRouter(router);
  console.log("\nFlattened routes:");
  flat.forEach((r) => console.log(" -", r.path));

  // getPublicRoutes: Filters to only public queries and mutations
  const publicRoutes = getPublicRoutes(router);
  console.log("\nPublic routes only:");
  publicRoutes.forEach((r) => console.log(" -", r.path, "- type:", r.procedure.type));
}

main();
