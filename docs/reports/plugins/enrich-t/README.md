# Plugin Enriches `t`: Adding New Behaviors, Not Context

## Core Concept

**Important:** Enriching `t` (the QueryBuilder) is NOT about adding context. Context is added via `extend` and `extendInternal`.

**Plugin `t` enrichment** is for adding **new procedural behaviors** - new ways to create procedures beyond the base `query`, `mutation`, `internalQuery`, `internalMutation`.

---

## Context vs Behavior: The Distinction

| What | How Added | Examples |
|------|-----------|----------|
| **Context** | Plugin's `extend` or `extendInternal` | `ctx.auth.session`, `ctx.cache.get()`, `ctx.qstash.queue()` |
| **Behavior** | Plugin enriches `t` | `t.task()` for background procedures |

### Context: Via `extend` / `extendInternal`

```typescript
// plugins/add to context, NOT to t
const redisPlugin = {
  name: "redis",
  extendInternal: () => ({
    cache: {
      strings: { get: (key) => redis.get(key), set: (k, v) => redis.set(k, v) },
      hashes: { get: (k, f) => redis.hget(k, f), set: (k, f, v) => redis.hset(k, f, v) },
    },
  }),
};
```

### Behavior: Via `t` Enrichment

```typescript
// plugins enrich t with NEW BEHAVIORS
const qstashPlugin = {
  name: "qstash",
  // ✨ Adds t.qstash.task() - a NEW way to create procedures
  enrichT: (t) => ({
    qstash: {
      task: (config: TaskConfig) => {
        return t.internalMutation({
          name: config.name,
          args: config.args,
          handler: config.handler,
          metadata: { [TASK_SYMBOL]: true, retries: config.retries },
        });
      },
    },
  }),
};
```

---

## What `t` Enrichment IS For

`t` enrichment adds **new procedure creation methods** that don't exist in the base QueryBuilder.

### Examples of behaviors to add via `t` enrichment:

| Behavior | Why as `t` enrichment | Example |
|----------|----------------------|---------|
| **Background tasks** | Creates internal mutation with task metadata | `t.qstash.task({ name: "processImage", handler: ... })` |
| **Scheduled procedures** | Creates procedure with cron/metadata | `t.cron.scheduled({ cron: "0 9 * * *", handler: ... })` |
| **WebSocket subscriptions** | Creates a subscription procedure type | `t.ws.subscription({ topic: "users", handler: ... })` |
| **Rate-limited procedures** | Wraps procedure with rate limit metadata | `t.rateLimit({ limit: 100, window: "1m", ... })` |

---

## What `t` Enrichment Is NOT For

**It is NOT for adding procedures that should be in `ctx`.**

```typescript
// ✗ WRONG: These should NOT be on t
t.auth.getSession()   // ✗ Should be ctx.auth.session (context)
t.cache.get(key)      // ✗ Should be ctx.cache.strings.get(key) (context)
t.qstash.queue(...)   // ✗ Should be ctx.qstash.queue() (context)

// ✓ CORRECT: These ARE on t (behaviors)
t.qstash.task({ name: "processImage", handler: async (ctx, args) => { ... } })
t.cron.scheduled({ cron: "0 9 * * *", handler: async (ctx) => { ... } })
```

---

## Correct Mental Model

```
defineContext({ context })
  .use(pluginA)  // adds: t.pluginA.method()
  .use(pluginB)  // adds: t.pluginB.method()
  .build()
  → returns { t, createAPI }

Plugin
├── extend(ctx) → { auth: { session } }         ← Context: available in ALL procedures
├── extendInternal(ctx) → { cache: {...} }     ← Context: available in INTERNAL procedures
└── enrichT → { qstash: { task() }, cron: { scheduled() } }  ← Behavior: namespaced!
```

---

## ⚠️ Namespace Collision: The Risk

Unlike `ctx` (which is nested: `ctx.redis.get`), `t` enrichment risks **flat namespace pollution**:

```typescript
// Problem: Two plugins both add t.task()
const pluginA = { enrichT: (t) => ({ task: (...) => ... }) };
const pluginB = { enrichT: (t) => ({ task: (...) => ... }) };

// Collision! Which one wins?
t.task({ ... });
```

### Solution: Mandatory Namespacing

**Rule:** All enriched methods MUST be namespaced by plugin name.

