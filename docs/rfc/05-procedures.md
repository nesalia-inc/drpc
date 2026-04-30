# RFC 05: Procedures

## Summary

DRPC provides three types of procedures: **queries** (read-only), **mutations** (write operations), and **subscriptions** (streaming). Procedures are created via factory methods on `DRPCRoot`. Each procedure type has specific semantics, input validation via Zod, and integrates with middleware and hooks.

---

## Overview

### What Is a Procedure?

A procedure is a type-safe function exposed via DRPC. It wraps a handler function with:
- **Input validation** — Zod schema for runtime type safety
- **Middleware chain** — interception points before execution
- **Hooks** — lifecycle callbacks (before/after invoke, on success, on error)
- **Meta** — procedure-specific metadata for middleware decisions

```typescript
const d = initDRPC.create();

// Query: read-only procedure
const getUser = d.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => {
    return ok(await ctx.db.findUser(args.id));
  },
});

// Mutation: write operation
const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.createUser(args.email);
    ctx.send('user.created', { id: user.id, email: user.email });
    return ok(user);
  },
});
```

---

## Procedure Types

### Query — Read-Only Procedures

Queries represent **read-only operations**. They should not modify state but can emit events.

```typescript
const listUsers = d.query({
  handler: async (ctx) => {
    return ok(ctx.db.listUsers());
  },
});
```

**Characteristics:**
- Idempotent — safe to retry
- No side effects (though events can be emitted)
- Can be cached at the adapter level

**With args:**
```typescript
const getUserById = d.query({
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.findUser(args.id);
    if (!user) {
      return err({ code: 'NOT_FOUND', message: 'User not found' });
    }
    return ok(user);
  },
});
```

### Mutation — Write Operations

Mutations represent **state-changing operations**. They emit events and should not be retried automatically.

```typescript
const createUser = d.mutation({
  args: z.object({ email: z.string().email(), name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.createUser(args);
    ctx.send('user.created', { id: user.id, email: user.email });
    return ok(user);
  },
});
```

**Characteristics:**
- Not idempotent — retry with caution
- Can emit events (flushed on success, discarded on error)
- Event batching applies — if mutation fails, events are not emitted

### Internal Query — Server-Only Procedures

Internal queries are **not exposed to the public API**. They are for internal communication within the same server or between trusted services.

```typescript
const getSecretData = d.internalQuery({
  handler: async (ctx) => {
    return ok(ctx.internalService.getSecret());
  },
});
```

**Use cases:**
- Server-to-server communication within the same process
- Internal administrative endpoints
- Procedures not meant for client consumption

**Security:** Internal procedures are not exposed via HTTP adapters. They can only be called via `createAPI()` locally.

### Internal Mutation — Server-Only Write Operations

Internal mutations are **write operations not exposed to the public API**:

```typescript
const triggerCleanup = d.internalMutation({
  handler: async (ctx) => {
    await ctx.internalService.cleanup();
    return ok({ cleaned: true });
  },
});
```

### Subscription — Streaming Procedures

Subscriptions provide **streaming responses**. They return a generator that yields data as it becomes available.

```typescript
const watchUsers = d.subscription({
  args: z.object({ onlineOnly: z.boolean().default(false) }),
  handler: function* (ctx, args) {
    for await (const user of ctx.db.watchUsers({ onlineOnly: args.onlineOnly })) {
      yield ok(user);
    }
  },
});
```

**Characteristics:**
- Returns `AsyncGenerator<Result<T>>`
- Each `yield` sends a value to the client
- Client subscribes and receives streaming responses
- Adapter must support WebSocket or SSE

**Server-side emit (for WebSocket-based subscriptions):**
```typescript
const watchUsers = d.subscription({
  handler: function* (ctx, args) {
    const emitter = ctx.db.watchUsers(args);

    emitter.on('user.online', (user) => {
      yield ok(user);  // Push to client
    });

    emitter.on('user.offline', (user) => {
      yield ok(user);
    });

    // Keep subscription alive until client disconnects
    while (ctx.connected) {
      yield* emitter.stream();
    }
  },
});
```

---

## Procedure Factory Methods

