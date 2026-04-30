# RFC 07: Routers

## Summary

DRPC routers compose procedures into a namespaced tree. They provide hierarchical access to procedures (`api.users.list()`) and enable modular API design. Routers accept only procedures or sub-routers as values, never plain objects.

---

## Overview

### What Is a Router?

A router is a named collection of procedures or sub-routers. It creates a hierarchical namespace:

```typescript
const listUsers = d.query({ handler: async () => ok([]) });
const getUserById = d.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => ok(ctx.db.findUser(args.id)),
});
const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => ok(ctx.db.createUser(args)),
});

const listPosts = d.query({ handler: async () => ok([]) });
const getPostById = d.query({ handler: async (ctx, args) => ok(ctx.db.findPost(args.id)) });
const createPost = d.mutation({ handler: async (ctx, args) => ok(ctx.db.createPost(args)) });

const usersRouter = d.router({
  list: listUsers,
  byId: getUserById,
  create: createUser,
});

const postsRouter = d.router({
  list: listPosts,
  byId: getPostById,
  create: createPost,
});

const router = d.router({
  users: usersRouter,
  posts: postsRouter,
});
```

**Access pattern:**
```typescript
api.users.list();
api.users.byId({ id: '123' });
api.users.create({ email: 'alice@example.com' });
api.posts.list();
```

**Key rule:** A router only accepts procedures or sub-routers as values. Plain objects are not valid router children.

---

## Router Composition

### Nesting

Routers can be nested to create versioned or namespaced APIs:

```typescript
const router = d.router({
  v1: d.router({
    users: d.router({
      list: d.query({ handler: async () => ok([]) }),
      byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findUser(args.id)) }),
    }),
    posts: d.router({
      list: d.query({ handler: async () => ok([]) }),
    }),
  }),
  v2: d.router({
    users: d.router({
      list: d.query({ handler: async () => ok([]) }),
      byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findUser(args.id)) }),
      create: d.mutation({ handler: async (ctx, args) => ok(ctx.db.createUser(args)) }),
    }),
    posts: d.router({
      list: d.query({ handler: async () => ok([]) }),
      byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findPost(args.id)) }),
      create: d.mutation({ handler: async (ctx, args) => ok(ctx.db.createPost(args)) }),
    }),
  }),
});
```

**Access:** `api.v1.users.list()`, `api.v2.posts.byId()`, etc.

### Modular Routers

Procedures are defined as named constants and then composed into routers.

**Pattern:**
```typescript
// Define each procedure as a named constant
const listUsers = d.query({
  meta: { authRequired: true },
  handler: async (ctx) => ok(await ctx.db.listUsers()),
});

const getUserById = d.query({
  meta: { authRequired: true },
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.findUser(args.id);
    return user ? ok(user) : err({ code: 'NOT_FOUND' });
  },
});

const createUser = d.mutation({
  args: z.object({ email: z.string().email(), name: z.string() }),
  handler: async (ctx, args) => ok(await ctx.db.createUser(args)),
});

// Compose into router
const usersRouter = d.router({
  list: listUsers,
  byId: getUserById,
  create: createUser,
});
```

**Why this separation matters:**
- **Testing** — procedures can be tested in isolation without router context
- **Reusability** — procedures can be composed into different routers
- **Readability** — clear distinction between "what this module does" vs "how it's organized"
- **Diff friendliness** — adding a procedure doesn't require restructuring the router tree

---

## Router Merging

### d.router() with Multiple Arguments

Routers can be merged by passing multiple router arguments:

```typescript
const usersRouter = d.router({ ... });
const postsRouter = d.router({ ... });
const adminRouter = d.router({ ... });

// Merge into single router
const mergedRouter = d.router(usersRouter, postsRouter, adminRouter);
```

### Merged Router Access

When merged, all procedures are accessible at the top level:

```typescript
const merged = d.router(
  d.router({ users: d.router({ list: ..., byId: ... }) }),
  d.router({ posts: d.router({ list: ..., byId: ... }) }),
);

// Access merged procedures
api.users.list();
api.posts.byId({ id: '123' });
```