```typescript
// ✗ WRONG: Direct method name (collision risk)
enrichT: (t) => ({ task: (...) => ... })

// ✓ CORRECT: Namespaced by plugin name
enrichT: (t) => ({
  qstash: {
    task: (...) => ...  // Access: t.qstash.task()
  },
  cron: {
    scheduled: (...) => ...  // Access: t.cron.scheduled()
  }
})
```

This ensures: `t.<pluginName>.<method>()` pattern everywhere.

---

## ⚠️ Metadata Leakage: Symbol-Based Keys

In your `t.task` example, you use `metadata: { _isTask: true }`. **This is dangerous** - users can accidentally overwrite framework flags.

### Problem

```typescript
// User accidentally overwrites framework metadata
const procedure = t.qstash.task({
  name: "process",
  handler: async (ctx, args) => { ... },
  metadata: { _isTask: false }  // ← Breaks the framework!
});
```

### Solution: Use Symbols for Framework Keys

```typescript
// packages/server/src/plugins/symbols.ts

// Symbol keys that cannot be accidentally overwritten
export const TASK_SYMBOL = Symbol.for("deesse.plugin.task");
export const SCHEDULED_SYMBOL = Symbol.for("deesse.plugin.scheduled");
export const RETRY_COUNT_SYMBOL = Symbol.for("deesse.plugin.retry");
```

```typescript
// Plugin uses Symbol keys
const plugin = {
  enrichT: (t) => ({
    qstash: {
      task: (config) => {
        return t.internalMutation({
          ...config,
          metadata: {
            [TASK_SYMBOL]: true,  // ← Cannot be overwritten by user
            [RETRY_COUNT_SYMBOL]: config.retries,
          },
        });
      },
    },
  }),
};
```

Now users can safely add their own metadata without breaking framework:

```typescript
// User metadata is separate
t.qstash.task({
  name: "process",
  handler: async (ctx, args) => { ... },
  metadata: { customField: "value" }  // ← Safe, doesn't conflict
});
```

---

## ⚠️ Middleware Integration: Base vs Decorated

When `enrichT` creates a procedure, should it automatically inherit global middlewares?

### Option A: Base Procedures (Raw)

```typescript
// Middlewares NOT applied - plugin controls everything
enrichT: (t) => ({
  qstash: {
    task: (config) => {
      const proc = t.internalMutation(config);
      // Middlewares NOT applied here
      return proc;
    },
  },
}));
```

### Option B: Decorated Procedures (Pre-applied Middleware)

```typescript
// Middlewares ARE applied automatically
enrichT: (t) => ({
  qstash: {
    task: (config) => {
      // t.internalMutation internally applies middlewares
      return t.internalMutation({
        ...config,
        // But plugin can add its own middleware too
        middleware: [...config.middleware, taskMiddleware],
      });
    },
  },
}));
```

### Recommended: Option B (Decorated)

**Rationale:** Developers expect global middlewares (logging, auth, metrics) to apply to ALL procedures, including task procedures.

```typescript
// User expects logging middleware to run for tasks too
defineContext({
  context: { db },
  middleware: [loggingMiddleware, authMiddleware],
  plugins: [qstashPlugin()],
});

// Both should have logging + auth:
// - t.query({ ... })         → ✓ middleware applied
// - t.mutation({ ... })      → ✓ middleware applied
// - t.qstash.task({ ... })   → ✓ middleware applied
```

---

## Plugin Interface

`plugin()` is a higher-order function that takes the plugin name and its configuration (including custom args). Everything happens in a single call.

```typescript
// plugin() is a higher-order function
// - First arg: plugin name
// - Second arg: plugin config with custom args
export function plugin<Args extends Record<string, unknown>>(
  name: string,
  config: {
    // Custom args passed to hooks (e.g., token, url, etc.)
    [K in keyof Args]: Args[K];
  } & PluginConfig<Args>
): PluginInstance {
  return {
    name,
    extend: config.extend ? (ctx: any) => config.extend(ctx, config as Args) : undefined,
    extendInternal: config.extendInternal ? (ctx: any) => config.extendInternal(ctx, config as Args) : undefined,
    enrichT: config.enrichT ? (t: any) => config.enrichT(t, config as Args) : undefined,
  };
}

export interface PluginConfig<Args> {
  // Context: available in ALL procedures via ctx.*
  extend?: (ctx: any, args: Args) => Partial<any>;

  // Context: available in INTERNAL procedures via ctx.*
  extendInternal?: (ctx: any, args: Args) => Partial<any>;

  // ✨ Behavior: namespaced methods that create procedures
  enrichT?: (
    t: QueryBuilder<any>,
    args: Args
  ) => Record<string, Record<string, (...args: any[]) => ProcedureWithHooks<any, any, any>>>;
}

export interface PluginInstance {
  readonly name: string;
  extend?: (ctx: any) => Partial<any>;
  extendInternal?: (ctx: any) => Partial<any>;
  enrichT?: (t: any) => Record<string, Record<string, (...args: any[]) => ProcedureWithHooks<any, any, any>>>;
}
```

