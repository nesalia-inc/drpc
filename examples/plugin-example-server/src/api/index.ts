/**
 * @deessejs/server - Pure Server-Side Plugin Demo
 *
 * This file demonstrates the plugin system without any HTTP layer.
 * There is no createContext, no RequestInfo, no headers - just plain
 * TypeScript procedure definitions with plugins applied at call time.
 *
 * HOW IT WORKS (SERVER-ONLY):
 * 1. Define a base context with default values (userId: null = anonymous).
 * 2. Attach plugins to defineContext - they enrich the context on every call.
 * 3. Call procedures directly via api.users.list(), api.users.get({ id: 1 }), etc.
 * 4. To simulate an authenticated user, create a second API instance that
 *    has userId set in its base context (see src/examples/usage.ts).
 *
 * CONTRAST WITH HTTP USAGE:
 * In the HTTP version (plugin-example), createContext() is called per-request
 * and extracts the userId from the Authorization header. Here there is no
 * per-request concept - the context is fixed at API-creation time.
 */

import { defineContext, createAPI, ok, err } from "@deessejs/server";
import { error } from "@deessejs/fp";
import { z } from "zod";

// ============================================================
// Plugins - imported before defineContext
// ============================================================

import { authPlugin } from "../plugins/auth.js";
import { cachePlugin } from "../plugins/cache.js";

// ============================================================
// Mock Database
// ============================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

/**
 * In-memory database. Shared across all API instances and procedure calls
 * within the same process, so mutations (create, delete) are visible to
 * subsequent reads.
 */
export const db = {
  users: [
    { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin" as const },
    { id: 2, name: "Bob Smith", email: "bob@example.com", role: "user" as const },
    { id: 3, name: "Carol White", email: "carol@example.com", role: "user" as const },
  ] as User[],

  posts: [
    {
      id: 1,
      title: "Getting Started with Plugins",
      content: "Plugins extend the context in @deessejs/server...",
      authorId: 1,
    },
    {
      id: 2,
      title: "Advanced Auth Patterns",
      content: "Learn how to implement auth in your procedures...",
      authorId: 2,
    },
    {
      id: 3,
      title: "Caching Strategies",
      content: "How to use the cache plugin effectively...",
      authorId: 1,
    },
  ] as Post[],

  nextUserId: 4,
  nextPostId: 4,
};

// ============================================================
// Context Type
// ============================================================

/**
 * AppContext - the full context type seen by every procedure handler.
 *
 * It combines:
 *   - Base properties: db, userId (null = anonymous)
 *   - Auth plugin properties: isAuthenticated, requireAuth
 *   - Cache plugin properties: cache
 *
 * Unlike the HTTP version there is no `requestInfo` field because
 * there is no HTTP request to extract it from.
 */
export interface AppContext {
  /** Shared in-memory database */
  db: typeof db;

  // --- Auth plugin properties ---

  /** Current user ID. null means the call is anonymous / unauthenticated. */
  userId: number | null;

  /** Convenience flag - true when userId is not null. Set by authPlugin. */
  isAuthenticated: boolean;

  /** Guard - throws UnauthorizedException when userId is null. Set by authPlugin. */
  requireAuth: () => void;

  // --- Cache plugin properties ---

  /** In-memory cache helper. Attached by cachePlugin. */
  cache: {
    get: <T = unknown>(key: string) => T | undefined;
    set: <T = unknown>(key: string, value: T, ttl?: number) => void;
    del: (key: string) => void;
    clear: () => void;
  };
}

// ============================================================
// defineContext
// ============================================================

/**
 * Build the procedure builder (t) and a scoped createAPI helper.
 *
 * The base context has userId: null, meaning every API instance created
 * from this definition is anonymous by default. To get an authenticated
 * API instance pass a context with a real userId to createAPI() directly
 * (see usage.ts for an example).
 *
 * Plugins are applied on every procedure call:
 *   1. authPlugin  - derives isAuthenticated and requireAuth from userId
 *   2. cachePlugin - attaches the in-memory cache helper
 */
const { t, createAPI: createScopedAPI } = defineContext({
  context: {
    db,
    userId: null,
    isAuthenticated: false,
    requireAuth: () => {
      throw new Error("Unauthorized");
    },
    cache: {
      get: () => undefined,
      set: () => {},
      del: () => {},
      clear: () => {},
    },
  } as AppContext,

  plugins: [authPlugin, cachePlugin],
});

// ============================================================
// User Procedures
// ============================================================

/**
 * List all users - public, no authentication required.
 *
 * Demonstrates cache.get / cache.set usage.
 */
const listUsers = t.query({
  handler: async (ctx) => {
    const cacheKey = "users:list";

    const cached = ctx.cache.get<User[]>(cacheKey);
    if (cached) {
      console.log("  [cache] HIT  users:list");
      return ok(cached);
    }

    console.log("  [cache] MISS users:list - fetching from db");
    const users = [...ctx.db.users];
    ctx.cache.set(cacheKey, users, 10 * 1000);

    return ok(users);
  },
});

/**
 * Get a single user by ID - public, no authentication required.
 */
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find((u) => u.id === args.id);
    if (!user) {
      return err(error({ name: "NOT_FOUND", message: () => `User ${args.id} not found` })({}));
    }
    return ok(user);
  },
});

