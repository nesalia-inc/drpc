# RFC 07: Routers

## Summary

DRPC routers compose procedures into a namespaced tree. They provide hierarchical access to procedures (`api.users.list()`) and enable modular API design. Routers accept only procedures or sub-routers as values, never plain objects.

---

## Overview

### What Is a Router?

A router is a named collection of procedures or sub-routers. It creates a hierarchical namespace:

```typescript
const router = d.router({
  users: d.router({
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({
      args: z.object({ id: z.string() }),
      handler: async (ctx, args) => ok(ctx.db.findUser(args.id)),
    }),
    create: d.mutation({
      args: z.object({ email: z.string().email() }),
      handler: async (ctx, args) => ok(ctx.db.createUser(args)),
    }),
  }),
  posts: d.router({
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findPost(args.id)) }),
    create: d.mutation({ handler: async (ctx, args) => ok(ctx.db.createPost(args)) }),
  }),
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

Each module can be defined separately and merged:

```typescript
// users.ts
export const usersRouter = d.router({
  list: d.query({ handler: async () => ok([]) }),
  byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findUser(args.id)) }),
  create: d.mutation({
    args: z.object({ email: z.string().email() }),
    handler: async (ctx, args) => ok(ctx.db.createUser(args)),
  }),
});

// posts.ts
export const postsRouter = d.router({
  list: d.query({ handler: async () => ok([]) }),
  byId: d.query({ handler: async (ctx, args) => ok(ctx.db.findPost(args.id)) }),
});

// main.ts — merge into single router
const router = d.router({
  users: usersRouter,
  posts: postsRouter,
});
```

This enables:
- **Code splitting** — each domain in its own file
- **Shared routers** — reuse routers across projects
- **Testing in isolation** — test each router separately

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

```typescript
const d = initDRPC
  .context({ db: myDb, logger: myLogger })
  .meta<{ authRequired?: boolean; role?: 'admin' | 'user' }>()
  .create();

// ============================================
// Define domain routers
// ============================================

const usersRouter = d.router({
  list: d.query({
    handler: async (ctx) => ok(await ctx.db.listUsers()),
  }),
  byId: d.query({
    args: z.object({ id: z.string().uuid() }),
    handler: async (ctx, args) => {
      const user = await ctx.db.findUser(args.id);
      return user ? ok(user) : err({ code: 'NOT_FOUND', message: 'User not found' });
    },
  }),
  create: d.mutation({
    args: z.object({ email: z.string().email(), name: z.string() }),
    handler: async (ctx, args) => ok(await ctx.db.createUser(args)),
  }),
  delete: d.mutation({
    args: z.object({ id: z.string().uuid() }),
    handler: async (ctx, args) => {
      await ctx.db.deleteUser(args.id);
      return ok({ deleted: true });
    },
  }),
});

const postsRouter = d.router({
  list: d.query({
    handler: async (ctx) => ok(await ctx.db.listPosts()),
  }),
  byId: d.query({
    args: z.object({ id: z.string().uuid() }),
    handler: async (ctx, args) => ok(await ctx.db.findPost(args.id)),
  }),
  create: d.mutation({
    args: z.object({ title: z.string(), content: z.string() }),
    handler: async (ctx, args) => ok(await ctx.db.createPost(args)),
  }),
});

// ============================================
// Compose with global middleware
// ============================================

const router = d.router({
  v1: d.router({
    users: usersRouter,
    posts: postsRouter,
  }),
  health: d.router({
    check: d.query({ handler: async () => ok({ status: 'ok' }) }),
    ready: d.query({ handler: async (ctx) => ok({ ready: await ctx.db.isReady() }) }),
  }),
}).use(loggingMiddleware);

// ============================================
// Create API
// ============================================

const api = createAPI({ router });

// Access:
// api.v1.users.list()
// api.v1.users.byId({ id: '...' })
// api.v1.posts.create({ title: '...', content: '...' })
// api.v1.health.check()
```

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
```

Creates a router from one or more route objects. Routes can be nested but each level must contain only procedures or sub-routers.

### Router

```typescript
class Router<TCtx> {
  // Attach middleware to all procedures
  use<TMw extends Middleware<TCtx, any>>(middleware: TMw): Router<TCtx>;

  // Merge routers
  merge(...routers: Router<TCtx>[]): Router<TCtx>;
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
