/**
 * User Routes
 *
 * This file demonstrates how to define procedures using the QueryBuilder (t).
 *
 * KEY CONCEPTS DEMONSTRATED:
 *
 * 1. CONTEXT EXTENSION BY PLUGINS:
 *    All handlers receive the FULL context including properties from all plugins:
 *    - ctx.userId: number | null (from auth plugin)
 *    - ctx.isAuthenticated: boolean (from auth plugin)
 *    - ctx.requireAuth(): () => void (from auth plugin)
 *    - ctx.cache: { get, set, del, clear } (from cache plugin)
 *
 * 2. CACHING WITH ctx.cache:
 *    Use ctx.cache.get(key) and ctx.cache.set(key, value, ttl) to cache results.
 *    The cache persists across requests and supports TTL for automatic expiration.
 *
 * 3. AUTH GUARDS:
 *    Use ctx.requireAuth() to protect procedures that require authentication.
 *    It throws UnauthorizedException if the user is not authenticated.
 *
 * FACTORY FUNCTION PATTERN:
 * We use a factory function to accept the QueryBuilder, avoiding circular
 * imports. The factory is called in api/index.ts after defineContext creates t.
 */

// import type { QueryBuilder, AppContext } from "@/api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// export function createUserRoutes(t: QueryBuilder<AppContext>) {
  // // Query: List all users (public - no auth required)
  // const listUsers = t.query({
  //   name: "users.list",
  //   handler: async (ctx) => {
  //     // Check cache first (5 second TTL)
  //     const cacheKey = "users:list";
  //     const cached = ctx.cache.get<User[]>(cacheKey);
  //     if (cached) {
  //       console.log("[users.list] Cache hit");
  //       return ok(cached);
  //     }
  //
  //     console.log("[users.list] Cache miss, querying DB");
  //     const users = [...ctx.db.users];
  //
  //     // Cache for 5 seconds
  //     ctx.cache.set(cacheKey, users, 5 * 1000);
  //
  //     return ok(users);
  //   },
  // });
  //
  // // Query: Get user by ID (public - no auth required)
  // const getUser = t.query({
  //   name: "users.get",
  //   args: z.object({ id: z.number() }),
  //   handler: async (ctx, args) => {
  //     const user = ctx.db.users.find((u) => u.id === args.id);
  //     if (!user) {
  //       return err(NotFoundError({ resource: "User", id: args.id }));
  //     }
  //     return ok(user);
  //   },
  // });
  //
  // // Mutation: Create user (requires auth)
  // const createUser = t.mutation({
  //   name: "users.create",
  //   args: z.object({
  //     name: z.string().min(1),
  //     email: z.string().email(),
  //   }),
  //   handler: async (ctx, args) => {
  //     // Auth guard - throws if not authenticated
  //     ctx.requireAuth();
  //
  //     // Check for email conflict
  //     const existing = ctx.db.users.find((u) => u.email === args.email);
  //     if (existing) {
  //       return err(ConflictError({ field: "email", value: args.email }));
  //     }
  //
  //     const user = {
  //       id: ctx.db.nextUserId++,
  //       name: args.name,
  //       email: args.email,
  //       role: "user" as const,
  //     };
  //     ctx.db.users.push(user);
  //
  //     // Invalidate cache
  //     ctx.cache.del("users:list");
  //
  //     return ok(user);
  //   },
  // });
  //
  // // Mutation: Delete user (requires admin)
  // const deleteUser = t.mutation({
  //   name: "users.delete",
  //   args: z.object({ id: z.number() }),
  //   handler: async (ctx, args) => {
  //     ctx.requireAuth();
  //
  //     // Check admin role
  //     const user = ctx.db.users.find((u) => u.id === ctx.userId);
  //     if (user?.role !== "admin") {
  //       return err(ForbiddenError({}));
  //     }
  //
  //     const index = ctx.db.users.findIndex((u) => u.id === args.id);
  //     if (index === -1) {
  //       return err(NotFoundError({ resource: "User", id: args.id }));
  //     }
  //
  //     ctx.db.users.splice(index, 1);
  //     ctx.cache.del("users:list");
  //
  //     return ok({ deleted: true });
  //   },
  // });
  //
  // return { list: listUsers, get: getUser, create: createUser, delete: deleteUser };
// }
