# Plugin Procedure System: Typed Procedure Registration in Plugins

## TL;DR - The Developer Experience You Want

```typescript
// 1. Register plugins at context definition
const { t, createAPI } = defineContext({
  context: { db },
  plugins: [
    betterAuthPlugin({ instance: auth, client: authClient }),
    qstashPlugin({ token: process.env.QSTASH_TOKEN! }),
    redisPlugin({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! }),
  ],
});

// 2. Define your router normally
const appRouter = t.router({
  users: {
    list: t.query({ args: z.object({ limit: z.number().default(10) }), handler: async (ctx, args) => { ... } }),
    create: t.mutation({ args: z.object({ name: z.string() }), handler: async (ctx, args) => { ... } }),
  },
});

// 3. API is TYPED with plugin procedures merged in
const api = createAPI({ router: appRouter });

// TypeScript knows ALL procedures, including plugin ones:
api.auth.getSession()           // better-auth query (public)
api.auth.signIn({ email, password })  // better-auth mutation (public)
api.auth.adminListUsers({ limit: 100 })  // better-auth internal query (privileged)
api.users.list({ limit: 10 })   // your query
api.users.create({ name: "John" }) // your mutation

// Plugin context is automatically available:
ctx.auth.session    // in ALL procedures (public)
ctx.auth.instance   // ONLY in internalQuery/internalMutation (privileged)
ctx.cache.strings.get("key")   // redis - ONLY in internal procedures
ctx.qstash.queue("processImage", { imageId }) // qstash - from mutations
```

**The magic:** Plugins contribute procedures that appear in your typed API, with security enforced at the TypeScript level. `ctx.auth.instance` is architecturally impossible to use in a public query.

---

## 1. Desired Developer Experience (Detailed)

### 1.1 Setup: Register Plugins

```typescript
// src/server/index.ts
import { defineContext } from "@deessejs/server";
import { betterAuthPlugin } from "@deessejs/server/plugins/better-auth";
import { qstashPlugin } from "@deessejs/server/plugins/qstash";
import { redisPlugin } from "@deessejs/server/plugins/redis";

const { t, createAPI } = defineContext({
  context: { db },  // Your database context

  plugins: [
    // Auth plugin - contributes auth.* procedures + ctx.auth.session/instance
    betterAuthPlugin({
      instance: betterAuthServerInstance,
      client: betterAuthClient,
    }),

    // Background tasks - contributes ctx.qstash.queue()
    qstashPlugin({
      token: process.env.QSTASH_TOKEN!,
      baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
    }),

    // Cache - contributes ctx.cache.* (strings, hashes, etc.)
    redisPlugin({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    }),
  ],
});
```

### 1.2 Define Procedures

```typescript
const appRouter = t.router({

  // === Your user procedures ===

  users: {
    // PUBLIC QUERY - has ctx.auth.session only
    list: t.query({
      args: z.object({ limit: z.number().default(10) }),
      handler: async (ctx, args) => {
        // ctx.auth.session is available ✓
        // ctx.auth.instance is NOT available ✗ (TypeScript error)

        const users = await ctx.db.query.users.findMany({ limit: args.limit });
        return ok(users);
      },
    }),

    // PUBLIC MUTATION - has ctx.auth.session only
    create: t.mutation({
      args: z.object({ name: z.string(), email: z.string() }),
      handler: async (ctx, args) => {
        // ctx.auth.session is available ✓
        const user = await ctx.db.insert(users).values(args);
        return ok(user);
      },
    }),
  },

  // === Internal procedures (privileged) ===

  // INTERNAL QUERY - has ctx.auth.session AND ctx.auth.instance
  admin: {
    listAllUsers: t.internalQuery({
      args: z.object({ limit: z.number().default(100) }),
      handler: async (ctx, args) => {
        // ctx.auth.session is available ✓
        // ctx.auth.instance is available ✓ (from extendInternal)

        // Can access admin API
        const users = await ctx.auth.instance.api.admin.listUsers({ limit: args.limit });
        return ok(users);
      },
    }),
  },

  // INTERNAL MUTATION - can queue background tasks + access privileged ctx
  images: {
    uploadAndProcess: t.internalMutation({
      args: z.object({ data: z.string(), name: z.string() }),
      handler: async (ctx, args) => {
        // Upload image
        const imageId = await ctx.db.insert(images).values({ data: args.data, name: args.name });

        // Queue background processing via ctx.qstash (available in internal)
        await ctx.qstash.queue("processImage", { imageId });

        // Use redis cache in internal procedure
        await ctx.cache.strings.set(`image:${imageId}`, JSON.stringify({ processed: false }));

        return ok({ imageId, queued: true });
      },
    }),
  },
});
```

