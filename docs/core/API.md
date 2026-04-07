# API Reference

Complete API reference for `@deessejs/drpc`.

## Exports Overview

```typescript
import {
  // Core
  defineContext,
  createAPI,
  createPublicAPI,
  createClient,
  createLocalExecutor,

  // Result helpers
  ok,
  err,
  withMetadata,

  // Schema helpers
  defineCacheKeys,
  defineEvents,

  // Plugin system
  plugin,

  // Query builder (from defineContext)
  QueryBuilder,
  Query,
  Mutation,
  InternalQuery,
  InternalMutation,
  Router,
  Middleware,
  Plugin,

  // Types
  Result,
  CacheKey,
  WithMetadata,
  EventRegistry,
  EventPayload,
} from "@deessejs/drpc"
```

---

## Core Functions

### `defineContext(config)`

Creates a typed context with a query builder for defining procedures.

```typescript
function defineContext<Ctx, Plugins extends Plugin<Ctx>[]>(
  config: {
    context: Ctx
    plugins?: Plugins
    events?: EventRegistry
  }
): {
  t: QueryBuilder<Ctx>
  createAPI: (config: { router: Router; middleware?: Middleware<Ctx>[] }) => APIInstance<Ctx>
}
```

**Example:**

```typescript
import { defineContext } from "@deessejs/drpc"

type Context = {
  db: Database
  logger: Logger
}

const { t, createAPI } = defineContext({
  context: {
    db: myDatabase,
    logger: console,
  },
  plugins: [authPlugin],
})
```

---

### `createAPI(config)`

Creates a full API instance with router and middleware.

```typescript
function createAPI<Ctx, TRoutes extends Router>(
  config: {
    router: TRoutes
    middleware?: Middleware<Ctx>[]
    plugins?: Plugin<Ctx>[]
  }
): APIInstance<Ctx, TRoutes>
```

**Example:**

```typescript
const api = createAPI({
  router: t.router({
    users: {
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    },
  }),
})
```

---

### `createPublicAPI(api)`

Creates a client-safe API that only exposes public operations (`query` and `mutation`). Internal operations are filtered out.

```typescript
function createPublicAPI<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, TRoutes>
```

**Example:**

```typescript
import { createPublicAPI } from "@deessejs/drpc"

const client = createPublicAPI(api)

export { api, client }
```

---

### `createClient(api)`

Alias for `createPublicAPI`. Creates a client-safe API for HTTP exposure.

```typescript
function createClient<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, TRoutes>
```

---

### `createLocalExecutor(api)`

Creates a local executor for testing purposes.

```typescript
function createLocalExecutor<Ctx, TRoutes extends Router>(
  api: APIInstance<Ctx, TRoutes>
): {
  execute(route: string, args: unknown): Promise<Result<any>>
  getEvents(): EventPayload[]
}
```

**Example:**

```typescript
import { createLocalExecutor } from "@deessejs/drpc"

const executor = createLocalExecutor(api)

const result = await executor.execute("users.get", { id: 1 })
```

---

## Result Helpers

### `ok(value, options?)`

Creates a success result with optional cache metadata.

```typescript
function ok<T, Keys extends CacheKey[] = CacheKey[]>(
  value: T,
  options?: { keys?: Keys; ttl?: number }
): Result<T>
```

**Example:**

```typescript
return ok({ id: 1, name: "John" })

// With cache keys
return ok(user, { keys: ["users", { id: user.id }] })
```

---

### `err(error)`

Creates an error result.

```typescript
function err<E = { code: string; message: string }>(
  error: E
): Result<never, E>
```

**Example:**

```typescript
return err({ code: "NOT_FOUND", message: "User not found" })
```

---

### `withMetadata(value, metadata)`

Attaches cache keys and invalidation to a value.

```typescript
function withMetadata<T, Keys extends CacheKey[] = CacheKey[]>(
  value: T,
  metadata: { keys?: Keys; invalidate?: CacheKey[]; ttl?: number }
): T & { keys?: Keys; invalidate?: CacheKey[]; ttl?: number }
```