### Merging with Namespace Prefix

For cleaner organization, wrap each router in a namespace:

```typescript
const apiRouter = d.router({
  users: d.router({ list: ..., byId: ..., create: ... }),
  posts: d.router({ list: ..., byId: ..., create: ... }),
  admin: d.router({ stats: ..., cleanup: ... }),
});
```

---

## Router-Level Middleware

### Attaching Middleware to Router

Middleware can be attached at the router level using `.use()`. This applies the middleware to **all procedures** in that router:

```typescript
const router = d.router({
  users: d.router({
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findUser(args.id)) }),
  }),
  posts: d.router({
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findPost(args.id)) }),
  }),
}).use(loggingMiddleware);  // Applies to users.* AND posts.*
```

**Execution order:**
1. Router-level middleware (loggingMiddleware)
2. Procedure-level middleware (if any)

### Chaining Middleware on Router

Multiple middleware can be chained on a router:

```typescript
const router = d.router({
  data: d.query({ handler: async () => ok('data') }),
}).use(loggingMiddleware)
  .use(requestIdMiddleware)
  .use(authMiddleware);
```

### Global Middleware Pattern

For middleware that applies to the entire API:

```typescript
const d = initDRPC
  .context({ db: myDb })
  .create();

// Logging middleware applied to every procedure
const globalRouter = d.router({
  users: d.router({ list: ..., byId: ..., create: ... }),
  posts: d.router({ list: ..., byId: ..., create: ... }),
}).use(loggingMiddleware);
```

---

## Router Types

### DecoratedRouter

The type system ensures routers contain only procedures or sub-routers:

```typescript
type DecoratedRouter<TCtx> = {
  [key: string]: Procedure<TCtx> | Router<TCtx>;
};
```

A router child must be either:
- A `Procedure<TCtx>` (query, mutation, internalQuery, internalMutation)
- A `Router<TCtx>` (sub-router)

Plain objects are not valid router children.

### Flattened Router

For adapters, routers are flattened to a map of path → procedure:

```typescript
type FlattenedRouter = Map<string, Procedure>;
```

**Flattening example:**
```typescript
const router = d.router({
  users: d.router({
    list: queryProcedure,
    byId: queryProcedure,
  }),
  posts: d.router({
    list: queryProcedure,
  }),
});

// Becomes:
{
  'users.list': queryProcedure,
  'users.byId': queryProcedure,
  'posts.list': queryProcedure,
}
```

---

## Usage Examples

### Full API with Nested Routers

This example follows the **procedure/router separation convention**:

```typescript
const d = initDRPC
  .context({ db: myDb, logger: myLogger })
  .meta<{ authRequired?: boolean; role?: 'admin' | 'user' }>()
  .create();

// ============================================
// Step 1: Define procedures as named constants
// ============================================

const listUsers = d.query({
  handler: async (ctx) => ok(await ctx.db.listUsers()),
});

const getUserById = d.query({
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.findUser(args.id);
    return user ? ok(user) : err({ code: 'NOT_FOUND' });
  },
});

const createUser = d.mutation({
  args: z.object({ email: z.string().email(), name: z.string() }),
  handler: async (ctx, args) => ok(await ctx.db.createUser(args)),
});

const deleteUser = d.mutation({
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => {
    await ctx.db.deleteUser(args.id);
    return ok({ deleted: true });
  },
});

const listPosts = d.query({
  handler: async (ctx) => ok(await ctx.db.listPosts()),
});

const getPostById = d.query({
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => ok(await ctx.db.findPost(args.id)),
});

const createPost = d.mutation({
  args: z.object({ title: z.string(), content: z.string() }),
  handler: async (ctx, args) => ok(await ctx.db.createPost(args)),
});

const healthCheck = d.query({ handler: async () => ok({ status: 'ok' }) });

const healthReady = d.query({ handler: async (ctx) => ok({ ready: await ctx.db.isReady() }) });

// ============================================
// Step 2: Compose procedures into routers
// ============================================

const usersRouter = d.router({
  list: listUsers,
  byId: getUserById,
  create: createUser,
  delete: deleteUser,
});

const postsRouter = d.router({
  list: listPosts,
  byId: getPostById,
  create: createPost,
});

const healthRouter = d.router({
  check: healthCheck,
  ready: healthReady,
});

// ============================================
// Step 3: Compose routers into final API
// ============================================

const router = d.router({
  v1: d.router({
    users: usersRouter,
    posts: postsRouter,
  }),
  health: healthRouter,
}).use(loggingMiddleware);

// ============================================
// Create API
// ============================================

const api = createAPI({ router });

// Access:
// api.v1.users.list()
// api.v1.users.byId({ id: '...' })
// api.v1.posts.create({ title: '...', content: '...' })
// api.health.check()
```