/**
 * Create a new user - requires authentication.
 *
 * Demonstrates ctx.requireAuth() and ctx.userId usage.
 */
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    // This will throw UnauthorizedException when userId is null.
    ctx.requireAuth();

    console.log(`  [db] Creating user, called by authenticated userId=${ctx.userId}`);

    const existing = ctx.db.users.find((u) => u.email === args.email);
    if (existing) {
      return err(
        error({ name: "CONFLICT", message: () => `Email ${args.email} is already in use` })({})
      );
    }

    const newUser: User = {
      id: ctx.db.nextUserId++,
      name: args.name,
      email: args.email,
      role: "user",
    };

    ctx.db.users.push(newUser);

    // Invalidate stale cache entry so the next list() call re-fetches.
    ctx.cache.del("users:list");

    return ok(newUser);
  },
});

/**
 * Delete a user - requires authentication and admin role.
 *
 * Demonstrates role-based access control on top of basic auth.
 */
const deleteUser = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    ctx.requireAuth();

    const currentUser = ctx.db.users.find((u) => u.id === ctx.userId);
    if (currentUser?.role !== "admin") {
      return err(
        error({ name: "FORBIDDEN", message: () => "Admin role required to delete users" })({})
      );
    }

    const index = ctx.db.users.findIndex((u) => u.id === args.id);
    if (index === -1) {
      return err(
        error({ name: "NOT_FOUND", message: () => `User ${args.id} not found` })({})
      );
    }

    ctx.db.users.splice(index, 1);
    ctx.cache.del("users:list");

    return ok({ deleted: true });
  },
});

// ============================================================
// Post Procedures
// ============================================================

/**
 * List all posts - public, no authentication required.
 */
const listPosts = t.query({
  handler: async (ctx) => {
    const cacheKey = "posts:list";

    const cached = ctx.cache.get<Post[]>(cacheKey);
    if (cached) {
      console.log("  [cache] HIT  posts:list");
      return ok(cached);
    }

    console.log("  [cache] MISS posts:list - fetching from db");
    const posts = [...ctx.db.posts];
    ctx.cache.set(cacheKey, posts, 5 * 1000);

    return ok(posts);
  },
});

/**
 * Get a single post by ID - public, no authentication required.
 */
const getPost = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const post = ctx.db.posts.find((p) => p.id === args.id);
    if (!post) {
      return err(error({ name: "NOT_FOUND", message: () => `Post ${args.id} not found` })({}));
    }
    return ok(post);
  },
});

/**
 * Create a new post - requires authentication.
 */
const createPost = t.mutation({
  args: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
  handler: async (ctx, args) => {
    ctx.requireAuth();

    console.log(`  [db] Creating post, called by authenticated userId=${ctx.userId}`);

    const newPost: Post = {
      id: ctx.db.nextPostId++,
      title: args.title,
      content: args.content,
      authorId: ctx.userId!,
    };

    ctx.db.posts.push(newPost);
    ctx.cache.del("posts:list");

    return ok(newPost);
  },
});

/**
 * Delete a post - requires authentication and admin role.
 */
const deletePost = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    ctx.requireAuth();

    const currentUser = ctx.db.users.find((u) => u.id === ctx.userId);
    if (currentUser?.role !== "admin") {
      return err(
        error({ name: "FORBIDDEN", message: () => "Admin role required to delete posts" })({})
      );
    }

    const index = ctx.db.posts.findIndex((p) => p.id === args.id);
    if (index === -1) {
      return err(
        error({ name: "NOT_FOUND", message: () => `Post ${args.id} not found` })({})
      );
    }

    ctx.db.posts.splice(index, 1);
    ctx.cache.del("posts:list");

    return ok({ deleted: true });
  },
});

// ============================================================
// Router
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const appRouter = {
  users: {
    list: listUsers as any,
    get: getUser as any,
    create: createUser as any,
    delete: deleteUser as any,
  },
  posts: {
    list: listPosts as any,
    get: getPost as any,
    create: createPost as any,
    delete: deletePost as any,
  },
} as any;

// ============================================================
// API Instances
// ============================================================

/**
 * Default (anonymous) API instance.
 *
 * All calls are made as an unauthenticated user (userId: null).
 * Public procedures (list, get) succeed; auth-guarded procedures fail.
 *
 * Use this as the baseline API in server components, background jobs,
 * or any place where there is no known user identity.
 */
export const api = createScopedAPI({ router: appRouter });

/**
 * Factory - create an API instance for a specific authenticated user.
 *
 * In a real application you would call this inside a server action or
 * server component after verifying the session, passing the resolved userId.
 *
 * Example:
 *   const session = await getSession();
 *   const userApi = createUserAPI(session.userId);
 *   const result = await userApi.users.create({ name, email });
 *
 * @param userId - The authenticated user's ID (must exist in the database)
 */
export function createUserAPI(userId: number) {
  return createAPI<AppContext, typeof appRouter>({
    router: appRouter,
    context: {
      db,
      userId,
      isAuthenticated: true,
      requireAuth: () => {},
      cache: {
        get: () => undefined,
        set: () => {},
        del: () => {},
        clear: () => {},
      },
    } as AppContext,
    plugins: [authPlugin, cachePlugin],
  });
}

// Re-export plugins so usage.ts can reference them without extra imports.
export { authPlugin, cachePlugin };

export type AppRouter = typeof appRouter;