### 1.3 Use the API (Fully Typed)

```typescript
const api = createAPI({ router: appRouter });

// === Plugin procedures (auto-merged, fully typed) ===

// better-auth
const session = await api.auth.getSession();
//    ^? Result<Session | null>

await api.auth.signIn({ email: "user@example.com", password: "password123" });
//    ^? Result<Session>

// Can only call internalQuery if you have access to privileged context
// TypeScript error if you try: api.auth.adminListUsers is not accessible from client
// (internal procedures are server-only)

// === Your procedures ===

const users = await api.users.list({ limit: 10 });
//    ^? Result<User[]>

await api.users.create({ name: "John", email: "john@example.com" });
//    ^? Result<User>
```

### 1.4 Two-Tier Context Security (TypeScript Enforced)

```typescript
// PUBLIC query - TypeScript errors if you try to access privileged context
t.query({
  handler: async (ctx, args) => {
    ctx.auth.session    // ✓ Available
    ctx.auth.instance   // ✗ TypeScript error: Property 'instance' does not exist
    ctx.cache           // ✗ TypeScript error
    ctx.qstash          // ✗ TypeScript error
  }
});

// INTERNAL query - full access
t.internalQuery({
  handler: async (ctx, args) => {
    ctx.auth.session    // ✓ Available
    ctx.auth.instance   // ✓ Available
    ctx.cache           // ✓ Available
    ctx.qstash          // ✓ Available
  }
});
```

---

## 2. Current Architecture (For Reference)

### 2.1 Plugin Interface (Current - Limited)

```typescript
// packages/server/src/types.ts
export interface Plugin<Ctx> {
  readonly name: string;
  readonly extend: (ctx: Ctx) => Partial<Ctx>;  // Only extends context!
}
```

**Problem:** Plugins can only extend context, not add procedures.

### 2.2 Router Type

```typescript
// packages/server/src/types.ts
export type Router<
  Ctx = unknown,
  Routes extends Record<string, unknown> = Record<string, unknown>
> = {
  [K in keyof Routes & string]: Routes[K] extends Procedure<Ctx, infer _Args, infer _Output>
    ? Routes[K]
    : Routes[K] extends Record<string, unknown>
      ? Router<Ctx, Routes[K]>
      : never;
};
```

### 2.3 QueryBuilder (How Procedures Are Created)

```typescript
// packages/server/src/query/builder.ts
export class QueryBuilder<Ctx, Events extends EventRegistry = EventRegistry> {
  query<Args, Output>(config: QueryConfig<Ctx, Args, Output, Events>): QueryWithHooks<Ctx, Args, Output>
  mutation<Args, Output>(config: MutationConfig<Ctx, Args, Output, Events>): MutationWithHooks<Ctx, Args, Output>
  internalQuery<Output>(config: InternalQueryConfig<Ctx, Output, Events>): InternalQueryWithHooks<Ctx, Output>
  internalMutation<Args, Output>(config: InternalMutationConfig<Ctx, Args, Output, Events>): InternalMutationWithHooks<Ctx, Args, Output>
  router<Routes extends Router<Ctx>>(routes: Routes): Routes
}
```

### 2.4 Type Inference Pattern

```typescript
// packages/server/src/api/types/proxy.ts
export type ProcedureProxy<Ctx, Args, Output> = [Args] extends [never]
  ? () => Promise<Result<Output>>
  : (args: Args) => Promise<Result<Output>>;

export type RouterProxy<Ctx, Routes extends Router<Ctx, any>> = {
  readonly [K in keyof Routes]: Routes[K] extends Procedure<Ctx, infer Args, infer Output>
    ? ProcedureProxy<Ctx, Args, Output>
    : Routes[K] extends Router<Ctx, any>
      ? RouterProxy<Ctx, Routes[K]>
      : Routes[K];
};
```

---

## 3. Proposed Plugin Interface Enhancement

### 3.1 Extended Plugin Interface