**Key insight:** Procedures are defined as named constants, then composed into routers. This separation makes testing easier and keeps each file focused.

### Router with Auth Middleware

```typescript
const authMw = d.middleware({
  handler: (ctx, args, extra) => {
    if (extra.meta?.authRequired && !ctx.userId) {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' }, marker: null as any };
    }
    return extra.next();
  },
});

const adminRouter = d.router({
  users: d.router({
    list: d.query({
      meta: { authRequired: true, role: 'admin' },
      handler: async (ctx) => ok(await ctx.db.listAllUsers()),
    }),
    deleteAny: d.mutation({
      meta: { authRequired: true, role: 'admin' },
      args: z.object({ id: z.string().uuid() }),
      handler: async (ctx, args) => ok(await ctx.db.deleteUser(args.id)),
    }),
  }),
  stats: d.router({
    users: d.query({
      meta: { authRequired: true, role: 'admin' },
      handler: async (ctx) => ok(await ctx.db.getStats()),
    }),
  }),
}).use(authMw);  // Auth middleware for all admin procedures
```

### Merged Standalone Routers

```typescript
// Modular definition
const usersRouter = defineUsersRouter(d);
const postsRouter = definePostsRouter(d);
const commentsRouter = defineCommentsRouter(d);

// Merge into API
const router = d.router(
  d.router({ users: usersRouter }),
  d.router({ posts: postsRouter }),
  d.router({ comments: commentsRouter }),
);
```

---

## API Reference

### d.router()

```typescript
d.router<TRoutes extends DecoratedRouter<TCtx>>(
  ...routes: TRoutes[]
): Router<TCtx>

// Or with options
d.router(routes, {
  collisionStrategy?: 'error' | 'warn' | 'override';
  prefix?: string;
  meta?: Record<string, unknown>;
  deprecated?: boolean;
  deprecatedReason?: string;
  notFound?: (path: string, req: RequestInfo) => Result<unknown>;
}): Router<TCtx>
```

Creates a router from one or more route objects. Routes can be nested but each level must contain only procedures or sub-routers.

### Router

```typescript
class Router<TCtx> {
  // Attach middleware to all procedures
  use<TMw extends Middleware<TCtx, any>>(middleware: TMw): Router<TCtx>;

  // Merge routers with collision strategy
  merge(...routers: Router<TCtx>[]): Router<TCtx>;

  // Filter router to create virtual router
  filter(filterFn: (path: string, proc: Procedure<TCtx>) => boolean): Router<TCtx>;

  // Create lazy-loaded sub-router
  static lazy<T extends Router<any>>(loader: () => Promise<T>): Router<TCtx>;

  // Generate introspection schema
  getSchema(): RouterSchema;
}
```

### DecoratedRouter Type

```typescript
type DecoratedRouter<TCtx> = {
  [key: string]: Procedure<TCtx> | Router<TCtx>;
};
```

### FlattenedRouter Type

```typescript
type FlattenedRouter = Map<string, Procedure>;
```

### RouterCollisionError

Thrown when two routers being merged define the same path:

```typescript
class RouterCollisionError extends Error {
  readonly path: string;
  readonly routers: string[];
}
```

---

## Implementation Notes

### Valid Router Children

