# Plan: `defineContext()`, `t.query/mutation()`, and `createAPI()`

## Overview

This document outlines the implementation plan for the context-aware API system consisting of `defineContext()`, `t.query()`, `t.mutation()`, and `createAPI()`. This system builds upon the standalone `query()` and `mutation()` functions defined in [reports/query-mutations.md](./query-mutations.md) and adds a router layer similar to tRPC.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         createAPI()                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      API Router                          │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐   │  │
│  │  │ defineContext() │  │       Procedures            │   │  │
│  │  │                 │  │  t.query() / t.mutation()   │   │  │
│  │  │  Creates Ctx    │  │  Shares same ctx type       │   │  │
│  │  │  factory        │  │                             │   │  │
│  │  └─────────────────┘  └─────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   execute(ctx)  │
                    │  Entry point    │
                    └─────────────────┘
```

### Key Difference from Standalone Query/Mutation

| Aspect | Standalone `query()` | With `defineContext` + `t.query()` |
|--------|---------------------|-------------------------------------|
| Context | Passed to every `execute()` | Built into the procedure at definition |
| Type safety | Explicit generics `<Ctx, Args, Output>` | Inferred from `defineContext` |
| Usage | Direct function call | Via `createAPI()` router |

---

## 2. `defineContext()` Design

### Signature

```typescript
function defineContext<CtxFactory extends ContextFactory>(
  factory: CtxFactory
): ContextBuilder<CtxFactory>

type ContextFactory = (input: unknown) => Context | Promise<Context>

interface ContextBuilder<CtxFactory> {
  build: (input?: unknown) => Promise<Context> | Context
  procedures: ProceduresBuilder<CtxFactory>
}

interface ProceduresBuilder<CtxFactory> {
  query<Args, Output>(
    config: QueryConfig<CtxFactory, Args, Output>
  ): QueryProcedure<ContextFromFactory<CtxFactory>, Args, Output>

  mutation<Args, Output>(
    config: MutationConfig<CtxFactory, Args, Output>
  ): MutationProcedure<ContextFromFactory<CtxFactory>, Args, Output>
}
```

### Usage Pattern

```typescript
import { defineContext, t, createAPI } from "@deessejs/server";

// 1. Define context factory
const ctx = defineContext(async (input) => {
  // input comes from API request (headers, body, etc.)
  const user = await authenticate(input.headers.authorization);

  return {
    db: myDatabase,
    logger: console,
    user,  // Automatically typed
  };
});

// 2. Define procedures using t.query() / t.mutation()
const appRouter = ctx.procedures.query({
  handler: async (ctx, args: { id: number }) => {
    // ctx is automatically typed from defineContext
    return await ctx.db.users.find(args.id);
  }
});

const appRouter = ctx.procedures.mutation({
  handler: async (ctx, args: { name: string }) => {
    return await ctx.db.users.create(args);
  }
});

// 3. Create API with router
const api = createAPI({
  router: appRouter,
});

// 4. Execute via HTTP handler or direct call
const result = await api.execute(ctx, { id: 1 });
```

---

## 3. `t.query()` and `t.mutation()` Design

### Access via `ctx.procedures`

```typescript
// Inside defineContext block
const router = ctx.procedures;

// t.query() - read operations
const getUser = router.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return await ctx.db.users.find(args.id);
  }
});

// t.mutation() - write operations
const createUser = router.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db.users.findByEmail(args.email);
    if (existing) {
      throw { code: "CONFLICT", message: "Email already exists" };
    }
    return await ctx.db.users.create(args);
  }
});
```

### Difference from Standalone `query()`/`mutation()`

| Aspect | Standalone | Via `defineContext` |
|--------|------------|---------------------|
| Access | `query({ handler })` | `ctx.procedures.query({ handler })` |
| Context | Needs explicit `<Ctx, ...>` generic | Inferred from `defineContext` |
| hooks | Chainable `.beforeInvoke()` | Same chainable hooks |
| Composition | Manual | Via `createAPI()` |

### Hooks on Procedures

```typescript
const getUser = router.query({
  handler: async (ctx, args) => { ... }
})
  .beforeInvoke((ctx, args) => {
    // Check permissions
    if (!ctx.user) throw new Error("Unauthorized");
  })
  .onSuccess((ctx, args, user) => {
    ctx.logger.info(`User retrieved: ${user.id}`);
  });
```

---

## 4. `createAPI()` Design

### Signature

```typescript
function createAPI<TRouter extends APIRouter>(
  config: {
    router: TRouter;
    errorHandler?: ErrorHandler;
    middlewares?: Middleware[];
  }
): APIInstance<TRouter>

interface APIRouter {
  _type: 'router';
  _procedures: Record<string, Procedure>;
}

interface APIInstance<TRouter> {
  router: TRouter;

  execute<TRoute extends keyof TRouter>(
    ctx: Context,
    route: TRoute,
    args: ArgumentsOf<TRouter[TRoute]>
  ): Promise<Result<OutputOf<TRouter[TRoute]>>>;

  // For HTTP server integration
  createHandler(): Handler;
}

interface ErrorHandler {
  (error: unknown, ctx: Context): ErrorResponse;
}