```typescript
// NEW: Plugin procedure contributor
export interface PluginProcedure<Ctx> {
  readonly name: string;                    // Procedure name (e.g., "auth.getSession")
  readonly type: ProcedureType;            // "query" | "mutation" | "internalQuery" | "internalMutation"
  readonly argsSchema?: ZodType<unknown>;  // Optional Zod schema for args
  readonly handler: ProcedureHandler<Ctx>; // The procedure handler
}

export type ProcedureHandler<Ctx> = (
  ctx: Ctx,
  args: unknown
) => Promise<Result<unknown>>;

// ENHANCED Plugin interface
export interface Plugin<Ctx> {
  readonly name: string;

  // Context extension - available in ALL procedures
  readonly extend?: (ctx: Ctx) => Partial<Ctx>;

  // Context extension - available ONLY in internal procedures
  readonly extendInternal?: (ctx: Ctx) => Partial<Ctx>;

  // NEW: Contribute procedures
  readonly procedures?: readonly PluginProcedure<Ctx>[];
}
```

### 3.2 Plugin Procedure Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Plugin Registration                              │
│                                                                      │
│  const betterAuthPlugin = {                                          │
│    name: "better-auth",                                               │
│                                                                       │
│    extend: (ctx) => ({                                                │
│      auth: { session: null as Session | null }                       │
│    }),                                                                │
│                                                                       │
│    extendInternal: (ctx) => ({                                        │
│      auth: { instance: ctx.auth.instance }                            │
│    }),                                                                │
│                                                                       │
│    procedures: [                                                      │
│      { name: "auth.getSession", type: "query", handler: ... },       │
│      { name: "auth.signIn", type: "mutation", argsSchema: ..., handler: ... },       │
│    ],                                                                 │
│  };                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Type Inference Magic                              │
│                                                                      │
│  type AppRouter = {                                                  │
│    users: { list: Query<...>, create: Mutation<...> },              │
│    // ← Plugin procedures automatically merged!                      │
│    auth: { getSession: Query<...>, signIn: Mutation<...> },         │
│  };                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. QueryBuilder Enhancement

### 4.1 New Method: `createRouterFromProcedures`

```typescript
// packages/server/src/query/builder.ts

export class QueryBuilder<Ctx, Events extends EventRegistry = EventRegistry> {
  // ... existing methods ...

  // NEW: Create a router from plugin procedures (dot-notation)
  createRouterFromProcedures(
    procedures: readonly PluginProcedure<Ctx>[]
  ): Router<Ctx> {
    const router: Record<string, unknown> = {};

    for (const proc of procedures) {
      const pathParts = proc.name.split(".");
      let current = router;

      // Navigate/create nested path
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      // Create procedure at final key
      const finalKey = pathParts[pathParts.length - 1];
      current[finalKey] = this.createHookedProcedure(proc.type, {
        name: proc.name,
        argsSchema: proc.argsSchema,
        handler: proc.handler,
      } as any);
    }

    return router as Router<Ctx>;
  }
}
```

### 4.2 QueryBuilder Should Be Type-Only

Currently, `QueryBuilder` requires a context instance:

```typescript
// CURRENT (problematic)
const t = new QueryBuilder<Ctx, Events>(initialContext as Ctx, eventEmitter as any);
```

**Problem:** Couples definition time to request time.

**Solution:** Make QueryBuilder purely type-driven:

```typescript
// PROPOSED: Type-only QueryBuilder
export class QueryBuilder<Ctx, Events extends EventRegistry = EventRegistry> {
  // No runtime dependencies in constructor
  constructor();

  query<Args, Output>(config: QueryConfig<Ctx, Args, Output, Events>): QueryWithHooks<Ctx, Args, Output>
  // ...
}
```

---

## 5. Type Inference Design

### 5.1 Key Type Utilities