A router only accepts two types of children:

1. **Procedures** — `d.query()`, `d.mutation()`, `d.internalQuery()`, `d.internalMutation()`
2. **Sub-routers** — `d.router({...})`

```typescript
// Valid
d.router({
  users: d.router({ ... }),     // Sub-router
  list: d.query({ ... }),       // Procedure
});

// Invalid — plain objects are not valid
d.router({
  users: {                       // ❌ Plain object not allowed
    list: d.query({ ... }),
  },
});
```

### Path Generation

Routers generate paths by joining nested keys with dots:

```
users: d.router({ list: proc })     → path: "users.list"
v1: d.router({ users: d.router({ list: proc }) }) → path: "v1.users.list"
```

### Internal Procedures

Internal procedures (`internalQuery`, `internalMutation`) are **not included** in the flattened router exposed to adapters. Only public procedures are registered.

```typescript
const router = d.router({
  publicData: d.query({ handler: async () => ok('public') }),
  internalData: d.internalQuery({ handler: async () => ok('internal') }),
});

// Flattened router only contains publicData
// internalData must be called via createAPI() directly
```

### Collision Detection

When merging routers, DRPC detects path collisions at initialization. By default, a `RouterCollisionError` is thrown to prevent accidental overrides.

**Collision Strategy Options:**

```typescript
// Default: error on collision
const merged = d.router(router1, router2);
// throws RouterCollisionError if paths overlap

// Warn: log warning but allow override
const merged = d.router(router1, router2, { collisionStrategy: 'warn' });
// console.warn('Path users.list collision, using router2')

// Override: later router takes precedence
const merged = d.router(router1, router2, { collisionStrategy: 'override' });
// router2's implementation wins
```

**Use case for `override`:** Gradual migrations where one team is taking over another team's routes.

**Use case for `warn`:** Auditing existing collisions before making changes.

```typescript
type CollisionStrategy = 'error' | 'warn' | 'override';
```

**This behavior is intentional.** In large organizations where multiple teams contribute to the same API, silent path overrides can cause production incidents. DRPC fails fast at startup rather than silently choosing one implementation over another.

### Metadata Inheritance

Router-level metadata is inherited by all child procedures. This enables observability at scale:

```typescript
const billingRouter = d.router({
  meta: { team: 'billing', tier: 'production' },
  users: d.router({
    list: d.query({ handler: async (ctx) => ok([]) }),
    invoice: d.query({
      meta: { authRequired: true },  // Merges with router meta
      handler: async (ctx) => ok({}),
    }),
  }),
});

// Resulting metadata:
// 'billing.users.list': { team: 'billing', tier: 'production' }
// 'billing.users.invoice': { team: 'billing', tier: 'production', authRequired: true }
```

**Use case:** In tools like Datadog, you can filter 500 errors by `team` to know which team owns the failing service.

**Merge behavior:** Procedure-level meta merges with router-level meta. Procedure meta takes precedence for conflicting keys.

### Alias and Deprecation

Routes can be marked as deprecated at the router level:

```typescript
const router = d.router({
  meta: { deprecated: true, deprecatedReason: 'Use v2.users instead' },
  users: d.router({ ... }),
});
```

When a deprecated router's procedure is called:
- A `Warning` header is added to the response: `Warning: 299 - "Deprecated: Use v2.users instead"`
- The call is logged with deprecation metadata for monitoring

**Route aliases:** For gradual migrations, a procedure can redirect to another:

```typescript
const v1Router = d.router({
  users: d.router({
    list: d.query({
      handler: async () => ok([]),
      alias: 'v2.users.list',  // Redirect calls to new route
    }),
  }),
});
```

### Virtual Routers (Filtering)

Create a filtered view of a router based on criteria:

```typescript
const fullRouter = d.router({
  public: d.router({ data: d.query({ ... }) }),
  admin: d.router({ secrets: d.query({ ... }) }),
  internal: d.router({ metrics: d.query({ ... }) }),
});

// Create public-only view
const publicRouter = fullRouter.filter((path, proc) => {
  return !path.startsWith('admin') && !path.startsWith('internal');
});

// admin and internal routes are not accessible via publicRouter
```