### Usage

```typescript
// ✨ Single call: plugin(name, { ...args, ...hooks })
export const qstashPlugin = plugin("qstash", {
  // Custom args
  token: process.env.QSTASH_TOKEN!,
  baseURL: process.env.QSTASH_BASE_URL!,

  // Hooks receive args
  extendInternal: (ctx, args) => {
    const client = new QStashClient({ token: args.token, baseURL: args.baseURL });
    return () => ({
      qstash: {
        queue: async <T>(procedure: string, args: T) => { ... }
      }
    });
  },

  enrichT: (t, args) => ({
    qstash: {
      task: (config) => {
        return t.internalMutation({ ... });
      }
    }
  }),
});
```

---

## Recommended Pattern: `defineContext().use().use()...`

We keep `defineContext()` but it returns a chainable builder. Plugins are added via `.use()` calls, allowing progressive TypeScript inference.

```typescript
// defineContext returns a chainable builder
function defineContext<Ctx extends object>(config: {
  context: Ctx;
}): QueryBuilderChain<Ctx, []> {
  return new QueryBuilderChain<Ctx, []>(config.context);
}
```

### The Chain Class

```typescript
class QueryBuilderChain<
  Ctx,
  Plugins extends PluginInstance<any>[]  // ← Generic tracks plugin instances added so far
> {
  constructor(
    private context: Ctx,
    private plugins: Plugins = [] as any
  ) {}

  // Add a plugin instance (already configured via plugin() helper)
  use<TNew extends PluginInstance<any>>(
    pluginInstance: TNew  // ← Already configured instance, NOT a factory
  ): QueryBuilderChain<Ctx, [...Plugins, TNew]> {
    return new QueryBuilderChain(this.context, [...this.plugins, pluginInstance]);
  }

  // Build returns enriched t
  build(): {
    t: QueryBuilder<Ctx> & InferEnrichments<Plugins>;
    createAPI: (config: { router: Router<Ctx> }) => TypedAPIInstance<Ctx>;
  } {
    // Apply all plugins and return enriched t
    let enrichedT = new QueryBuilder<Ctx>(this.context);
    for (const plugin of this.plugins) {
      if (plugin.enrichT) {
        Object.assign(enrichedT, plugin.enrichT(enrichedT));
      }
    }
    return {
      t: enrichedT,
      createAPI: (config) => createAPIInstance({
        ...config,
        plugins: this.plugins,
      }),
    };
  }
}
```

### Type Inference Magic

```typescript
// Each .use() adds to the plugins tuple type
type Step0 = QueryBuilderChain<Ctx, []>;           // No plugins
type Step1 = Step0.use(QStashPlugin);               // [...[], QStashPlugin]
type Step2 = Step1.use(RedisPlugin);                // [...[QStashPlugin], RedisPlugin]

// InferEnrichments extracts types from the tuple
type InferEnrichments<Plugins> = {
  [K in keyof Plugins]: Plugins[K] extends Plugin<any, infer E>
    ? E
    : never
}[number] extends infer E
  ? E
  : never;

// Final t type: QueryBuilder & QStashEnrichment & RedisEnrichment
```

### Usage

```typescript
// ✨ Chain pattern: defineContext().use().use().build()
// qstashPlugin is already a configured instance (result of plugin() helper)
const { t, createAPI } = defineContext({ context: { db } })
  .use(qstashPlugin)  // ← already configured instance
  .use(redisPlugin)   // ← already configured instance
  .build();

// t is enriched with all plugin methods
t.qstash.task({
  name: "processImage",
  args: z.object({ imageId: z.string() }),
  handler: async (ctx, args) => { ... }
});

// Base methods still work
t.query({ ... });
t.mutation({ ... });
```

### Why This Works

1. **Each `.use()` returns a new chain** with the plugin added to the tuple type
2. **TypeScript tracks the full tuple** `Plugins extends Plugin<any, any>[]`
3. **InferEnrichments** extracts enrichment types from the tuple
4. **`.build()` returns** `QueryBuilder<Ctx> & InferEnrichments<Plugins>`
5. **Autocomplete and type checking** work because TypeScript knows all plugins

