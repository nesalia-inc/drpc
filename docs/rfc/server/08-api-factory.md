# RFC 08: API Factory — `createAPI` and `createPublicAPI`

## Summary

`createAPI()` creates a typed local API instance from a router. `createPublicAPI()` creates a filtered view that excludes internal procedures. Together they provide the runtime layer that bridges the static router definition to executable procedure calls.

---

## Overview

### What Is an API Instance?

An API instance is a **typed proxy** that provides direct procedure calls without any network transport:

```typescript
const api = createAPI({ router });

// Direct call — same process, no network
const result = await api.users.list();
```

**Key characteristics:**
- Server-only — no HTTP, no network involved
- Fully typed — TypeScript infers argument and return types from Zod schemas
- Internal procedures accessible — all procedures including `internalQuery` and `internalMutation` are callable
- Context initialized once at creation time

### Why Two Creation Functions?

| Function | Purpose | Use Case |
|----------|---------|----------|
| `createAPI()` | Full API with all procedures | Server-to-server communication, testing, internal services |
| `createPublicAPI()` | Filtered view excluding internal procedures | Exposing a safe subset to external clients or HTTP adapters |

---

## createAPI()

### Signature

```typescript
function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: {
    readonly router: TRoutes;
    readonly context?: Ctx;
    readonly createContext?: (requestInfo?: RequestInfo) => Ctx;
    readonly plugins?: readonly Plugin<Ctx>[];
    readonly middleware?: readonly Middleware<Ctx>[];
    readonly eventEmitter?: EventEmitterAny;
  }
): TypedAPIInstance<Ctx, TRoutes>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `router` | `TRoutes` | The router to expose |
| `context` | `Ctx` | Static context (used if `createContext` not provided) |
| `createContext` | `(requestInfo?) => Ctx` | Factory for per-request context |
| `plugins` | `Plugin<Ctx>[]` | Plugins that extend context |
| `middleware` | `Middleware<Ctx>[]` | Global middleware applied to all procedures |
| `eventEmitter` | `EventEmitterAny` | Event emitter for the events system |

### Basic Usage

```typescript
import { initDRPC, createAPI, ok } from '@deessejs/server';

const d = initDRPC
  .context({ db: myDb })
  .create();

const listUsers = d.query({
  handler: async (ctx) => ok(await ctx.db.listUsers()),
});

const router = d.router({
  users: { list: listUsers },
});

const api = createAPI({ router });

// Call directly
const result = await api.users.list();
```

### With Context and Plugins

```typescript
const api = createAPI({
  router,
  context: { db: myDb, logger: myLogger },
  plugins: [auditPlugin, tracingPlugin],
  middleware: [loggingMiddleware],
  eventEmitter: myEmitter,
});
```

---

## createPublicAPI()

### Signature

```typescript
function createPublicAPI<Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): TypedAPIInstance<Ctx, PublicRouter<TRoutes>>
```

### What It Does

`createPublicAPI()` creates a **new API instance** with a filtered router that excludes:
- `internalQuery` procedures
- `internalMutation` procedures

Only `query` and `mutation` procedures are exposed.

### Why Filter Internal Procedures?

Internal procedures are designed for **server-to-server communication** within the same process. They should not be exposed to external clients:

```typescript
const healthCheck = d.internalQuery({
  handler: async (ctx) => ok({ status: ctx.db.health }),
});

const syncData = d.internalMutation({
  handler: async (ctx, args) => ok({ synced: true }),
});

const router = d.router({
  publicData: d.query({ ... }),
  _health: healthCheck,      // Internal — not exposed
  _sync: syncData,           // Internal — not exposed
});

// Full API — all procedures accessible
const fullApi = createAPI({ router });
await fullApi._health();  // Works

// Public API — internal procedures filtered out
const publicApi = createPublicAPI(fullApi);
publicApi._health;  // TypeScript error: _health not in PublicRouter
```

### Usage

```typescript
const fullApi = createAPI({
  router,
  context: { db: myDb },
});

const publicApi = createPublicAPI(fullApi);

