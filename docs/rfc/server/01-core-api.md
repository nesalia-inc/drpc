# RFC 01: Core API — `QueryBuilder` and `ContextBuilder`

## Summary

This RFC describes the entry points for DRPC: `createQueryBuilder()` and `defineContext()`. They provide factory methods for creating procedures and routers, with optional context, plugins, and events configuration.

**This is a server-only API.** It does not include HTTP adapters, networking, or client connections by default. `createAPI()` creates a local API instance that can be used directly on the server without any network or client. Adapters for HTTP, WebSocket, or IPC are **optional** — they are separate packages that can be used if needed, but nothing is required.

---

## Overview

### What This Is NOT

`@deessejs/server` (this package) is **not** a full-stack framework with built-in HTTP handling. It is the **server SDK** — the core for procedure execution locally.

Full-stack capabilities require separate adapter packages (see above).

### What This IS

DRPC is a **full-stack type-safe procedure framework**. The core package `@deessejs/server` is the **server SDK** that handles procedure execution locally.

Full-stack experience comes from separate adapter packages:
- `@deessejs/server-hono` — Hono adapter for HTTP
- `@deessejs/server-next` — Next.js adapter
- `@deessejs/server-electron` — Electron adapter
- `@deessejs/client-react` — React client with hooks

```typescript
import { createQueryBuilder, defineContext, createAPI, ok } from '@deessejs/server';

// Option 1: Simple usage with createQueryBuilder
const d = createQueryBuilder<Context>();

const router = d.router({
  hello: d.query({
    handler: async () => ok('Hello, world!'),
  }),
});

const api = createAPI({ router });

// Direct local call — works standalone without any adapter
const result = await api.hello();
```

**Use cases for standalone:**
- Server-to-server communication within the same process
- Testing procedures directly without network
- Internal microservices that call each other directly
- Building custom adapters for any transport

---

## How It Works

### Entry Point

Every DRPC application starts with `initDRPC.create()`:

```typescript
import { initDRPC } from '@deessejs/server';

const d = initDRPC.create();
```

This returns a `DRPCRoot` instance (`d`) which provides all the factory methods for creating procedures and routers.

### Builder Configuration

Before calling `.create()`, you can configure the builder with optional methods:

| Method | Purpose |
|--------|---------|
| `.context()` | Define context data available to all procedures |
| `.meta<T>()` | Declare the shape of procedure metadata |
| `.use(plugin)` | Register plugins that extend context |
| `.withEvents(events)` | Define events for the event system |

**These are all optional.** You can call `.create()` immediately for minimal setup.

### Meta — Procedure Metadata

**What it is:**
`meta` is arbitrary data attached to individual procedures. It is a TypeScript interface/type declared via `.meta<T>()` on the builder.

**Why use it:**
Meta lets middleware and hooks make decisions based on procedure-specific information. For example, an authorization middleware can check if a procedure requires authentication:

```typescript
interface MyMeta {
  authRequired?: boolean;
  role?: 'admin' | 'user';
}

const d = initDRPC
  .context({ userId: 'anonymous' })
  .meta<MyMeta>()
  .create();

// Middleware reads meta from each procedure
const authMw = d.middleware((opts) => {
  if (opts.meta?.authRequired && opts.ctx.userId === 'anonymous') {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next();
});

// Procedures declare their own meta
const router = d.router({
  publicData: d.query({
    meta: { authRequired: false },
    handler: async () => ok('everyone can see this'),
  }),
  adminPanel: d.query({
    meta: { authRequired: true, role: 'admin' },
    handler: async () => ok('secret admin data'),
  }),
});
```