### Functional Pattern (No Mutation)

Each `.use()` returns a new instance (no mutation), which is important for HMR:

```typescript
// ✗ Bad: mutation can cause issues with HMR
class QueryBuilderChain {
  use(plugin) {
    this.plugins.push(plugin);  // Mutates!
    return this;
  }
}

// ✓ Good: returns new instance
class QueryBuilderChain {
  use(plugin) {
    return new QueryBuilderChain(this.context, [...this.plugins, plugin]);
  }
}
```

---

## Registry Pattern: Enrichment Definition

For better documentation and OpenAPI generation, consider this refinement:

```typescript
enrichT: (t) => ({
  qstash: {
    task: t.defineEnrichment({
      // Meta-information
      type: 'mutation',           // Base procedure type
      name: 'qstash.task',        // For docs/OpenAPI
      description: 'Queue a background task',

      // Validation
      validate: (config: unknown) => {
        if (!config.name) throw new Error("name required");
        return config as TaskConfig;
      },

      // Transform to actual procedure
      create: (t, config: TaskConfig) => {
        return t.internalMutation({
          name: config.name,
          args: config.args,
          handler: config.handler,
          metadata: {
            [TASK_SYMBOL]: true,
            [RETRY_COUNT_SYMBOL]: config.retries,
          },
        });
      },
    }),
  },
}));
```

This allows the framework to:
- Generate OpenAPI specs automatically
- Validate enrichment configurations
- Document all custom behaviors

---

## Complete Plugin Example: QStash

```typescript
// packages/server/plugins/qstash/src/index.ts

import { plugin, QueryBuilder } from "@deessejs/server";
import { z } from "zod";

// Framework-safe Symbol keys
const TASK_SYMBOL = Symbol.for("deesse.plugin.task");
const RETRY_COUNT_SYMBOL = Symbol.for("deesse.plugin.retry");

// ✨ Single call: plugin(name, { ...args, ...hooks })
export const qstashPlugin = plugin("qstash", {
  // Custom args
  token: process.env.QSTASH_TOKEN!,
  baseURL: process.env.QSTASH_BASE_URL!,

  // ✨ Context: available in internal procedures via ctx.qstash
  extendInternal: (ctx, args) => {
    const client = new QStashClient({ token: args.token, baseURL: args.baseURL });
    return () => ({
      qstash: {
        queue: async <T>(procedure: string, data: T, options?: { retries?: number; delay?: string }) => {
          return client.publishJSON({
            url: `${args.baseURL}/api/qstash/${procedure}`,
            body: { args: data },
            retries: options?.retries,
            delay: options?.delay,
          });
        },
        client,
      },
    });
  },

  // ✨ Behavior: adds t.qstash.task() method
  enrichT: (t, args) => ({
    qstash: {
      task: (config: {
        name: string;
        args?: ZodType;
        retries?: number;
        handler: (ctx: any, args: any) => Promise<Result<any>>;
      }) => {
        return t.internalMutation({
          name: config.name,
          args: config.args || z.object({}),
          handler: config.handler,
          // Safe metadata using Symbols
          metadata: {
            [TASK_SYMBOL]: true,
            [RETRY_COUNT_SYMBOL]: config.retries ?? 3,
          },
        });
      },
    },
  }),
});
```

    // ✨ Context: available in internal procedures via ctx.qstash
    extendInternal: () => ({
      qstash: {
        queue: async <T>(procedure: string, args: T, options?: { retries?: number; delay?: string }) => {
          return client.publishJSON({
            url: `${baseURL}/api/qstash/${procedure}`,
            body: { args },
            retries: options?.retries,
            delay: options?.delay,
          });
        },
        client,
      },
    }),

    // ✨ Behavior: adds t.qstash.task() method
    enrichT: (t) => ({
      qstash: {
        task: (config) => {
          return t.internalMutation({
            name: config.name,
            args: config.args || z.object({}),
            handler: config.handler,
            // Safe metadata using Symbols
            metadata: {
              [TASK_SYMBOL]: true,
              [RETRY_COUNT_SYMBOL]: config.retries ?? 3,
            },
          });
        },
      },
    }),
  };
};
```

### Usage

```typescript
// ✨ Chain pattern
const { t, createAPI } = defineContext({ context: { db } })
  .use(qstashPlugin({ token: "...", baseURL: "..." }))
  .use(redisPlugin({ url: "...", token: "..." }))
  .build();