**Use case:** Multi-tenant APIs where different clients get different route views.

**Filter criteria can include:**
- Path prefix (`!path.startsWith('admin')`)
- Procedure metadata (`proc.meta.internalOnly === true`)
- Procedure type (`proc.type === 'query'`)

### Catch-all Fallback

Handle requests to non-existent paths at the router level:

```typescript
const router = d.router({
  notFound: (path, req) => {
    return { ok: false, error: { code: 'ROUTE_NOT_FOUND', message: `No route: ${path}` } };
  },
  users: d.router({ ... }),
});
```

**Use case:** Dynamic routing where you want to capture unmatched paths for:
- Debugging (log what paths are being tried)
- Fallback logic (serve cached response for missing routes)
- Redirects (redirect `/old-path` to `/new-path`)

### Global Prefix / Base Path

Mount a router under a specific path prefix:

```typescript
const api = createAPI({
  router: d.router({
    prefix: '/api/v1',
    users: d.router({ ... }),
    posts: d.router({ ... }),
  }),
});
```

**Effect:** All routes are prefixed during flattening:
- `users.list` → `/api/v1/users.list`
- `posts.create` → `/api/v1/posts.create`

**Use case:** Mounting behind a proxy or on a specific base path without adapter configuration.

### Introspection and Schema Generation

Routers are fully introspectable. Generate a schema for documentation or tooling:

```typescript
const router = d.router({
  users: d.router({
    list: d.query({
      args: z.object({ limit: z.number().default(10) }),
      meta: { authRequired: true },
      handler: async (ctx, args) => ok([]),
    }),
  }),
});

const schema = router.getSchema();
// Returns JSON representation of all routes
```

**Schema output:**

```typescript
interface RouterSchema {
  version: '1.0';
  routes: {
    path: string;
    type: 'query' | 'mutation' | 'subscription';
    args?: ZodSchema;
    meta?: Record<string, unknown>;
    deprecated?: boolean;
  }[];
}
```

**Generated schema enables:**
- Automatic OpenAPI/Swagger documentation
- Client SDK generation
- Route inventory for monitoring
- Migration planning tools

### Flattening Performance

The router tree is flattened once at initialization time, not on every request. This operation:
- Recursively traverses the router tree
- Generates the `FlattenedRouter` map
- Filters out internal procedures

For APIs with hundreds of routes, this traversal happens only once when `createAPI()` is called. The resulting `FlattenedRouter` is cached and reused for all subsequent requests.

### Lazy Loading (Optional)

For large monorepos or serverless environments (AWS Lambda, Vercel), routers support lazy loading. Instead of defining all routes upfront, sub-routers can be loaded on demand:

```typescript
const router = d.router({
  users: d.router.lazy(() => import('./users.router').then(m => m.default)),
  posts: d.router.lazy(() => import('./posts.router').then(m => m.default)),
});
```

The lazy router is loaded when first accessed. This can reduce cold start times in serverless environments by deferring route registration until needed.

**Note:** Lazy-loaded routers are resolved asynchronously. The first request to a lazy route may have slightly higher latency while the module loads.

### Router Immutability

Routers are immutable — attaching middleware returns a new router:

```typescript
const router1 = d.router({ data: d.query({ handler: async () => ok('data') }) });
const router2 = router1.use(authMw);

// router1: no middleware
// router2: with authMw
```

### Type Safety

TypeScript ensures all procedures in a router are properly typed:

```typescript
const router = d.router({
  users: d.router({
    list: d.query({ handler: async (ctx) => ok([]) }),
    create: d.mutation({
      args: z.object({ email: z.string() }),
      handler: async (ctx, args) => ok({ id: '1', ...args }),
    }),
  }),
});

// api.users.list() → returns User[]
// api.users.create({ email: 'test@example.com' }) → returns { id: string, email: string }
```

---

## Status

**Implemented** — Routers are fully functional in the current implementation.
