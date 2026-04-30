# RFC 04: Plugins

## Summary

DRPC plugins allow you to extend the framework's functionality by enriching context, adding new procedures, and configuring behavior through a composable plugin system. Plugins are registered via `.use()` on the builder and can accept runtime arguments.

---

## Overview

### What Is a Plugin?

A plugin is created via a `plugin()` helper function that receives the plugin configuration. This function takes args and produces a Plugin that can extend context and add procedures.

```typescript
// Plugin function - receives args and returns Plugin object
const myPlugin = plugin({
  name: 'myPlugin',
  args: z.object({ prefix: z.string() }),
  extend: (ctx, args) => ({
    myMethod: (msg: string) => console.log(`${args.prefix}: ${msg}`),
  }),
});

// Use the plugin directly (no args needed here, they're in the config)
const d = initDRPC
  .context({ value: 1 })
  .use(myPlugin)
  .create();
```

**With args:**

```typescript
const auditPlugin = plugin({
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({
    auditLog: ctx.auditLog ?? [],
    log: (msg: string) => ctx.auditLog.push(`${args.prefix ?? '[audit]'}: ${msg}`),
  }),
});

const d = initDRPC
  .context({ auditLog: [] })
  .use(auditPlugin({ prefix: '[APP]' }))
  .create();
```

---

## Plugin Interface

### Full Interface

```typescript
interface Plugin<Ctx> {
  readonly name: string;
  readonly args?: ZodType<unknown>;
  readonly extend: (ctx: Ctx, args: unknown) => Partial<Ctx>;
  readonly procedures?: () => PluginEnrichment<Ctx>;
}
```

### `name`

A unique identifier for the plugin:

```typescript
{
  name: 'audit';
}
```

### `args` (optional)

A Zod schema for validating plugin arguments at registration time:

```typescript
{
  name: 'audit',
  args: z.object({
    prefix: z.string().optional(),
    maxLength: z.number().default(1000),
  }),
}
```

If `args` is not provided, the plugin cannot receive configuration.

### `extend`

A function that receives current context and plugin args, returns partial context to merge:

```typescript
{
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({
    auditLog: ctx.auditLog ?? [],
    log: (msg: string) => ctx.auditLog.push(`${args.prefix ?? '[audit]'}: ${msg}`),
  }),
}
```

**Key points:**
- Return type is `Partial<Ctx>` — only include properties you're adding/modifying
- Context is enriched in order plugins are registered
- Each plugin's `extend()` receives the result of previous plugins

### `procedures` (optional)

A function that returns procedures to be added to `t`:

```typescript
{
  name: 'cache',
  procedures: () => ({
    cache: {
      get: {
        args: z.object({ key: z.string() }),
        handler: async (ctx, args) => { ... },
      },
      set: {
        args: z.object({ key: z.string(), value: z.unknown() }),
        handler: async (ctx, args) => { ... },
      },
    },
  }),
}
```

These procedures are accessible via `t.cache.get()` and `t.cache.set()`.

---

## PluginEnrichment Type

```typescript
type PluginEnrichment<Ctx> = {
  [namespace: string]: {
    [methodName: string]: ProcedureConfig<Ctx, unknown, unknown>;
  };
};
```

Procedures added by plugins follow the same `ProcedureConfig` format as regular procedures.

---

## How Plugins Work

### Registration

Plugins are registered via `.use()` on the builder:

```typescript
const d = initDRPC
  .context<MyContext>({ auditLog: [] })
  .use(plugin1({ arg1: 'value' }))
  .use(plugin2({ arg2: 123 }))
  .create();
```

### Context Enrichment Flow

```
Builder context
    │
    ▼
┌─────────────┐
│ Plugin1.extend() │ ──▶ { auditLog: [], log: fn }
└─────────────┘
    │
    ▼ (enriched context)
┌─────────────┐
│ Plugin2.extend() │ ──▶ { cache: Map, timing: fn }
└─────────────┘
    │
    ▼ (further enriched)
Procedure Handler
    │
    ▼
ctx = { auditLog: [], log: fn, cache: Map, timing: fn, ... }
```

### Args Validation

Plugin args are validated when passed to `.use()`:

```typescript
const auditPlugin = plugin({
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({ ... }),
});

// Valid call
d.use(auditPlugin({ prefix: '[APP]' }));

// Valid call (using default)
d.use(auditPlugin({}));

// Invalid call - TypeScript error at compile time, Zod error at runtime
d.use(auditPlugin({ unknownOption: true }));
```

---

## Usage Examples

### Context Enrichment Plugin

```typescript
interface AuditCtx {
  auditLog: string[];
  log: (msg: string) => void;
}

const auditPlugin = plugin({
  name: 'audit',
  args: z.object({ prefix: z.string().optional() }),
  extend: (ctx, args) => ({
    auditLog: ctx.auditLog ?? [],
    log: (msg: string) => ctx.auditLog.push(`${args?.prefix ?? '[audit]'}: ${msg}`),
  }),
});

const d = initDRPC
  .context<AuditCtx>({ auditLog: [] })
  .use(auditPlugin({ prefix: '[APP]' }))
  .create();

const router = d.router({
  createUser: d.mutation({
    args: z.object({ name: z.string() }),
    handler: async (ctx, args) => {
      ctx.log(`Creating user: ${args.name}`);
      return ok({ id: '1', name: args.name });
    },
  }),
});
```