**Example:**

```typescript
return withMetadata(user, {
  keys: ["users", { id: user.id }],
  invalidate: ["users.list"],
})
```

---

## Schema Helpers

### `defineCacheKeys(schema)`

Creates a typed cache key registry.

```typescript
function defineCacheKeys<T extends Record<string, any>>(schema: T): T
```

**Example:**

```typescript
const keys = defineCacheKeys({
  users: {
    _root: "users",
    list: (params?: ListParams) => ["users", "list", params],
    byId: (id: number) => ["users", { id }],
    count: () => ["users", "count"],
  },
})

// Usage
return withMetadata(users, { keys: keys.users.list() })
```

---

### `defineEvents(schema)`

Creates a typed event registry.

```typescript
function defineEvents<Events extends EventRegistry>(schema: Events): {
  events: Events
  on: (event: string, handler: EventHandler) => void
  getEventName: (path: string[]) => string
}
```

---

### `plugin(config)`

Creates a plugin with context extension and optional router/hooks.

```typescript
function plugin<Ctx, PluginRouter extends Router = {}>(
  config: PluginDefinition<Ctx, PluginRouter>
): Plugin<Ctx> & { router?: (t: QueryBuilder<Ctx>) => PluginRouter }
```

**Example:**

```typescript
const authPlugin = plugin({
  name: "auth",
  extend: (ctx) => ({
    userId: null,
    isAuthenticated: false,
  }),
})
```

---

## QueryBuilder (from `defineContext`)

The `t` object returned by `defineContext` provides methods for defining procedures.

### `t.query(config)`

Defines a public read operation.

```typescript
t.query<Args, Output>(config: {
  args?: Schema
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>
  middleware?: Middleware<Ctx> | Middleware<Ctx>[]
}): Query<Ctx, Args, Output>
```

**Example:**

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" })
    return ok(user)
  },
})
```

---

### `t.mutation(config)`

Defines a public write operation.

```typescript
t.mutation<Args, Output>(config: {
  args?: Schema
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>
  middleware?: Middleware<Ctx> | Middleware<Ctx>[]
}): Mutation<Ctx, Args, Output>
```

**Example:**

```typescript
const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  },
})
```

---

### `t.internalQuery(config)`

Defines a private read operation (not exposed via HTTP).

```typescript
t.internalQuery<Args, Output>(config: {
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>
  middleware?: Middleware<Ctx> | Middleware<Ctx>[]
}): InternalQuery<Ctx, Args, Output>
```

**Example:**

```typescript
const getAdminStats = t.internalQuery({
  handler: async (ctx) => {
    return ok({
      totalUsers: await ctx.db.users.count(),
      revenue: await ctx.db.orders.sum(),
    })
  },
})
```

---

### `t.internalMutation(config)`

Defines a private write operation (not exposed via HTTP).

```typescript
t.internalMutation<Args, Output>(config: {
  handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>
  middleware?: Middleware<Ctx> | Middleware<Ctx>[]
}): InternalMutation<Ctx, Args, Output>
```

**Example:**

```typescript
const deleteUser = t.internalMutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    await ctx.db.users.delete(args.id)
    return ok({ success: true })
  },
})
```

---

### `t.router(routes)`

Creates a hierarchical router for organizing procedures.

```typescript
t.router(routes: Router): Router
```

**Example:**

```typescript
const api = createAPI({
  router: t.router({
    users: t.router({
      get: t.query({ ... }),
      create: t.mutation({ ... }),
      list: t.query({ ... }),
    }),
    posts: t.router({
      get: t.query({ ... }),
      create: t.mutation({ ... }),
    }),
  }),
})
```

---

### `t.middleware(config)`

Creates a middleware for intercepting requests.

```typescript
t.middleware<Args>(config: {
  name: string
  args?: unknown
  handler: (ctx: Ctx & { args: Args }, next: () => Promise<Result<any>>) => Promise<Result<any>>
}): Middleware<Ctx, Args>
```

---

### `t.on(event, handler)`

Registers a global event listener.

```typescript
t.on<EventName extends string, EventData>(
  event: EventName,
  handler: EventHandler<Ctx, unknown, EventData>
): void
```

---

## Lifecycle Hooks

Query and mutation operations support chaining lifecycle hooks.

### `.beforeInvoke(handler)`

Runs before the handler executes.

```typescript
.beforeInvoke((ctx, args) => void | Promise<void>)
```

---

### `.afterInvoke(handler)`

Runs after the handler executes (always).

```typescript
.afterInvoke((ctx, args, result) => void | Promise<void>)
```

---

### `.onSuccess(handler)`

Runs after successful handler execution.

```typescript
.onSuccess((ctx, args, data) => void | Promise<void>)
```

---

### `.onError(handler)`

Runs after failed handler execution.

```typescript
.onError((ctx, args, error) => void | Promise<void>)
```

**Example:**

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => { ... },
})
  .beforeInvoke((ctx, args) => {
    console.log(`Fetching user ${args.id}`)
  })
  .onSuccess((ctx, args, data) => {
    console.log(`User fetched: ${data.id}`)
  })
  .onError((ctx, args, error) => {
    console.error(`Failed to fetch user: ${error.message}`)
  })
```

