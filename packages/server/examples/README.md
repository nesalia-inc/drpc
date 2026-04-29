# Examples

These files demonstrate how to use `@deessejs/server` internally. Each file is self-contained and runnable.

## Running Examples

```bash
cd packages/server
npx tsx examples/01-basic.ts
npx tsx examples/02-nested-routers.ts
# etc.
```

## File Index

| File | Topic | Key Concepts |
|------|-------|-------------|
| `01-basic.ts` | Basic Query/Mutation | `createQueryBuilder`, `t.query()`, `t.mutation()`, `createAPI` |
| `02-nested-routers.ts` | Nested Routers | `t.router()`, deep nesting, `flattenRouter` |
| `03-hooks.ts` | Hooks | `beforeInvoke`, `afterInvoke`, `onSuccess`, `onError` |
| `04-middleware.ts` | Middleware | `createMiddleware`, `.use()`, global middleware |
| `05-events.ts` | Events | `defineEvents`, `event()`, `ctx.send()`, wildcards |
| `06-internal.ts` | Internal Procedures | `internalQuery`, `internalMutation`, `createPublicAPI` |
| `07-plugins.ts` | ContextBuilder & Plugins | `createContextBuilder()`, `Plugin.enrich`, `Plugin.extend` |
| `08-full-example.ts` | Full Blog API | Complete realistic application |

## Request Flow

```
User Code: api.module.procedure(args)
            │
            ▼
Router Proxy (createRouterProxy)
  └─ Nested proxies resolve path
            │
            ▼
executeRoute (route.ts)
  └─ Cache lookup, path resolution
            │
            ▼
executeProcedure (procedure.ts)
  ├─ Create handler context + send()
  ├─ Validate args (if schema)
  ├─ Build middleware chain
  │     │
  │     ▼
  │   Middleware: auth, logging, etc.
  │     │
  │     ▼
  │   runMiddlewareChain()
  │     │
  └─────┴─► executeProcedureWithHooks
            │
            ├─ beforeInvoke hook
            ├─ Handler: procedure.handler(ctx, args)
            ├─ afterInvoke hook
            ├─ onSuccess / onError hook
            └─ flush event queue
            │
            ▼
Result<Output>
```

## Key Types

```typescript
// Context passed to all handlers
interface Context { ... }

// Procedure types
type Query<Ctx, Args, Output>
type Mutation<Ctx, Args, Output>
type InternalQuery<Ctx, Output>      // no args
type InternalMutation<Ctx, Args, Output>

// All procedures have _def with $types for inference
AnyProcedure._def.$types.input  // Args
AnyProcedure._def.$types.output // Output

// DecoratedRouter maps routes to callables
TypedAPIInstance = DecoratedRouter<TRoutes, Ctx>
```

## Architecture

```
src/
├── query/          # QueryBuilder + factory functions
├── mutation/      # Mutation builder
├── internal-*/   # Internal procedures
├── router/        # Router utilities (flatten, validate)
├── context/       # ContextBuilder + defineContext
├── api/factory/   # createAPI, createPublicAPI
│   ├── proxy.ts   # Router proxy
│   ├── route.ts   # Route execution
│   └── procedure.ts # Procedure execution + middleware
├── events/        # EventEmitter, queue
├── middleware/    # createMiddleware, helpers
└── hooks/         # executeHooks
```