### Timing Plugin

```typescript
interface TimingCtx {
  startTime: number;
  duration?: number;
}

const timingPlugin = plugin({
  name: 'timing',
  extend: (ctx) => ({
    startTime: Date.now(),
    measure: () => ctx.duration ? `${ctx.duration}ms` : 'running',
  }),
});

const d = initDRPC
  .context<{ userId: string } & TimingCtx>({ userId: '1' })
  .use(timingPlugin())
  .create();
```

### Cache Plugin with Procedures

```typescript
interface CacheCtx {
  cache: Map<string, unknown>;
  getCache: (key: string) => unknown | undefined;
  setCache: (key: string, value: unknown) => void;
}

const cachePlugin = plugin({
  name: 'cache',
  extend: (ctx) => ({
    cache: ctx.cache ?? new Map(),
    getCache: (key: string) => ctx.cache.get(key),
    setCache: (key: string, value: unknown) => ctx.cache.set(key, value),
  }),
  procedures: () => ({
    cache: {
      get: {
        args: z.object({ key: z.string() }),
        handler: async (ctx, args) => ok(ctx.getCache(args.key)),
      },
      set: {
        args: z.object({ key: z.string(), value: z.unknown() }),
        handler: async (ctx, args) => {
          ctx.setCache(args.key, args.value);
          return ok({ success: true });
        },
      },
      clear: {
        handler: async (ctx) => {
          ctx.cache.clear();
          return ok({ success: true });
        },
      },
    },
  }),
});

const d = initDRPC
  .context<CacheCtx>({ cache: new Map() })
  .use(cachePlugin())
  .create();

// Access plugin procedures via t
const router = d.router({
  data: d.query({
    handler: async (ctx) => ok(ctx.getCache('key') ?? 'default'),
  }),
});
```

### Retry Plugin

```typescript
const retryPlugin = plugin({
  name: 'retry',
  args: z.object({
    maxRetries: z.number().min(1).max(10).default(3),
    delayMs: z.number().min(0).default(1000),
  }),
  extend: (ctx, args) => ({
    withRetry: async <T>(fn: () => Promise<T>): Promise<T> => {
      let lastError: Error;
      for (let i = 0; i < args.maxRetries; i++) {
        try {
          return await fn();
        } catch (e) {
          lastError = e as Error;
          if (i < args.maxRetries - 1) {
            await new Promise(r => setTimeout(r, args.delayMs));
          }
        }
      }
      throw lastError!;
    },
  }),
});

const d = initDRPC
  .context<{ withRetry: <T>(fn: () => Promise<T>) => Promise<T> }>({ withRetry: async (fn) => fn() })
  .use(retryPlugin({ maxRetries: 3, delayMs: 500 }))
  .create();
```

---

## API Reference

### Plugin Interface

```typescript
interface Plugin<Ctx> {
  readonly name: string;
  readonly args?: ZodType<unknown>;
  readonly extend: (ctx: Ctx, args: unknown) => Partial<Ctx>;
  readonly procedures?: () => PluginEnrichment<Ctx>;
}
```

### PluginEnrichment

```typescript
type PluginEnrichment<Ctx> = {
  [namespace: string]: {
    [methodName: string]: ProcedureConfig<Ctx, unknown, unknown>;
  };
};
```

### ProcedureConfig

```typescript
interface ProcedureConfig<TCtx, Args, Output> {
  args?: ZodType<Args>;
  meta?: TMeta;
  hooks?: Hooks<TCtx, Args, Output>;
  handler: (ctx: TCtx, args: Args) => Promise<Result<Output>>;
}
```

### Builder.use()

```typescript
class DRPCBuilder<TCtx, TMeta> {
  use<TPlugin extends Plugin<any>>(plugin: TPlugin): DRPCBuilder<TCtx, TMeta>;
}
```

`.use()` returns the same builder type (with possibly updated context), allowing chaining.

---

## Implementation Notes

### Plugin Order

Plugins execute in registration order. Each `extend()` receives the context as modified by previous plugins. This means:

```typescript
// plugin1 extends: { a: 1 }
 // plugin2 extends: { b: 2 }
 // Final context: { a: 1, b: 2 }
```

If plugins define the same property, later plugins override earlier ones.

### Context Type Updates

When plugins extend context, TypeScript needs to know about the new properties. This is handled through the generic system:

```typescript
// Initial context
context<{ userId: string }>({ userId: '1' })

// After using plugin that extends with { cache: Map }
use(cachePlugin())
// TCtx is inferred as { userId: string; cache: Map<string, unknown> }
```

### Type Safety for Args

Plugin args are type-safe at two levels:
1. **TypeScript** — Zod schema infers TypeScript types
2. **Runtime** — Zod validates at `.use()` time

### No Dependency Resolution

Plugins do not declare dependencies on each other. If plugin B relies on properties added by plugin A, register A before B:

```typescript
// Correct order
.use(pluginA())
.use(pluginB())  // pluginB can use properties from pluginA

// Incorrect order (may fail)
.use(pluginB())
.use(pluginA())  // pluginB's extend won't see pluginA's additions
```

---

## Status

**Draft** — Design for plugins as described in RFC 01. Implementation pending.