---

## Types

### `Result<Success, Error>`

```typescript
type Result<Success, Error = { code: string; message: string }> =
  | { ok: true; value: Success }
  | { ok: false; error: Error }
```

---

### `CacheKey`

```typescript
type CacheKey = string | Record<string, unknown>
```

---

### `WithMetadata<T, Keys>`

```typescript
interface WithMetadata<T, Keys extends CacheKey[] = CacheKey[]> {
  data: T
  keys?: Keys
  invalidate?: CacheKey[]
  ttl?: number
}
```

---

### `Plugin<Ctx>`

```typescript
type Plugin<Ctx> = {
  name: string
  extend: (ctx: Ctx) => Partial<Ctx>
  router?: (t: QueryBuilder<Ctx>) => Record<string, any>
  hooks?: PluginHooks<Ctx>
}
```

---

### `Middleware<Ctx, Args>`

```typescript
type Middleware<Ctx, Args = unknown> = {
  name: string
  args?: unknown
  handler: (ctx: Ctx & { args: Args; meta: Record<string, unknown> }, next: () => Promise<Result<any>>) => Promise<Result<any>>
}
```

---

### `EventRegistry`

```typescript
type EventRegistry = Record<string, {
  data?: unknown
  response?: unknown
}>
```

---

### `EventPayload<T>`

```typescript
type EventPayload<T = unknown> = {
  name: string
  data: T
  timestamp: string
  namespace: string
  source?: string
}
```

---

## APIInstance

The API instance returned by `createAPI` and `createPublicAPI`.

```typescript
interface APIInstance<Ctx, TRoutes extends Router = Router> {
  router: TRoutes
  ctx: Ctx
  plugins: Array<Plugin<Ctx>>
  globalMiddleware: Middleware<Ctx>[]
  execute<TRoute extends keyof TRoutes>(
    route: TRoute,
    args: any
  ): Promise<Result<any>>
}
```

---

## Security Model

| Operation | Callable via HTTP | Callable from Server |
|-----------|-------------------|---------------------|
| `t.query()` | ✅ Yes | ✅ Yes |
| `t.mutation()` | ✅ Yes | ✅ Yes |
| `t.internalQuery()` | ❌ No | ✅ Yes |
| `t.internalMutation()` | ❌ No | ✅ Yes |

---

## Next.js Integration

For HTTP exposure in Next.js, use `@deessejs/drpc-next`:

```typescript
import { toNextJsHandler } from "@deessejs/drpc-next"

export const { POST, GET } = toNextJsHandler(client)
```