**Key points:**
- `.meta<T>()` only declares the *shape* of meta (it's a type, not data)
- Each procedure sets its own `meta` value at definition time
- Middleware accesses meta via `opts.meta`
- Meta is optional per-procedure — procedures without explicit meta have `meta: undefined`

### Context — Procedure Runtime Data

**What it is:**
Context is data available to all procedures at runtime. It is defined via `.context()` on the builder.

**Why use it:**
Context provides shared state for procedures — database connections, user information, logging utilities, etc.

```typescript
const d = initDRPC
  .context({ userId: 'anonymous', db: myDatabase })
  .create();

const router = d.router({
  getUser: d.query({
    handler: async (ctx) => {
      // ctx.userId and ctx.db are available here
      const user = await ctx.db.findUser(ctx.userId);
      return ok(user);
    },
  }),
});
```

**Static Context:**
Pass data directly — it becomes the context for all procedures:

```typescript
const d = initDRPC
  .context({ userId: 'default-user', auditLog: [] })
  .create();
```

**Dynamic Context (per-request):**
Pass a factory function that receives request info and returns context:

```typescript
const d = initDRPC
  .context((req) => ({
    userId: req.headers['x-user-id'] ?? 'anonymous',
    auditLog: [],
    startedAt: Date.now(),
  }))
  .create();
```

This is useful when context varies per-request (e.g., authenticated user, tenant isolation).

**`RequestInfo` for dynamic context:**

```typescript
interface RequestInfo {
  readonly headers?: Record<string, string>;
  readonly method?: string;
  readonly url?: string;
}
```

**Key points:**
- Context is typed via TypeScript generics — type is inferred from the data passed to `.context()`
- Static context: same data for every procedure call
- Dynamic context: factory called per-request, enabling request-specific data
- Context can be overridden at `createAPI()` time: `createAPI({ router, context: { custom: 'value' } })`

### Meta vs Context — When to Use Which

Both `meta` and `context` are available in middleware via `opts.meta` and `opts.ctx`. But they serve different purposes:

| Aspect | Meta | Context |
|--------|------|---------|
| **Purpose** | Metadata about *how to run* a procedure | Data *needed by* a procedure |
| **Scope** | Per-procedure (each procedure has its own meta) | Global (all procedures share the same context) |
| **Set at** | Builder config + procedure definition | Builder config or per-request factory |
| **Use case** | Auth rules, permissions, rate limiting metadata | Database, user session, logger, request ID |
| **Typical content** | `{ authRequired: true, role: 'admin' }` | `{ db: Database, user: User, logger: Logger }` |
| **Middleware access** | `opts.meta` (per-procedure decision) | `opts.ctx` (shared data) |

**Example showing both:**

```typescript
const { d, createAPI } = defineContext<{
  db: Database;
  logger: Logger;
}>();

const router = t.router({
  // context says: here's the db connection for the procedure
  adminData: t.query({
    meta: { authRequired: true },
    handler: async (ctx) => {
      // ctx.db is from context (shared)
      const data = await ctx.db.adminOnlyData();
      return ok(data);
    },
  }),
});

// Middleware uses meta to decide, context to act
const authMw = t.middleware((opts) => {
  if (opts.meta?.authRequired && !opts.ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next();
});
```

**Rule of thumb:**
- **Context** = "What do procedures need to work?" (db connection, user session, config)
- **Meta** = "How should this procedure be treated?" (requires auth, is admin-only, rate limit tier)

---

## Entry Point Details

### createQueryBuilder()

```typescript
const t = createQueryBuilder<Context>();
```

Creates a `QueryBuilder` with methods for creating procedures. Context must be provided later via `createAPI()`.

```typescript
interface QueryBuilder<Ctx> {
  query<Args, Output>(config: QueryConfig<Ctx, Args, Output>): QueryProcedure<Ctx, Args, Output>;
  mutation<Args, Output>(config: MutationConfig<Ctx, Args, Output>): MutationProcedure<Ctx, Args, Output>;
  internalQuery<Output>(config: InternalConfig<Ctx, Output>): InternalQueryProcedure<Ctx, Output>;
  internalMutation<Args, Output>(config: InternalConfig<Ctx, Args, Output>): InternalMutationProcedure<Ctx, Args, Output>;
  router<TRoutes>(routes: TRoutes): TRoutes;
  middleware(config: MiddlewareConfig<Ctx>): Middleware<Ctx>;
  procedure: ProcedureBuilder<Ctx>;
}
```

### defineContext()

```typescript
const { t, createAPI } = defineContext<Context>({
  context: { db: myDb, logger: myLogger },
  plugins: [auditPlugin],
  events: myEvents,
});
```

Returns a `QueryBuilder` and a bound `createAPI` function that includes the configured context, plugins, and events.

```typescript
function defineContext<Ctx>(config: {
  context?: Ctx;
  createContext?: (req: RequestInfo) => Ctx;
  plugins?: Plugin<Ctx>[];
  events?: EventRegistry;
}): {
  t: QueryBuilder<Ctx>;
  createAPI: (config: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
}
```

**Key difference from `createQueryBuilder()`:**
- `createQueryBuilder()` — Context provided at `createAPI()` time
- `defineContext()` — Context and plugins configured upfront; `createAPI()` only needs the router

### createContextBuilder()

For fluent plugin registration:

```typescript
const { t, createAPI } = createContextBuilder<Context>()
  .use(auditPlugin())
  .use(timingPlugin())
  .build();
```

Returns the same `{ t, createAPI }` pattern as `defineContext()`.

### Type Inference Through the Chain

The `defineContext()` function uses TypeScript generics to track types:

```typescript
// defineContext infers Ctx from the context object
const { d, createAPI } = defineContext<{
  userId: string;
  name: string;
}>({
  context: { userId: '1', name: 'Alice' },
});

// t: QueryBuilder<{ userId: string; name: string }>
// createAPI is bound with the context
```

### Minimal Usage

```typescript
const d = createQueryBuilder();
```

No context needed — procedures can be created without it. Context is provided at `createAPI()` time.

### With Full Configuration (defineContext)

```typescript
const { d, createAPI } = defineContext<{
  userId: string;
  auditLog: string[];
}>({
  context: { userId: 'default-user', auditLog: [] },
  plugins: [auditPlugin({ prefix: '[APP]' }), timingPlugin()],
  events: myEvents,
});
```

### With Plugin Enrichment (createContextBuilder)

```typescript
const { t, createAPI } = createContextBuilder<Context>()
  .use(auditPlugin())
  .use(timingPlugin())
  .build();
```

Plugins can extend the context via their `extend()` method, adding properties like `auditLog`, `traceId`, etc.

### RequestInfo

When using dynamic context, the factory receives `RequestInfo`:

```typescript
interface RequestInfo {
  readonly headers?: Record<string, string>;
  readonly method?: string;
  readonly url?: string;
}
```

This allows per-request context based on HTTP headers, method, or URL.

### createAPI — Standalone Local Instance

`createAPI()` creates a **local API instance**. It does not:
- Start an HTTP server
- Listen on a port
- Require any transport adapter

```typescript
const api = createAPI({ router });

// Direct call — same process, no network
const result = await api.hello();
```

**Optional adapters** (separate packages) when needed:

```typescript
// Hono adapter (separate package)
import { createHonoHandler } from '@deessejs/server-hono';
const handler = createHonoHandler(api);

// Next.js adapter (separate package)
import { createNextHandler } from '@deessejs/server-next';

// Electron adapter (separate package)
import { createElectronHandler } from '@deessejs/server-electron';

// React client (separate package)
import { createDRPCClient } from '@deessejs/client-react';
```

All adapters are **independent packages**. Nothing is required — everything works standalone.

---

## Context

### Static Context

Pass an object directly to `.context()`:

```typescript
const d = initDRPC
  .context({ userId: 'default-user', auditLog: [] })
  .create();
```

The type is inferred from the data. TypeScript automatically infers:
```typescript
// Inferred: { userId: string; auditLog: string[] }
```

### Dynamic Context (Per-Request)

Pass a factory function for per-request context:

```typescript
const d = initDRPC
  .context((req) => ({
    userId: req.headers['x-user-id'] ?? 'anonymous',
    auditLog: [],
    startedAt: Date.now(),
  }))
  .create();
```

The function receives `RequestInfo` and returns context data. Type is inferred from the return value.

**Async Context Factory:**

For production scenarios requiring external data (e.g., Redis session lookup):

```typescript
const d = initDRPC
  .context(async (req) => {
    const session = await redis.getSession(req.headers['x-session-id']);
    return {
      userId: session?.userId ?? 'anonymous',
      permissions: session?.permissions ?? [],
    };
  })
  .create();
```

**`RequestInfo`:**
```typescript
interface RequestInfo {
  readonly headers?: Record<string, string>;
  readonly method?: string;
  readonly url?: string;
}
```

**Edge Runtime Compatibility:**

The builder is designed to work in edge environments (Cloudflare Workers, Vercel Edge). It avoids Node.js-specific APIs:
- No `process`, `Buffer`, or `crypto` dependencies in core types
- `RequestInfo` uses standard web APIs only
- Dynamic context factories can be sync or async without native dependencies

---

## Meta

### Defining Meta Type

Meta is a TypeScript interface, defined via `.meta<T>()`:

```typescript
interface MyMeta {
  authRequired?: boolean;
  role?: 'user' | 'admin';
}

const d = initDRPC
  .context<{ userId: string }>({ userId: '1' })
  .meta<MyMeta>()
  .create();
```

Meta values are attached per-procedure, not in the builder. The builder only declares the *shape*.

### Using Meta in Procedures

```typescript
const router = d.router({
  public: d.query({
    meta: { authRequired: false },
    handler: async () => ok('public data'),
  }),
  protected: d.query({
    meta: { authRequired: true, role: 'admin' },
    handler: async () => ok('secret data'),
  }),
});
```

Middleware accesses meta via `opts.meta`:

```typescript
const authMw = d.middleware((opts) => {
  if (opts.meta?.authRequired && !opts.ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next();
});
```

---

## Plugins

### Plugin Interface

```typescript
interface Plugin<Ctx> {
  readonly name: string;
  readonly args?: ZodType<unknown>;                              // Optional args schema
  readonly extend: (ctx: Ctx, args: unknown) => Partial<Ctx>;    // Enrich context
  readonly procedures?: () => PluginEnrichment<Ctx>;             // Add procedures to t
}

type PluginEnrichment<Ctx> = {
  [namespace: string]: {
    [methodName: string]: ProcedureConfig<Ctx, unknown, unknown>;
  };
};
```

### Defining a Plugin

```typescript
interface AuditCtx {
  auditLog: string[];
  log: (msg: string) => void;
}

const auditPlugin = <Ctx extends AuditCtx>(args: {
  prefix?: string;
}): Plugin<Ctx> => ({
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({
    auditLog: ctx.auditLog ?? [],
    log: (msg: string) => ctx.auditLog.push(`${args.prefix ?? '[audit]'}: ${msg}`),
  }),
});
```

**Key points:**
- `args` is optional — if provided, it's a Zod schema validated at `.use()` time
- `extend(ctx, args)` receives the current context and resolved args
- `procedures()` can add new namespaces/methods to `t`

### Using Plugins

```typescript
const d = initDRPC
  .context<AuditCtx>({ auditLog: [] })
  .use(auditPlugin({ prefix: '[APP]' }))
  .create();
```

Multiple plugins:
```typescript
const d = initDRPC
  .context({ auditLog: [] })
  .use(auditPlugin({ prefix: '[APP]' }))
  .use(timingPlugin())
  .use(retryPlugin({ maxRetries: 3 }))
  .create();
```

Plugins execute in order, each `extend()` building on the previous context.

---

## Events

### Defining Events

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    updated: event({ args: z.object({ id: z.string(), name: z.string() }) }),
  },
  post: {
    published: event({ args: z.object({ id: z.string(), title: z.string() }) }),
  },
});
```

### Using Events in Builder

```typescript
const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();
```

### Emitting Events

```typescript
const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = { id: 'new-user', email: args.email };
    ctx.send('user.created', { id: user.id, email: user.email });
    return ok(user);
  },
});
```

### Subscribing to Events

```typescript
api.eventEmitter?.on('user.created', (payload) => {
  console.log('[EVENT] User created:', payload.data);
});