// publicApi only has public procedures
// Internal procedures are not accessible
```

---

## TypedAPIInstance

The return type of `createAPI()` and `createPublicAPI()`:

```typescript
type TypedAPIInstance<Ctx, TRoutes extends Record<string, any>> =
  DecoratedRouter<TRoutes, Ctx> & {
    readonly [apiInternalSymbol]: {
      router: TRoutes;
      ctx: Ctx;
      plugins: readonly Plugin<Ctx>[];
      eventEmitter?: EventEmitterAny;
    };
  };
```

**Properties accessible on the API instance:**

| Property | Type | Description |
|----------|------|-------------|
| `router` | `TRoutes` | The underlying router |
| `ctx` | `Ctx` | The context object |
| `plugins` | `Plugin<Ctx>[]` | Registered plugins |
| `globalMiddleware` | `Middleware<Ctx>[]` | Global middleware |
| `eventEmitter` | `EventEmitterAny` | Event emitter (if configured) |
| `getEvents()` | `() => EventPayload[]` | Get event log |

**Access internal properties via symbol:**

```typescript
const internal = api[apiInternalSymbol];
console.log(internal.router);
console.log(internal.plugins);
```

---

## PublicRouter Type

The type used by `createPublicAPI()` to filter procedures:

```typescript
export type PublicRouter<TRoutes extends Router<any, any>> = {
  readonly [K in keyof TRoutes as [TRoutes[K]] extends [Procedure<any, any, any>]
    ? [TRoutes[K]] extends [{ type: "query" | "mutation" }]
      ? K
      : never
    : K]: [TRoutes[K]] extends [Router<any, any>]
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};
```

**Behavior:**
- If a key's value is a `query` or `mutation` procedure → kept
- If a key's value is `internalQuery` or `internalMutation` → filtered out
- If a key's value is a nested `Router` → recursively filtered
- All other keys → kept as-is

---

## Usage Examples

### Basic Query and Mutation

```typescript
import { createAPI } from '@deessejs/server';
import { createQueryBuilder } from '@deessejs/server';
import { ok } from '@deessejs/fp';
import { z } from 'zod';

interface Context {
  db: { users: Array<{ id: string; name: string }> };
}

const t = createQueryBuilder<Context>();

const listUsers = t.query({
  handler: async (ctx) => ok(ctx.db.users),
});

const getUser = t.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => {
    const user = ctx.db.users.find((u) => u.id === args.id);
    return ok(user ?? null);
  },
});

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const newUser = { id: String(ctx.db.users.length + 1), name: args.name };
    ctx.db.users.push(newUser);
    return ok(newUser);
  },
});

const router = t.router({
  users: { list: listUsers, get: getUser, create: createUser },
});

const api = createAPI({
  router,
  context: { db: { users: [{ id: "1", name: "Alice" }] } },
});

// Fully typed calls
const users = await api.users.list();
const user = await api.users.get({ id: "1" });
const created = await api.users.create({ name: "Bob" });
```

### With Internal Procedures

```typescript
import { createAPI, createPublicAPI } from '@deessejs/server';
import { createQueryBuilder } from '@deessejs/server';
import { ok } from '@deessejs/fp';
import { z } from 'zod';

const t = createQueryBuilder<Context>();

// Public procedure
const listUsers = t.query({
  handler: async () => ok([{ id: "1", name: "Alice" }]),
});

// Internal procedure (not exposed publicly)
const healthCheck = t.internalQuery({
  handler: async (ctx) => ok({ status: ctx.db.health }),
});

const syncData = t.internalMutation({
  args: z.object({ source: z.string() }),
  handler: async (ctx, args) => {
    console.log(`Syncing from ${args.source}`);
    return ok({ synced: true });
  },
});

const router = t.router({
  users: {
    list: listUsers,
    _health: healthCheck,
    _sync: syncData,
  },
});

const fullApi = createAPI({ router, context: { db: { health: "ok" } } });
const publicApi = createPublicAPI(fullApi);

// Full API — all procedures accessible
const health = await fullApi.users._health();
const sync = await fullApi.users._sync({ source: "external" });

