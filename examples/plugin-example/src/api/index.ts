/**
 * @deessejs/server API with Plugin System Demo
 *
 * This file demonstrates the complete plugin system in @deessejs/server:
 *
 * 1. DEFINE BASE CONTEXT (AppContext):
 *    Define the base context type that all plugins will extend.
 *    This includes properties that exist BEFORE any plugins are applied.
 *
 * 2. CREATE PLUGINS:
 *    Define plugins with `name` and `extend` properties.
 *    - `name`: unique identifier for debugging/logging
 *    - `extend(ctx)`: returns properties to merge into the context
 *
 * 3. USE defineContext WITH plugins ARRAY:
 *    Pass plugins to defineContext - they are applied per-request
 *    when createHandlerContext() merges them into the context.
 *
 * 4. HANDLERS AUTOMATICALLY GET EXTENDED CONTEXT:
 *    All procedure handlers receive the full context including
 *    properties from ALL plugins.
 *
 * PLUGIN EXECUTION ORDER:
 * Plugins are applied in the order they are listed (left to right).
 * Each plugin's `extend` receives the context AFTER previous plugins
 * have been applied, so plugins can depend on each other.
 */

import { defineContext, createPublicAPI, ok, err } from "@deessejs/server";
import { error } from "@deessejs/fp";
import type { RequestInfo } from "@deessejs/server";
import { z } from "zod";

// ============================================================
// Plugins (must be imported BEFORE defineContext)
// ============================================================

import { authPlugin } from "@/plugins/auth";
import { cachePlugin } from "@/plugins/cache";

// ============================================================
// Mock Database
// ============================================================

/**
 * User entity in our mock database.
 */
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

/**
 * Post entity in our mock database.
 */
interface Post {
  id: number;
  title: string;
  content: string;
  authorId: number;
}

/**
 * Mock database - persists in memory for the lifetime of the server.
 */