api.eventEmitter?.on('user.*', (payload) => {
  console.log('[EVENT] Any user event:', payload.name);
});

api.eventEmitter?.on('*', (payload) => {
  console.log('[EVENT] Global:', payload.name);
});
```

---

## API Reference

### createQueryBuilder()

```typescript
function createQueryBuilder<Ctx>(): QueryBuilder<Ctx>
```

Creates a `QueryBuilder` without predefined context. Context is provided at `createAPI()` time.

```typescript
interface QueryBuilder<Ctx> {
  query<Args, Output>(config: QueryConfig<Ctx, Args, Output>): QueryProcedure<Ctx, Args, Output>;
  mutation<Args, Output>(config: MutationConfig<Ctx, Args, Output>): MutationProcedure<Ctx, Args, Output>;
  internalQuery<Output>(config: InternalConfig<Ctx, Output>): InternalQueryProcedure<Ctx, Output>;
  internalMutation<Args, Output>(config: InternalConfig<Ctx, Args, Output>): InternalMutationProcedure<Ctx, Args, Output>;
  router<TRoutes>(routes: TRoutes): TRoutes;
  middleware(config: MiddlewareConfig<Ctx>): Middleware<Ctx>;
  procedure: ProcedureBuilder<Ctx>;
}
```

### defineContext()

```typescript
function defineContext<Ctx>(config: {
  context?: Ctx;
  createContext?: (req: RequestInfo) => Ctx;
  plugins?: Plugin<Ctx>[];
  events?: EventRegistry;
}): {
  t: QueryBuilder<Ctx>;
  createAPI: (config: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
}
```

Creates a `QueryBuilder` with bound context, plugins, and events. The returned `createAPI()` only needs the router.

### createContextBuilder()

```typescript
function createContextBuilder<Ctx>(): ContextBuilder<Ctx>
```

Returns a `ContextBuilder` for fluent plugin registration:

```typescript
interface ContextBuilder<Ctx> {
  use<TPlugin extends Plugin<any>>(plugin: TPlugin): ContextBuilder<Ctx>;
  withEvents<NewEvents extends EventRegistry>(events: NewEvents): ContextBuilder<Ctx, NewEvents>;
  build(): {
    t: QueryBuilder<Ctx>;
    createAPI: (config: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
  };
}
```

### QueryConfig

```typescript
interface QueryConfig<TCtx, Args, Output> {
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

### MiddlewareConfig

```typescript
interface MiddlewareConfig<TCtx, TMeta> {
  meta?: TMeta;
  handler: (opts: {
    ctx: TCtx;
    type: ProcedureType;
    path: string;
    meta: TMeta | undefined;
    next: () => Promise<MiddlewareResult>;
  }) => Promise<MiddlewareResult>;
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

---

## Usage Examples

### Minimal

```typescript
import { createQueryBuilder, createAPI, ok } from '@deessejs/server';

const d = createQueryBuilder();

const router = t.router({
  hello: t.query({
    handler: async () => ok('Hello, world!'),
  }),
});

const api = createAPI({ router });
const result = await api.hello();
```

### With defineContext

```typescript
import { defineContext, createAPI, ok } from '@deessejs/server';
import { z } from 'zod';

// ============================================
// 1. Define plugins
// ============================================

interface AuditCtx {
  auditLog: string[];
  log: (msg: string) => void;
}

const auditPlugin = <Ctx extends AuditCtx>(args: {
  prefix?: string;
}): Plugin<Ctx> => ({
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({
    auditLog: ctx.auditLog ?? [],
    log: (msg: string) => ctx.auditLog.push(`${args.prefix ?? '[audit]'}: ${msg}`),
  }),
});

// ============================================
// 2. Define events
// ============================================

const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
  },
});