interface Middleware {
  (ctx: Context, next: () => Promise<void>): Promise<void> | void;
}
```

### Usage

```typescript
const api = createAPI({
  router: appRouter,
  errorHandler: (error, ctx) => {
    ctx.logger.error(error);
    return {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  }
});

// Direct execution
const result = await api.execute(ctx, "getUser", { id: 1 });

// HTTP handler (for Express/Fastify/H3)
const handler = api.createHandler();
```

---

## 5. Type System

### Type Inference

The key benefit of `defineContext` is automatic type inference:

```typescript
// Context type is automatically inferred
const ctx = defineContext(async (input) => {
  return {
    db: myDatabase,
    logger: console,
    user: await getUser(input),
  };
});

// Procedures automatically know the ctx type
const getUser = ctx.procedures.query({
  handler: async (ctx, args) => {
    // ctx.db is typed, ctx.user is typed
    return await ctx.db.users.find(args.id);
  }
});

// createAPI knows all procedure types
const api = createAPI({ router: { getUser, createUser } });

// Full type safety on execute
const result = await api.execute(ctx, "getUser", { id: 1 });
// result is typed based on getUser handler return type
```

### Type Helpers

```typescript
type ContextFromFactory<T extends ContextFactory> =
  T extends (input: unknown) => infer Ctx ? Ctx : never;

type ArgumentsOf<T> = T extends Procedure<infer _Ctx, infer Args, infer _Output>
  ? Args
  : never;

type OutputOf<T> = T extends Procedure<infer _Ctx, infer _Args, infer Output>
  ? Output
  : never;

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
```

---

## 6. Error Handling

### Handler Errors

```typescript
// All handler errors are converted to ErrorResponse
const getUser = router.query({
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id);
    if (!user) {
      throw { code: "NOT_FOUND", message: "User not found" };
    }
    return user;
  }
});
```

### Error Response Structure

```typescript
interface ErrorResponse {
  code: string;      // Error code (e.g., "NOT_FOUND", "UNAUTHORIZED")
  message: string;   // Human-readable message
  metadata?: unknown; // Optional additional data
}
```

---

## 7. File Structure

```
package/server/src/
  index.ts                    # Main exports
  types.ts                    # Shared types (Context, Procedure, etc.)
  context.ts                  # defineContext() implementation
  procedures.ts              # t.query(), t.mutation() implementations
  api.ts                     # createAPI() implementation
  router.ts                  # Router types and helpers
  hooks.ts                   # Hook executor
  errors.ts                  # Error types and handlers
```

### Implementation Order

1. **types.ts** - Define core types (`Context`, `Procedure`, `Result`)
2. **errors.ts** - Error handling types and default handler
3. **context.ts** - `defineContext()` implementation
4. **procedures.ts** - `t.query()`, `t.mutation()` via `ProceduresBuilder`
5. **api.ts** - `createAPI()` with router and `execute()` method
6. **hooks.ts** - Hook execution logic
7. **index.ts** - Update exports

---

## 8. Design Decisions

| Decision | Choice | Rationale |
|----------|---------|-----------|
| Context factory | `async (input) => ctx` | Allows DB/auth calls during context creation |
| Context type inference | Via `ContextFromFactory` | TypeScript generics enable automatic typing |
| Procedure hooks | Chainable (builder pattern) | Consistent with standalone query/mutation |
| Error format | `{ code, message }` object | Structured, type-safe errors |
| No plugins | Deferred | Keep initial API simple |
| No middleware in Phase 2 | Deferred to future | Hooks provide sufficient extensibility |

---

## 9. Comparison with tRPC

| Aspect | tRPC | @deessejs/server |
|--------|------|------------------|
| Context | `createContext()` + AsyncLocalStorage | `defineContext()` + explicit factory |
| Procedures | `publicProcedure.input().query()` | `t.query()` from context builder |
| Router | `createRouter()` with merge | `createAPI()` with router object |
| Type inference | Via TypeScript + Zod | Via TypeScript generics |
| Middleware | Yes | No (deferred) |
| Plugins | Yes | No (deferred) |

---

## 10. Usage Example: Full Flow

```typescript
import { defineContext, t, createAPI } from "@deessejs/server";
import { z } from "zod";

// 1. Define context
interface AuthContext {
  db: Database;
  logger: Logger;
  user: User | null;
}

const ctx = defineContext(async (input): Promise<AuthContext> => {
  const token = input.headers.authorization;
  const user = token ? await auth.verify(token) : null;

  return {
    db: database,
    logger: console,
    user,
  };
});

// 2. Define procedures
const router = ctx.procedures;

// Public query - no auth required
const getPost = router.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    return await ctx.db.posts.find(args.id);
  }
});

// Protected query - requires auth
const getUserProfile = router.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    if (!ctx.user) {
      throw { code: "UNAUTHORIZED", message: "Must be logged in" };
    }
    return await ctx.db.users.find(args.id);
  }
});

// Mutation
const createPost = router.mutation({
  args: z.object({ title: z.string(), content: z.string() }),
  handler: async (ctx, args) => {
    if (!ctx.user) {
      throw { code: "UNAUTHORIZED", message: "Must be logged in" };
    }
    return await ctx.db.posts.create({ ...args, authorId: ctx.user.id });
  }
});

// 3. Create API
const api = createAPI({
  router: {
    getPost,
    getUserProfile,
    createPost,
  }
});

// 4. Execute
const result = await api.execute(ctx, "getPost", { id: 1 });
if (!result.ok) {
  console.error(result.error.code); // "NOT_FOUND" etc.
} else {
  console.log(result.value);
}
```

---

## 11. Open Questions

| Question | Recommendation |
|----------|----------------|
| How to handle context creation errors? | Throw early, before procedure execution |
| Should procedures support input/output schemas? | Yes, using Standard Schema (Zod compatible) |
| Batch execution (calling multiple procedures)? | Deferred to future version |
| Subscriptions/streaming? | Deferred to future version |
| Integration with HTTP frameworks? | Via `createHandler()` returning a standard Handler type |

---

## 12. Dependencies

No new runtime dependencies required. Uses:
- `@deessejs/core` (peer dependency)
- Existing devDependencies (vitest, eslint, typescript, typescript-eslint)

Optional (when adding schema validation):
- `zod` (peer dependency)