const appRouter = t.router({
  // ✨ Background task - uses t.qstash.task() (namespaced behavior)
  processImage: t.qstash.task({
    name: "images.processImage",
    args: z.object({ imageId: z.string() }),
    retries: 3,
    handler: async (ctx, args) => {
      // ctx.qstash is available (context from extendInternal)
      const image = await ctx.db.images.find(args.imageId);
      await processImage(image);
      return ok({ success: true });
    },
  }),

  // ✨ Mutation that queues background task - uses ctx.qstash.queue() (context)
  uploadAndProcess: t.mutation({
    name: "images.uploadAndProcess",
    args: z.object({ data: z.string() }),
    handler: async (ctx, args) => {
      const imageId = await ctx.db.images.create({ data: args.data });
      await ctx.qstash.queue("images.processImage", { imageId });
      return ok({ imageId });
    },
  }),
});
```

---

## Summary

| Plugin Contribution | Interface | Available As | Example |
|---------------------|-----------|--------------|---------|
| **Context** | `extend` / `extendInternal` | `ctx.*` | `ctx.auth.session`, `ctx.qstash.queue()` |
| **Behavior** | `enrichT` | `t.<plugin>.<method>()` | `t.qstash.task({ ... })`, `t.cron.scheduled({ ... })` |

### Rule of Thumb

- **Need data or utilities in handlers?** → Use `extend` / `extendInternal` → `ctx.*`
- **Need a new way to create procedures?** → Use `enrichT` → `t.<plugin>.<method>()`

### Senior Rules to Follow

1. **Namespaces mandatory** → `t.<plugin>.<method>()`, never `t.<method>()`
2. **Use Symbols for framework metadata** → Never string keys like `_isTask`
3. **Decorated procedures** → Enrichments inherit global middlewares
4. **Chain pattern** → `defineContext({ context }).use(plugin).use(plugin).build()`
5. **Plugin is HOF** → `plugin(name, { ...args, ...hooks })` - single call with args passed to hooks

---

## Potential `t` Enrichments (Reference)

### Execution Behaviors

| Enrichment | Description | Use Case |
|------------|-------------|----------|
| `t.qstash.task()` | Background processing | QStash, BullMQ - async jobs |
| `t.cron.scheduled()` | Cron-triggered procedures | Daily reports, cleanup jobs |
| `t.ws.subscription()` | SSE/WebSocket streaming | Real-time updates |
| `t.streaming()` | Chunked responses | Large data sets |

### Resilience Behaviors

| Enrichment | Description | Use Case |
|------------|-------------|----------|
| `t.resilience.retry()` | Retry on failure with backoff | Unreliable dependencies |
| `t.resilience.timeout()` | Max duration for procedure | Prevent hanging |
| `t.resilience.circuitBreaker()` | Fail-fast after threshold | Degrade gracefully |

### Performance Behaviors

| Enrichment | Description | Use Case |
|------------|-------------|----------|
| `t.cache.cached()` | Automatic cache invalidation | Expensive computations |
| `t.perf.debounced()` | Coalesce rapid calls | Search inputs |
| `t.perf.batched()` | Batch multiple requests | N+1 queries |

### Observability Behaviors

| Enrichment | Description | Use Case |
|------------|-------------|----------|
| `t.observability.metered()` | Auto-record metrics | Prometheus, StatsD |
| `t.observability.audited()` | Log all inputs/outputs | Compliance |
| `t.observability.traced()` | Auto-add tracing spans | OpenTelemetry |

### API Evolution Behaviors

| Enrichment | Description | Use Case |
|------------|-------------|----------|
| `t.api.versioned()` | Automatic versioning | Backwards compatibility |
| `t.api.deprecated()` | Mark as deprecated | Migration guides |

---

## See Also

- [Plugin Procedure System](./plugin-procedure-system.md) - Alternative approach (router-based)
- [Plugin Typing Solutions](./plugin-typing-solutions.md) - All 10 solutions for TypeScript typing
- [Two-Tier Context System](../../context/README.md) - Security model for extend/extendInternal
- [better-auth Plugin](../plugins/better-auth-plugin.md) - Auth plugin design
- [QStash Plugin](../plugins/qstash-plugin.md) - Background tasks design
- [Redis Plugin](../plugins/redis-plugin.md) - Cache plugin design
- [drpc Plugins](../plugins/drpc-plugins.md) - Current plugin architecture
- [Higher Kinded Types in TypeScript](https://code.lol/post/programming/higher-kinded-types/) - HKT patterns