// ============================================
// 3. Create builder with defineContext
// ============================================

const { t, createAPI } = defineContext<AuditCtx>({
  context: { auditLog: [] },
  plugins: [auditPlugin({ prefix: '[APP]' })],
  events,
});

// ============================================
// 4. Define procedures
// ============================================

const listUsers = d.query({
  handler: async () => ok([{ id: '1', name: 'Alice' }]),
});

const createUser = d.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    ctx.log(`Creating user: ${args.name}`);
    return ok({ id: '1', name: args.name });
  },
});

// ============================================
// 5. Compose router
// ============================================

const router = d.router({
  users: {
    list: listUsers,
    create: createUser,
  },
});

// ============================================
// 6. Create API and call
// ============================================

const api = createAPI({ router });

const users = await api.users.list();
const created = await api.users.create({ name: 'Bob' });

console.log('Audit log:', api.ctx.auditLog);
```

---

## Implementation Notes

### Type Inference Flow

1. `defineContext({ context })` infers `Ctx` from the context object
2. `createQueryBuilder<Ctx>()` creates a `QueryBuilder<Ctx>`
3. `plugins` are applied via `defineContext()` or `ContextBuilder`
4. `createAPI({ router })` returns a `TypedAPIInstance<Ctx, Router<Ctx>>`

### Context Resolution

**Static context:**
- Used directly when creating API via `defineContext()` or `createAPI()`
- Can be overridden in `createAPI()` if needed

**Dynamic context:**
- Called per-request by adapter
- `RequestInfo` provided by HTTP layer
- Return value becomes context for that request

### Plugin Execution Order

Plugins execute in the order added via `.use()`. Each plugin's `extend()` builds on the context from the previous plugin.

### Middleware Composition Model

DRPC uses an **onion model** for middleware — each middleware wraps the ones that come after it:

```
Request
  │
  ▼