const db = {
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
// Base Context Type
// ============================================================

/**
 * Request info passed from the HTTP adapter (Next.js, Hono, etc.).
 * Contains headers, method, and URL for per-request context creation.
 */

/**
 * AppContext - The full context type available in all procedure handlers.
 *
 * This is the UNION of:
 * - Base context properties (db, requestInfo)
 * - Properties added by authPlugin (userId, isAuthenticated, requireAuth)
 * - Properties added by cachePlugin (cache)
 *
 * TypeScript ensures that ALL properties referenced in plugins' `extend`
 * functions are present in this type definition.
 */
interface AppContext {
  /** Base context - our mock database */
  db: typeof db;

  /** Base context - request metadata for per-request context creation */
  requestInfo: RequestInfo;

  // --- Auth plugin properties ---
  /** Auth plugin - user ID extracted from Authorization header, null if not authenticated */
  userId: number | null;

  /** Auth plugin - convenience flag, true when userId is not null */
  isAuthenticated: boolean;

  /** Auth plugin - throws UnauthorizedException if user is not authenticated */
  requireAuth: () => void;

  // --- Cache plugin properties ---
  /** Cache plugin - helper object for in-memory caching */
  cache: {
    get: <T = unknown>(key: string) => T | undefined;
    set: <T = unknown>(key: string, value: T, ttl?: number) => void;
    del: (key: string) => void;
    clear: () => void;
  };
}

// ============================================================
// Re-export plugins for use in route files
// ============================================================
// Route files need to know the Plugin type, especially if they
// want to add type-safe handlers. We re-export them here.
export { authPlugin, cachePlugin };
export type { AppContext };

// ============================================================
// Token Extraction Helper
// ============================================================

/**
 * Extract user ID from Authorization header.
 *
 * Expected format: "Bearer <userId>"
 * Examples:
 *   - "Bearer 1" -> userId: 1 (Alice, admin)
 *   - "Bearer 2" -> userId: 2 (Bob, user)
 *   - "Bearer 999" -> userId: null (invalid)
 *   - No header -> userId: null (anonymous)
 *
 * In a production app, you would validate a JWT or session token here.
 */
function extractUserIdFromHeader(authHeader: string | undefined): number | null {
  if (!authHeader) return null;

  // Expected format: "Bearer <userId>"
  const match = authHeader.match(/^Bearer\s+(\d+)$/);
  if (!match) return null;

  const userId = parseInt(match[1], 10);
  if (isNaN(userId)) return null;

  // Verify user exists in database
  const user = db.users.find((u) => u.id === userId);
  return user ? userId : null;
}

// ============================================================
// Define Context with Plugins
// ============================================================

/**
 * defineContext creates the tRPC-like builder (t) and createAPI function.
 *
 * The plugins array is passed here - plugins are applied per-request
 * when the API handles incoming requests.
 *
 * PLUGIN APPLICATION:
 * 1. createContext() is called with requestInfo (per-request)
 * 2. Base context is created with db and userId from header
 * 3. For each plugin in order, its extend() is called
 * 4. All extended properties are merged into the final context
 * 5. The merged context is passed to procedure handlers
 *
 * The order matters: later plugins can use properties from earlier plugins.
 * Here, cache plugin is independent, but auth plugin depends on requestInfo
 * which is set in the base context.
 */
const { t, createAPI } = defineContext({
  /**
   * Base context - also serves as defaults for plugin-extended properties.
   * Properties like userId (added by auth plugin) start as null here,
   * then authPlugin.extend() re-adds them with actual values.
   */
  context: {
    db,
    requestInfo: { headers: {}, method: "GET", url: "/" },
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

  /**
   * Per-request context factory.
   * Called for each incoming request to extract request-specific data.
   * In this case, we extract userId from the Authorization header.
   */
  createContext: (requestInfo?: RequestInfo): AppContext => {
    const userId = extractUserIdFromHeader(requestInfo?.headers?.authorization ?? undefined);

    return {
      db,
      requestInfo: requestInfo ?? { headers: {}, method: "GET", url: "/" },

      // Auth plugin values (replicated here as defaults, then extended by authPlugin)
      userId,
      isAuthenticated: userId !== null,
      requireAuth: () => {
        if (userId === null) {
          throw new Error("Unauthorized");
        }
      },

      // Cache plugin values (replicated here as defaults, then extended by cachePlugin)
      cache: {
        get: () => undefined,
        set: () => {},
        del: () => {},
        clear: () => {},
      },
    };
  },

  /**
   * Plugins array - these extend the context per-request.
   *
   * Order of application:
   * 1. authPlugin runs first, adds userId, isAuthenticated, requireAuth
   * 2. cachePlugin runs second, adds cache helper object
   *
   * Since plugins are applied AFTER createContext, they have access
   * to the per-request context (including userId from headers).
   */
  plugins: [authPlugin, cachePlugin],
});

// ============================================================
// Define Procedures - User Routes
// ============================================================

/**
 * Query: List all users (public - no auth required)
 *
 * Demonstrates:
 * - Using ctx.cache.get/set for caching
 * - Accessing ctx.isAuthenticated (always false for anonymous)
 */
const listUsers = t.query({
  handler: async (ctx) => {
    const cacheKey = "users:list";

    // Try to get from cache first
    const cached = ctx.cache.get<User[]>(cacheKey);
    if (cached) {
      console.log("[users.list] Cache hit");
      return ok(cached);
    }

    console.log("[users.list] Cache miss, fetching from DB");
    const users = [...ctx.db.users];

    // Cache for 10 seconds
    ctx.cache.set(cacheKey, users, 10 * 1000);

    return ok(users);
  },
});

/**
 * Query: Get user by ID (public - no auth required)
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
 * Mutation: Create a new user (requires authentication)
 *
 * Demonstrates:
 * - Using ctx.requireAuth() guard
 * - Using ctx.userId to associate the new user with the creator
 */
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    // Auth guard - throws UnauthorizedException if not authenticated
    ctx.requireAuth();

    console.log(`[users.create] Creating user by authenticated user: ${ctx.userId}`);

    // Check for email conflict
    const existing = ctx.db.users.find((u) => u.email === args.email);
    if (existing) {
      return err(error({ name: "CONFLICT", message: () => `Email ${args.email} already in use` })({}));
    }

    const newUser: User = {
      id: ctx.db.nextUserId++,
      name: args.name,
      email: args.email,
      role: "user",
    };

    ctx.db.users.push(newUser);

    // Invalidate users list cache
    ctx.cache.del("users:list");

    return ok(newUser);
  },
});