```typescript
// packages/server/src/api/types/plugin.ts

/**
 * Expand "auth.getSession" to { auth: { getSession: Procedure } }
 */
type ExpandProcedureName<
  Name extends string,
  Procedure
> = Name extends `${infer Prefix}.${infer Suffix}`
  ? { [K in Prefix]: ExpandProcedureName<Suffix, Procedure> }
  : { [K in Name]: Procedure };

/**
 * Convert flat PluginProcedure[] to nested Router type
 */
export type PluginProceduresToRouter<
  Ctx,
  Procedures extends readonly PluginProcedure<Ctx>[]
> = Procedures extends readonly []
  ? {}
  : Procedures extends readonly [infer First, ...infer Rest]
    ? First extends PluginProcedure<Ctx>
      ? ExpandProcedureName<First["name"], ProcedureFromPlugin<Ctx, First>> &
        PluginProceduresToRouter<Ctx, Rest extends readonly PluginProcedure<Ctx>[] ? Rest : []>
      : {}
    : {};

/**
 * Convert a PluginProcedure to a Procedure type
 */
export type ProcedureFromPlugin<
  Ctx,
  P extends PluginProcedure<Ctx>
> = P["type"] extends "query"
  ? QueryFromPlugin<P>
  : P["type"] extends "mutation"
  ? MutationFromPlugin<P>
  : P["type"] extends "internalQuery"
  ? InternalQueryFromPlugin<P>
  : P["type"] extends "internalMutation"
  ? InternalMutationFromPlugin<P>
  : never;

/**
 * Flatten all PluginProcedures from an array of Plugins
 */
export type FlattenPluginProcedures<
  Plugins extends readonly Plugin<Ctx>[]
> = Plugins extends readonly []
  ? []
  : Plugins extends readonly [infer First, ...infer Rest]
    ? First extends Plugin<Ctx>
      ? [
          ...(First["procedures"] extends readonly PluginProcedure<Ctx>[]
            ? First["procedures"]
            : []),
          ...FlattenPluginProcedures<Rest extends readonly Plugin<Ctx>[] ? Rest : []>
        ]
      : []
    : [];

/**
 * Merge plugin procedures into user router
 */
export type WithPluginProcedures<
  Ctx,
  UserRouter extends Router<Ctx>,
  Plugins extends readonly Plugin<Ctx>[]
> = UserRouter & PluginProceduresToRouter<
  Ctx,
  FlattenPluginProcedures<Plugins>
>;
```

### 5.2 Usage in defineContext

```typescript
// packages/server/src/context/builder.ts

export function defineContext<
  Ctx extends object,
  Events extends EventRegistry,
  const Plugins extends readonly Plugin<Ctx>[]
>(config: DefineContextConfig<Ctx, Events> & { plugins?: Plugins }) {
  const { context, plugins = [] } = config;

  // Type inference: AppRouter includes user router + plugin procedures
  type AppRouter = WithPluginProcedures<Ctx, Router<Ctx>, Plugins>;

  return {
    t: new QueryBuilder<Ctx, Events>(),
    createAPI: (apiConfig: { router: AppRouter; middleware?: Middleware<Ctx>[] }) => {
      // Merge plugin procedures with user router at runtime
      const mergedRouter = mergeWithPluginProcedures(
        apiConfig.router as Router<Ctx>,
        plugins
      );

      return createAPI({
        ...apiConfig,
        router: mergedRouter,
      }) as TypedAPIInstance<Ctx, AppRouter>;
    },
  } as const;
}
```

### 5.3 Runtime Merge Function

```typescript
// packages/server/src/api/factory/plugins.ts

/**
 * Merge plugin procedures into the user router at runtime
 */
export function mergeWithPluginProcedures<Ctx, R extends Router<Ctx>>(
  userRouter: R,
  plugins: readonly Plugin<Ctx>[]
): Router<Ctx> {
  const pluginRouter: Record<string, unknown> = {};

  for (const plugin of plugins) {
    if (!plugin.procedures || plugin.procedures.length === 0) continue;

    // Convert plugin procedures to router structure
    const proceduresRouter = createRouterFromProcedures(plugin.procedures);

    // Deep merge
    deepMerge(pluginRouter, proceduresRouter);
  }

  // Merge user router with plugin router
  return deepMerge(userRouter as Record<string, unknown>, pluginRouter) as Router<Ctx>;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (key in result && isPlainObject(result[key]) && isPlainObject(source[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

---

## 6. Two-Tier Context with Plugin Procedures

### 6.1 Security Model

Plugin procedures must respect the Two-Tier Context:

| Plugin Procedure Type | `extend()` Applied | `extendInternal()` Applied |
|-----------------------|-------------------|---------------------------|
| `query` | ✅ Yes | ❌ No |
| `mutation` | ✅ Yes | ❌ No |
| `internalQuery` | ✅ Yes | ✅ Yes |
| `internalMutation` | ✅ Yes | ✅ Yes |

### 6.2 Implementation in createAPI

```typescript
// packages/server/src/api/factory/api.ts