### d.query()

Creates a query procedure.

```typescript
d.query<Args, Output>(config: QueryConfig<TCtx, Args, Output>): QueryProcedure<TCtx, Args, Output, TMeta>
```

```typescript
interface QueryConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;           // Input validation schema
  meta?: TMeta;                   // Procedure metadata
  hooks?: Hooks<TCtx, Args, Output>; // Lifecycle hooks
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### d.mutation()

Creates a mutation procedure.

```typescript
d.mutation<Args, Output>(config: MutationConfig<TCtx, Args, Output>): MutationProcedure<TCtx, Args, Output, TMeta>
```

```typescript
interface MutationConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;           // Input validation schema
  meta?: TMeta;                   // Procedure metadata
  hooks?: Hooks<TCtx, Args, Output>; // Lifecycle hooks
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### d.internalQuery()

Creates an internal query (not exposed via adapters).

```typescript
d.internalQuery<Args, Output>(config: InternalConfig<TCtx, Args, Output>): InternalQueryProcedure<TCtx, Args, Output>
```

```typescript
interface InternalConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### d.internalMutation()

Creates an internal mutation (not exposed via adapters).

```typescript
d.internalMutation<Args, Output>(config: InternalConfig<TCtx, Args, Output>): InternalMutationProcedure<TCtx, Args, Output>
```

### d.subscription()

Creates a subscription procedure.

```typescript
d.subscription<Args, Output>(config: SubscriptionConfig<TCtx, Args, Output>): SubscriptionProcedure<TCtx, Args, Output, TMeta>
```

```typescript
interface SubscriptionConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  meta?: TMeta;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => AsyncGenerator<Result<Output>>;
}
```

### d.router()

Composes multiple procedures into a namespaced router.

```typescript
d.router<TRoutes extends DecoratedRouter<TCtx>>(routes: TRoutes): Router<TCtx>
```

```typescript
const router = d.router({
  users: {
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({
      args: z.object({ id: z.string() }),
      handler: async (ctx, args) => ok(ctx.db.findUser(args.id)),
    }),
    create: d.mutation({
      args: z.object({ email: z.string().email() }),
      handler: async (ctx, args) => ok(ctx.db.createUser(args)),
    }),
  },
  posts: {
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({ ... }),
  },
});

// Access: api.users.list(), api.users.byId(), api.users.create()
```

**Router nesting:** Routers can be nested arbitrarily deep:

```typescript
const router = d.router({
  v1: {
    users: { ... },
    posts: { ... },
  },
  v2: {
    users: { ... },
    posts: { ... },
  },
});

// Access: api.v1.users.list(), api.v2.posts.list()
```

### d.procedure — Chaining Builder

`d.procedure` provides a fluent chaining API for attaching meta and middleware before specifying the procedure type:

```typescript
d.procedure
  .meta({ authRequired: true })
  .use(authMiddleware)
  .query({ handler: async (ctx) => ok('protected data') });
```

**Available chains:**
```typescript
d.procedure
  .meta<TMeta>(meta: TMeta)       // Set procedure metadata
  .use<TMw>(middleware: TMw)      // Attach middleware
  .query(config)                   // Create as query
  .mutation(config)                // Create as mutation
  .subscription(config)           // Create as subscription
```

**Example with full chain:**
```typescript
const protectedMutation = d.procedure
  .meta({ role: 'admin', authRequired: true })
  .use(requireAuthMiddleware)
  .use(loggingMiddleware)
  .mutation({
    args: z.object({ action: z.enum(['delete', 'archive']) }),
    handler: async (ctx, args) => {
      if (args.action === 'delete') {
        return ok(ctx.db.deleteAll());
      }
      return ok(ctx.db.archiveAll());
    },
  });