┌─────────────────────────┐
│ Middleware A            │
│   │                     │
│   ▼  ┌─────────────────┐│
│      │ Middleware B    ││
│      │   │             ││
│      │   ▼  ┌─────────┐││
│      │      │Handler │││
│      │      └─────────┘││
│      └─────────────────┘│
└─────────────────────────┘
```

This allows middleware to:
- Execute code before calling `next()`
- Execute code after `next()` returns (in reverse order on the way back)
- Wrap errors in a try/catch for rollback scenarios

```typescript
// Example: Transaction middleware with rollback
const transactionMw = d.middleware({
  handler: (ctx, args, extra) => {
    return extra.next({
      ctx: {
        ...ctx,
        tx: db.beginTransaction(),
      },
    }).catch((error) => {
      ctx.tx.rollback();
      throw error;
    });
  },
});
```

### Observability with OpenTelemetry

The builder integrates with OpenTelemetry for tracing:

```typescript
const d = initDRPC
  .context({ traceId: '' })  // Placeholder for injection
  .create();

// Trace ID is automatically injected by adapters
// ctx.traceId available in all procedures
```

Adapters (Hono, Next, Electron) automatically inject trace context.

---

## Open Questions

1. **Should `create()` require `.context()` to be called?** Currently optional, but might improve DX with explicit context requirement.

2. **Plugin args validation timing?** Validate at `.use(plugin(args))` time or at API creation?

3. **Custom transformers?** Support for transformers like superjson in `create()` options?

---

## Status

**Draft** — Not yet implemented.

## Ecosystem Packages

DRPC is a full-stack framework split into focused packages:

| Package | Purpose |
|---------|---------|
| `@deessejs/server` | **This package.** Server SDK for local procedure execution |
| `@deessejs/server-hono` | HTTP adapter using Hono |
| `@deessejs/server-next` | Next.js server adapter |
| `@deessejs/server-electron` | Electron main process adapter |
| `@deessejs/client-react` | React client with hooks |

All adapters are **independent packages**. The core `@deessejs/server` works completely standalone.