async function executeRoute<Ctx>(
  route: string,
  args: unknown,
  routeCtx: ExecuteRouteContext<Ctx>
): Promise<Result<unknown>> {
  const { procedure, router } = findProcedure(routeCtx.router, route.split("."));

  // Determine if this is an internal procedure
  const isInternal =
    procedure.type === "internalQuery" ||
    procedure.type === "internalMutation";

  // Build context with appropriate plugin extensions
  let ctx = { ...routeCtx.ctx };

  // Apply base extensions (all procedures get this)
  for (const plugin of routeCtx.plugins) {
    if (plugin.extend) {
      Object.assign(ctx, plugin.extend(ctx));
    }
  }

  // Apply internal extensions (ONLY for internal procedures)
  if (isInternal) {
    for (const plugin of routeCtx.plugins) {
      if (plugin.extendInternal) {
        Object.assign(ctx, plugin.extendInternal(ctx));
      }
    }
  }

  // Execute procedure with full context
  return executeProcedure(procedure, ctx, args, routeCtx);
}
```

---

## 7. Complete Plugin Examples

### 7.1 better-auth Plugin

```typescript
// packages/server/plugins/better-auth.ts

import { Plugin } from "@deessejs/server";
import { z } from "zod";

export interface BetterAuthPluginOptions<Ctx> {
  instance: BetterAuthInstance;
  client: BetterAuthClient;
  sessionSchema?: ZodType<Session>;
}

export const createBetterAuthPlugin = <Ctx>({
  instance,
  client,
  sessionSchema,
}: BetterAuthPluginOptions<Ctx>): Plugin<Ctx> => {
  return {
    name: "better-auth",

    // Session available in ALL procedures (public read)
    extend: (ctx) => ({
      auth: {
        session: null as Session | null, // Populated per-request
      },
    }),

    // Instance available ONLY in internal procedures
    extendInternal: (ctx) => ({
      auth: {
        instance,  // Full better-auth instance for admin operations
      },
    })),

    // Contribute procedures via flat array
    procedures: [
      {
        name: "auth.getSession",
        type: "query" as const,
        handler: async (ctx, _args) => {
          // ctx.auth.session is available (from extend)
          // ctx.auth.instance is NOT available (TypeScript error)
          return ok(ctx.auth.session);
        },
      },
      {
        name: "auth.signIn",
        type: "mutation" as const,
        argsSchema: z.object({
          email: z.string().email(),
          password: z.string().min(8),
        }),
        handler: async (ctx, args) => {
          const session = await instance.api.signIn({
            email: args.email,
            password: args.password,
          });
          return ok(session);
        },
      },
      {
        name: "auth.adminListUsers",
        type: "internalQuery" as const,
        argsSchema: z.object({ limit: z.number().default(100) }),
        handler: async (ctx, args) => {
          // ctx.auth.instance IS available here (from extendInternal)
          const users = await ctx.auth.instance.api.admin.listUsers({
            limit: args.limit,
          });
          return ok(users);
        },
      },
    ],
  };
};
```

### 7.2 QStash Plugin (Background Tasks)

```typescript
// packages/server/plugins/qstash.ts

import { Plugin } from "@deessejs/server";
import { z } from "zod";

export interface QStashPluginOptions {
  token: string;
  baseURL: string;
}

export const qstashPlugin = <Ctx>({
  token,
  baseURL,
}: QStashPluginOptions): Plugin<Ctx> => {
  const client = new QStashClient({ token, baseURL });

  return {
    name: "qstash",

    // qstash access only in internal procedures
    extendInternal: () => ({
      qstash: {
        queue: async <T>(procedure: string, args: T, options?: QueueOptions) => {
          const result = await client.publishJSON({
            url: `${baseURL}/api/qstash/${procedure}`,
            body: { args },
            retries: options?.retries,
            delay: options?.delay,
          });
          return { messageId: result.messageId };
        },
        client,  // Direct access if needed
      },
    }),

    procedures: [
      // Define task procedures that QStash will call
      // These are registered as internal procedures
      {
        name: "qstash.processImage",
        type: "internalMutation" as const,
        argsSchema: z.object({ imageId: z.string() }),
        handler: async (ctx, args) => {
          const image = await ctx.db.query.images.find(args.imageId);
          await processImage(image);
          return ok({ processed: true });
        },
      },
    ],
  };
};
```

### 7.3 Redis Plugin (Caching)

```typescript
// packages/server/plugins/redis.ts