```

---

## Input Validation

### Zod Schema

Procedures validate input using Zod schemas:

```typescript
const createUser = d.mutation({
  args: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1).max(100),
    age: z.number().int().positive().optional(),
    tags: z.array(z.string()).default([]),
  }),
  handler: async (ctx, args) => {
    // args is fully typed: { email: string, name: string, age?: number, tags: string[] }
    return ok(ctx.db.createUser(args));
  },
});
```

**Validation happens at runtime:**
- Invalid input returns a validation error to the client
- TypeScript types are inferred from the Zod schema

### Optional Args

If `args` is not provided, the procedure accepts no input:

```typescript
const getPublicData = d.query({
  handler: async (ctx) => ok('public'),
});
// api.getPublicData() — no args
// api.getPublicData({ unexpected: true }) — validation error
```

### No Validation (Internal Procedures)

Internal procedures can skip Zod validation for trusted calls:

```typescript
const internalGetData = d.internalQuery({
  // No args schema — accepts unknown input
  handler: async (ctx, args: unknown) => {
    const data = args as { key: string };  // Manual validation
    return ok(ctx.cache.get(data.key));
  },
});
```

---

## Hooks — Lifecycle Callbacks

Hooks let you run code at specific points during procedure execution:

```typescript
interface Hooks<TCtx, Args, Output> {
  beforeInvoke?: (ctx: TCtx, args: Args) => void | Promise<void>;
  afterInvoke?: (ctx: TCtx, args: Args, output: Output) => void | Promise<void>;
  onSuccess?: (ctx: TCtx, args: Args, output: Output) => void | Promise<void>;
  onError?: (ctx: TCtx, args: Args, error: Error) => void | Promise<void>;
}
```

### beforeInvoke

Runs **before** the handler. Use for logging, metrics:

```typescript
const createUser = d.mutation({
  hooks: {
    beforeInvoke: (ctx, args) => {
      ctx.logger.info('Creating user', { email: args.email });
    },
  },
  handler: async (ctx, args) => { ... },
});
```

### afterInvoke

Runs **after** the handler (success or error). Use for cleanup:

```typescript
const longOperation = d.query({
  hooks: {
    afterInvoke: (ctx, args) => {
      ctx.activityTracker.end(ctx.requestId);
    },
  },
  handler: async (ctx, args) => { ... },
});
```

### onSuccess

Runs **only on successful** handler completion. Use for audit logging:

```typescript
const updateUser = d.mutation({
  hooks: {
    onSuccess: (ctx, args, output) => {
      ctx.auditLog.push({
        action: 'user.updated',
        userId: output.id,
        timestamp: Date.now(),
      });
    },
  },
  handler: async (ctx, args) => { ... },
});
```

### onError

Runs **only when handler throws**. Use for error reporting:

```typescript
const riskyOperation = d.mutation({
  hooks: {
    onError: (ctx, args, error) => {
      ctx.errorReporter.capture(error, { procedure: 'riskyOperation' });
    },
  },
  handler: async (ctx, args) => { ... },
});
```

### Hook Execution Order

```
1. beforeInvoke
2. Handler executes
3. [if success] onSuccess + afterInvoke
4. [if error] onError + afterInvoke
```

---

## Result Type

Procedures return `Result<Output>` — a discriminated union for success/error:

```typescript
type Result<TOk> =
  | { ok: true; data: TOk }
  | { ok: false; error: { code: string; message: string } };
```

### ok() — Success Result

```typescript
return ok({ id: '1', name: 'Alice' });
// → { ok: true, data: { id: '1', name: 'Alice' } }
```

### err() — Error Result

```typescript
return err({ code: 'NOT_FOUND', message: 'User not found' });
// → { ok: false, error: { code: 'NOT_FOUND', message: 'User not found' } }
```

**Error codes:**
```typescript
type ErrorCode =
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PRECONDITION_FAILED'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';
```

---

## Usage Examples

### Query with Middleware Chain

```typescript
const d = initDRPC
  .context({ db: myDb, logger: myLogger })
  .meta<{ authRequired?: boolean }>()
  .create();

const authMw = d.middleware({
  handler: (ctx, args, extra) => {
    if (extra.meta?.authRequired && !ctx.userId) {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' }, marker: null as any };
    }
    return extra.next();
  },
});