/**
 * Mutation: Delete a user (requires authentication + admin role)
 *
 * Demonstrates:
 * - Using ctx.userId to check role
 * - Cache invalidation
 */
const deleteUser = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // Auth guard
    ctx.requireAuth();

    // Admin-only check (in a real app, you'd check ctx.user.role)
    const currentUser = ctx.db.users.find((u) => u.id === ctx.userId);
    if (currentUser?.role !== "admin") {
      return err(error({ name: "FORBIDDEN", message: () => "Admin role required to delete users" })({}));
    }

    const index = ctx.db.users.findIndex((u) => u.id === args.id);
    if (index === -1) {
      return err(error({ name: "NOT_FOUND", message: () => `User ${args.id} not found` })({}));
    }

    ctx.db.users.splice(index, 1);

    // Invalidate cache
    ctx.cache.del("users:list");

    return ok({ deleted: true });
  },
});

// ============================================================
// Define Procedures - Post Routes
// ============================================================

/**
 * Query: List all posts (public - no auth required)
 *
 * Demonstrates:
 * - Using cache with longer TTL
 * - Cache invalidation on create
 */
const listPosts = t.query({
  handler: async (ctx) => {
    const cacheKey = "posts:list";

    const cached = ctx.cache.get<Post[]>(cacheKey);
    if (cached) {
      console.log("[posts.list] Cache hit");
      return ok(cached);
    }

    console.log("[posts.list] Cache miss, fetching from DB");
    const posts = [...ctx.db.posts];

    // Cache for 5 seconds
    ctx.cache.set(cacheKey, posts, 5 * 1000);

    return ok(posts);
  },
});

/**
 * Query: Get post by ID (public - no auth required)
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
 * Mutation: Create a new post (requires authentication)
 *
 * Demonstrates:
 * - Using ctx.userId to set authorId
 * - Cache invalidation on write
 */
const createPost = t.mutation({
  args: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
  handler: async (ctx, args) => {
    // Auth guard
    ctx.requireAuth();

    console.log(`[posts.create] Creating post by user: ${ctx.userId}`);

    const newPost: Post = {
      id: ctx.db.nextPostId++,
      title: args.title,
      content: args.content,
      authorId: ctx.userId!,
    };

    ctx.db.posts.push(newPost);

    // Invalidate posts list cache
    ctx.cache.del("posts:list");

    return ok(newPost);
  },
});

/**
 * Mutation: Delete a post (requires authentication + admin role)
 */
const deletePost = t.mutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    ctx.requireAuth();

    const currentUser = ctx.db.users.find((u) => u.id === ctx.userId);
    if (currentUser?.role !== "admin") {
      return err(error({ name: "FORBIDDEN", message: () => "Admin role required to delete posts" })({}));
    }

    const index = ctx.db.posts.findIndex((p) => p.id === args.id);
    if (index === -1) {
      return err(error({ name: "NOT_FOUND", message: () => `Post ${args.id} not found` })({}));
    }

    ctx.db.posts.splice(index, 1);

    // Invalidate cache
    ctx.cache.del("posts:list");

    return ok({ deleted: true });
  },
});

// ============================================================
// Create Routers
// ============================================================

/**
 * Root router - combines all sub-routers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appRouter = {
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
// Create API Instances
// ============================================================

/**
 * Full API - exposes ALL procedures including internal ones.
 * Use this for server-to-server communication.
 */
export const api = createAPI({
  router: appRouter,
});

/**
 * Public API - exposes only query and mutation procedures.
 * This is what you expose via HTTP to clients.
 */
export const publicAPI = createPublicAPI(api);

// Type export for client-side type inference
export type AppRouter = typeof appRouter;