// Public API — only public procedures
const users = await publicApi.users.list();
// publicApi.users._health;  // TypeScript error
```

### With Middleware and Plugins

```typescript
const loggingMiddleware = {
  handler: async (ctx, args, extra) => {
    console.log(`Calling ${extra.path}`);
    return extra.next();
  },
};

const tracingPlugin = {
  name: 'tracing',
  extend: (ctx) => ({ ...ctx, traceId: generateTraceId() }),
};

const api = createAPI({
  router,
  context: { db: myDb },
  middleware: [loggingMiddleware],
  plugins: [tracingPlugin],
});
```

---

## API Reference

### createAPI()

```typescript
function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: APIConfig<Ctx, TRoutes>
): TypedAPIInstance<Ctx, TRoutes>

interface APIConfig<Ctx, TRoutes extends Router<Ctx>> {
  router: TRoutes;
  context?: Ctx;
  createContext?: (requestInfo?: RequestInfo) => Ctx;
  plugins?: readonly Plugin<Ctx>[];
  middleware?: readonly Middleware<Ctx>[];
  eventEmitter?: EventEmitterAny;
}
```

### createPublicAPI()

```typescript
function createPublicAPI<Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): TypedAPIInstance<Ctx, PublicRouter<TRoutes>>
```

### filterPublicRouter()

```typescript
function filterPublicRouter<TRoutes extends Router<Ctx>, Ctx>(
  router: TRoutes
): PublicRouter<TRoutes>
```

Filters a router object at runtime (used internally by `createPublicAPI()`).

### TypedAPIInstance Properties

```typescript
interface TypedAPIInstance<Ctx, TRoutes> {
  // Access router
  readonly router: TRoutes;

  // Access context
  readonly ctx: Ctx;

  // Access plugins
  readonly plugins: readonly Plugin<Ctx>[];

  // Access global middleware
  readonly globalMiddleware: readonly Middleware<Ctx>[];

  // Access event emitter
  readonly eventEmitter?: EventEmitterAny;

  // Get event log
  getEvents(): EventPayload[];
}
```

### RequestInfo

```typescript
interface RequestInfo {
  readonly headers?: Record<string, string>;
  readonly method?: string;
  readonly url?: string;
}
```

Passed to `createContext` factory when using per-request context.

---

## Implementation Notes

### Initialization Order

1. `createAPI()` is called with configuration
2. Context factory is invoked once (either `createContext` or direct `context`)
3. Plugins are applied to extend context
4. Global middleware is registered
5. Router proxy is created for procedure access

### Event Queue

Both `createAPI()` and `createPublicAPI()` share the same event queue for efficiency:

```typescript
const queue = createPendingEventQueue();
```

Events emitted during procedure execution are queued and flushed on success, or discarded on error.

### Proxy-Based Access

The API instance uses JavaScript Proxy for property access:

```typescript
const handler: ProxyHandler<APIInstanceState<Ctx, TRoutes>> = {
  get(target, prop) {
    if (prop === 'router') return target.router;
    if (prop === 'ctx') return target.ctx;
    // ... other properties
    // For route access (e.g., api.users.list), delegate to router proxy
    return routerProxy[prop];
  },
};

return new Proxy(state, handler) as TypedAPIInstance<Ctx, TRoutes>;
```

### Symbol-Based Internal Access

Internal properties are accessed via `apiInternalSymbol`:

```typescript
export const apiInternalSymbol = Symbol.for("deesse.api.internal");

const internal = api[apiInternalSymbol];
// { router, ctx, plugins, eventEmitter }
```

This prevents internal properties from appearing in normal property enumeration.

### PublicRouter Filtering

The `PublicRouter` type uses conditional types to filter at the type level:

```typescript
[K in keyof TRoutes as [TRoutes[K]] extends [Procedure<any, any, any>]
  ? [TRoutes[K]] extends [{ type: "query" | "mutation" }]
    ? K
    : never
  : K]
```

At runtime, `filterPublicRouter()` recursively walks the router tree and only includes procedures where `type === "query" || type === "mutation"`.

---

## Status

**Implemented** — `createAPI()`, `createPublicAPI()`, and `filterPublicRouter()` are fully functional in `@deessejs/server`.