const listUsers = d.query({
  meta: { authRequired: true },
  hooks: {
    beforeInvoke: (ctx) => ctx.logger.info('Listing users'),
  },
  handler: async (ctx) => {
    const users = await ctx.db.listUsers();
    return ok(users);
  },
}).use(authMw);
```

### Mutation with Events

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    deleted: event({ args: z.object({ id: z.string() }) }),
  },
});

const d = initDRPC
  .context({ db: myDb })
  .withEvents(events)
  .create();

const createUser = d.mutation({
  args: z.object({ email: z.string().email(), name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.createUser(args);
    ctx.send('user.created', { id: user.id, email: user.email });
    return ok(user);
  },
});

const deleteUser = d.mutation({
  args: z.object({ id: z.string().uuid() }),
  handler: async (ctx, args) => {
    await ctx.db.deleteUser(args.id);
    ctx.send('user.deleted', { id: args.id });
    return ok({ deleted: true });
  },
});
```

### Chained Procedure with Meta and Middleware

```typescript
const adminProcedure = d.procedure
  .meta({ role: 'admin' })
  .use(requireRoleMiddleware);

const deleteAllData = adminProcedure.mutation({
  handler: async (ctx) => {
    await ctx.db.deleteAll();
    return ok({ success: true });
  },
});
```

### Internal Procedure for Server-Server Communication

```typescript
const d = initDRPC
  .context({ internalToken: process.env.INTERNAL_TOKEN })
  .create();

const syncUsers = d.internalMutation({
  args: z.object({ users: z.array(z.object({ id: z.string(), email: z.string() })) }),
  handler: async (ctx, args) => {
    // Internal — trust the input
    await ctx.db.bulkUpsertUsers(args.users);
    return ok({ synced: args.users.length });
  },
});

// Only callable locally, not exposed via HTTP
const api = createAPI({ router });
await api.syncUsers({ users: [...] });  // Works
// HTTP clients cannot access syncUsers
```

---

## API Reference

### QueryConfig

```typescript
interface QueryConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  meta?: TMeta;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### MutationConfig

```typescript
interface MutationConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  meta?: TMeta;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### InternalConfig

```typescript
interface InternalConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### SubscriptionConfig

```typescript
interface SubscriptionConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  meta?: TMeta;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => AsyncGenerator<Result<Output>>;
}
```

### Hooks

```typescript
interface Hooks<TCtx, Args, Output> {
  beforeInvoke?: (ctx: TCtx, args: Args) => void | Promise<void>;
  afterInvoke?: (ctx: TCtx, args: Args, output: Output) => void | Promise<void>;
  onSuccess?: (ctx: TCtx, args: Args, output: Output) => void | Promise<void>;
  onError?: (ctx: TCtx, args: Args, error: Error) => void | Promise<void>;
}
```

### Result

```typescript
type Result<TOk> =
  | { ok: true; data: TOk }
  | { ok: false; error: { code: string; message: string } };

function ok<T>(data: T): Result<T>;
function err<T>(error: { code: string; message: string }): Result<T>;
```

---

## Implementation Notes

### Procedure Type Inference

TypeScript infers procedure types from Zod schemas:

```typescript
const createUser = d.mutation({
  args: z.object({ email: z.string(), name: z.string() }),
  handler: async (ctx, args) => {
    // args: { email: string; name: string } — inferred from Zod
    return ok({ id: '1', ...args });
  },
});
```

### DecoratedRouter Type

The `router()` method accepts a `DecoratedRouter<TCtx>` type that ensures all nested procedures are properly typed:

```typescript
type DecoratedRouter<TCtx> = {
  [key: string]: Procedure<TCtx> | DecoratedRouter<TCtx>;
};
```

### Internal Procedure Security

Internal procedures are filtered at the adapter level. HTTP adapters (Hono, Next) should not register internal procedures in their routing table.

```typescript
// In Hono adapter
app.rpcRouter = router;  // Only public procedures exposed

// Internal procedures not accessible via HTTP
```

### Marker Symbol

Each procedure returns a `marker` symbol in the `MiddlewareResult` for internal tracking. This ensures results come from the proper procedure chain and not from unauthorized sources.

---

## Status

**Draft** — Procedure types as described. Implementation details for subscriptions (streaming) pending.