import { Plugin } from "@deessejs/server";
import { Redis } from "@upstash/redis";

export interface RedisPluginOptions {
  url: string;
  token: string;
}

export const redisPlugin = <Ctx>({
  url,
  token,
}: RedisPluginOptions): Plugin<Ctx> => {
  const redis = new Redis({ url, token });

  return {
    name: "redis",

    // Redis access only in internal procedures
    extendInternal: () => ({
      cache: {
        strings: {
          get: (key: string) => redis.get<string>(key),
          set: (key: string, value: string, opts?: { ex?: number }) =>
            redis.set(key, value, opts),
          del: (...keys: string[]) => redis.del(...keys),
        },
        hashes: {
          get: (key: string, field: string) => redis.hget<string>(key, field),
          set: (key: string, field: string, value: string) =>
            redis.hset(key, field, value),
          getAll: (key: string) => redis.hgetall(key),
        },
        lists: {
          push: (key: string, ...values: string[]) => redis.lpush(key, ...values),
          range: (key: string, start: number, stop: number) =>
            redis.lrange(key, start, stop),
        },
        // ... other data types
        raw: redis,  // Direct access for advanced commands
      },
    }),
  };
};
```

---

## 8. Implementation Plan

### Phase 1: Core Infrastructure

1. **Add `PluginProcedure` type**
   - Define `PluginProcedure<Ctx>` interface

2. **Extend `Plugin` interface**
   - Add `procedures?: readonly PluginProcedure<Ctx>[]`
   - Add `extendInternal?: (ctx: Ctx) => Partial<Ctx>`

3. **Add `createRouterFromProcedures` to QueryBuilder**
   - Convert flat `PluginProcedure[]` to nested `Router`

4. **Implement `mergeWithPluginProcedures`**
   - Runtime merge of plugin procedures into user router

### Phase 2: Type Inference

5. **Add plugin types in `src/api/types/`**
   - `PluginProceduresToRouter<Ctx, Procedures>`
   - `ExpandProcedureName<Name, Procedure>`
   - `FlattenPluginProcedures<Plugins>`

6. **Update `defineContext` signature**
   - Add generic parameter for plugins array
   - Return type includes merged router type

### Phase 3: Security

7. **Update `executeRoute`**
   - Check procedure type for internal flag
   - Apply `extendInternal` only for internal procedures

8. **Add tests**
   - Plugin procedure creation
   - Type inference verification
   - Security: internal not available in public

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add `PluginProcedure`, extend `Plugin` interface |
| `src/query/builder.ts` | Add `createRouterFromProcedures` |
| `src/api/factory/plugins.ts` | Add `mergeWithPluginProcedures` |
| `src/api/types/plugin.ts` | NEW: Plugin type inference utilities |
| `src/context/builder.ts` | Update `defineContext` for plugin inference |
| `src/api/factory/api.ts` | Apply `extendInternal` for internal procedures |
| `src/api/factory/route.ts` | Check procedure type for context building |

---

## 10. Open Questions

1. **Should plugins be able to add middlewares?**
   - Plugin middlewares could auto-bind to plugin procedures

2. **How to handle procedure conflicts?**
   - User router has `auth.getSession`, plugin also defines it
   - Should plugin procedures have lower priority?

3. **Should `procedures` support Zod schema inference from handler?**
   - Like tRPC's `input` inference
   - Currently explicit `argsSchema` required

---

## 11. See Also

- [Two-Tier Context System](../../context/README.md) - Security model for extend/extendInternal
- [Plugin Enrich `t`](./README.md) - The behavior enrichment approach
- [Plugin Typing Solutions](./plugin-typing-solutions.md) - All 10 solutions for TypeScript typing
- [drpc Plugin Architecture](../plugins/drpc-plugins.md) - Current limitations analysis
- [better-auth Plugin](../plugins/better-auth-plugin.md) - Desired DX for auth plugins
- [QStash Plugin](../plugins/qstash-plugin.md) - Desired DX for task plugins
- [Redis Plugin](../plugins/redis-plugin.md) - Desired DX for cache plugins
- Senior Rules: Typing, Lifecycle, API, Event, Middleware, Performance
