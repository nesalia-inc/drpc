# Router and Middleware Architecture Analysis Report

## Executive Summary

This report analyzes the router and middleware architecture of `@deessejs/server` against tRPC's well-established patterns. The analysis identifies six significant architectural gaps that limit the framework's ability to handle complex real-world API scenarios:

1. **No per-procedure middleware** - Only global middleware exists
2. **No protected procedure pattern** - Cannot create reusable authenticated procedures
3. **No input/output validation** - Schemas defined but never enforced
4. **Limited public API filtering** - Type-only filtering without runtime guarantees
5. **No procedure metadata support** - Missing annotations for documentation/caching
6. **Static context** - No per-request context builder

---

## Finding 1: No Per-Procedure Middleware (Only Global)

### Code Analysis

**File: `package/server/src/api/factory.ts`**

```typescript
// Line 14 - Only global middleware storage
interface APIInstanceState<Ctx, TRoutes extends Router<Ctx>> {
  router: TRoutes;
  ctx: Ctx;
  plugins: Plugin<Ctx>[];
  globalMiddleware: Middleware<Ctx>[];  // <-- Only global exists
  // ...
}
```

**Line 163** - Middleware is only accepted at API creation:
```typescript
export function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: {
    router: TRoutes;
    context: Ctx;
    plugins?: Plugin<Ctx>[];
    middleware?: Middleware<Ctx>[];  // <-- Only global middleware
    eventEmitter?: EventEmitter<any>;
  }
): TypedAPIInstance<Ctx, TRoutes> {
```

**Lines 53-75** - `executeRoute` passes global middleware to all procedures:
```typescript
async function executeRoute<Ctx>(
  router: Router<Ctx>,
  ctx: Ctx,
  globalMiddleware: Middleware<Ctx>[],
  route: string,
  args: unknown,
  // ...
): Promise<Result<unknown>> {
  // ...
  return executeProcedure(procedure, ctx, args, globalMiddleware, eventEmitter, queue);
}
```

**Lines 101-152** - `executeProcedure` applies the same middleware to every procedure:
```typescript
async function executeProcedure<Ctx, Args, Output>(
  procedure: Procedure<Ctx, Args, Output>,
  ctx: Ctx,
  args: Args,
  middleware: Middleware<Ctx>[],
  // ...
): Promise<Result<Output>> {
  // ...
  let index = 0;
  const next = async (): Promise<Result<Output>> => {
    if (index >= middleware.length) {
      // Execute procedure handler directly
    }
    const mw = middleware[index++];
    return mw.handler(handlerCtx as any, next as any) as any;
  };
  return await next();
}
```

**File: `package/server/src/query/builder.ts`**

**Lines 74-76** - The `middleware()` builder method does nothing useful:
```typescript
middleware<Args>(config: Middleware<Ctx, Args>): Middleware<Ctx, Args> {
  return config;  // <-- Just returns the config, no attachment to procedure
}
```

### Root Cause

The middleware system was designed purely as a global interceptor chain. There is no mechanism to attach middleware to individual procedures. The `HookedProcedureMixin` (lines 110-121) only provides lifecycle hooks (`beforeInvoke`, `afterInvoke`, `onSuccess`, `onError`) but not middleware chains.

### Impact

- Cannot apply authorization to specific procedures
- Cannot apply rate limiting to specific procedures
- Cannot apply logging/tracing to specific procedures
- All global middleware runs on all procedures even when not needed
- No way to create reusable "protected" procedure patterns

### tRPC Comparison

In tRPC, you can attach middleware per-procedure:
```typescript
const authenticatedProcedure = publicProcedure.use(authMiddleware);
const userProcedure = authenticatedProcedure.use(userMiddleware);
```

---

## Finding 2: No Protected Procedure Pattern

### Code Analysis

**File: `package/server/src/query/builder.ts`**

**Lines 110-121** - `HookedProcedureMixin` only supports hooks, not middleware:
```typescript
interface HookedProcedureMixin<Ctx, Args, Output> {
  beforeInvoke(hook: BeforeInvokeHook<Ctx, Args>): this;
  afterInvoke(hook: AfterInvokeHook<Ctx, Args, Output>): this;
  onSuccess(hook: OnSuccessHook<Ctx, Args, Output>): this;
  onError(hook: OnErrorHook<Ctx, Args, any>): this;
  _hooks: {
    beforeInvoke?: BeforeInvokeHook<Ctx, Args>;
    afterInvoke?: AfterInvokeHook<Ctx, Args, Output>;
    onSuccess?: OnSuccessHook<Ctx, Args, Output>;
    onError?: OnErrorHook<Ctx, Args, any>;
  };
}
```

**File: `package/server/src/types.ts`**

**Lines 15-29** - Procedure types have no `.use()` method:
```typescript
export interface Query<Ctx, Args, Output> extends BaseProcedure<Ctx, Args, Output> {
  readonly type: "query";
}

export interface Mutation<Ctx, Args, Output> extends BaseProcedure<Ctx, Args, Output> {
  readonly type: "mutation";
}
// ...
```

### Root Cause

Procedures are immutable objects with only a `type`, optional `argsSchema`, and `handler`. There is no extension mechanism to create derived procedures with middleware attached. tRPC's `protectedProcedure` pattern relies on the ability to call `.use()` which returns a new procedure with merged middleware.

### Impact

- Cannot create reusable authentication patterns
- Cannot create reusable authorization patterns
- Every protected procedure must repeat middleware logic
- No way to compose procedure variants (e.g., `adminProcedure`, `userProcedure`, `publicProcedure`)

### Example of Missing Pattern

What developers expect but cannot do:
```typescript
// Desired pattern (NOT POSSIBLE)
const protectedProcedure = t.procedure.use(requireAuth);
const adminProcedure = protectedProcedure.use(requireAdmin);

const getProfile = adminProcedure.query({ handler: ... }); // Only admins
const updateProfile = protectedProcedure.mutation({ handler: ... }); // Any authenticated user
```

---

## Finding 3: No Input/Output Validators on Procedures

### Code Analysis

**File: `package/server/src/types.ts`**

**Lines 8-13** - `argsSchema` exists but is never used:
```typescript
export interface BaseProcedure<Ctx, Args, Output> {
  readonly type: ProcedureType;
  readonly argsSchema?: ZodType<Args>;  // <-- Defined but NEVER validated
  readonly handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
  readonly name?: string;
}
```

**File: `package/server/src/api/factory.ts`**

**Lines 117-134** - Procedure execution never validates input:
```typescript
if (hookedProc._hooks?.beforeInvoke) {
  await hookedProc._hooks.beforeInvoke(handlerCtx, args);
}
try {
  const result = await procedure.handler(handlerCtx, args);  // <-- Raw args passed directly
  // ...
}
```

There is no call to `argsSchema.parse(args)` or any equivalent validation before invoking the handler.

**File: `package/server/src/query/builder.ts`**

**Lines 29-37** - `argsSchema` is accepted but not validated:
```typescript
query<Args, Output>(config: QueryConfig<Ctx, Args, Output, Events>): QueryWithHooks<Ctx, Args, Output> {
  return createHookedProcedure({
    type: "query",
    argsSchema: config.args,  // <-- Stored but never used
    handler: config.handler as any,
  }) as QueryWithHooks<Ctx, Args, Output>;
}
```

### Root Cause

The `argsSchema` was likely added anticipating validation but the validation logic was never implemented. The `executeProcedure` function in factory.ts directly passes `args` to `procedure.handler` without any schema validation.

### Impact

- Invalid inputs cause runtime errors in handlers instead of early validation errors
- No compile-time safety from Zod schemas
- Error messages are less helpful than schema validation errors
- Potential security issues from unvalidated inputs
- The Zod dependency provides no actual validation benefit

### tRPC Comparison

In tRPC, input validation happens automatically:
```typescript
const getUser = publicProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ input }) => {
    // input is validated before this handler runs
  });
```

---

## Finding 4: createPublicAPI Filter vs tRPC's publicProcedure

### Code Analysis

**File: `package/server/src/api/factory.ts`**

**Lines 196-206** - `createPublicAPI` creates a new filtered API:
```typescript
export function createPublicAPI<Ctx, TRoutes extends Router<Ctx>>(
  api: APIInstance<Ctx, TRoutes>
): APIInstance<Ctx, PublicRouter<TRoutes>> {
  const publicRouter = filterPublicRouter(api.router);
  return createAPI({
    router: publicRouter as any,
    context: api.ctx,  // <-- Same context, not filtered
    plugins: api.plugins,
    middleware: api.globalMiddleware,
  }) as any;
}
```

**Lines 208-216** - Type-only filtering with `PublicRouter`:
```typescript
type PublicRouter<TRoutes extends Router> = {
  [K in keyof TRoutes as TRoutes[K] extends Procedure<any, any, any>
    ? TRoutes[K] extends { type: "query" | "mutation" }
      ? K
      : never
    : K]: TRoutes[K] extends Router
    ? PublicRouter<TRoutes[K]>
    : TRoutes[K];
};
```

**Lines 218-233** - Runtime filtering in `filterPublicRouter`:
```typescript
function filterPublicRouter<TRoutes extends Router>(router: TRoutes): PublicRouter<TRoutes> {
  const result: any = {};
  for (const key in router) {
    const value = (router as any)[key];
    if (isRouter(value)) {
      result[key] = filterPublicRouter(value);
    } else if (isProcedure(value)) {
      if ((value as any).type === "query" || (value as any).type === "mutation") {
        result[key] = value;  // <-- Only query/mutation included
      }
      // internalQuery and internalMutation are dropped
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

### Key Differences from tRPC

| Aspect | @deessejs/server | tRPC |
|--------|------------------|------|
| Public API | Separate API instance via filter function | `publicProcedure` is a base procedure type |
| Internal exposure | Internal procedures are silently dropped | Internal procedures don't exist on the base router |
| Type safety | TypeScript type filtering only | Full type inference through `publicProcedure` |
| Context | Shared context (not filtered) | Context can be filtered per-procedure |
| Runtime guarantee | Filtering happens but context is shared | Runtime checks verify procedure visibility |

### Impact

- `createPublicAPI` returns an API but the context (`api.ctx`) is not filtered
- Internal procedures are completely removed at runtime, not just hidden
- No way to share some context fields with public API while hiding others
- Type filtering (`PublicRouter`) and runtime filtering (`filterPublicRouter`) are separate concerns but don't communicate

---

## Finding 5: Missing Procedure Metadata/Caching Support

### Code Analysis

**File: `package/server/src/types.ts`**

**Lines 8-13** - Minimal procedure definition:
```typescript
export interface BaseProcedure<Ctx, Args, Output> {
  readonly type: ProcedureType;
  readonly argsSchema?: ZodType<Args>;
  readonly handler: (ctx: Ctx, args: Args) => Promise<Result<Output>>;
  readonly name?: string;  // <-- Only metadata field, rarely used
}
```

### Missing Features

1. **No `description` field** - Cannot document procedures
2. **No `deprecated` field** - Cannot mark procedures as deprecated
3. **No `metadata` field** - Cannot attach custom annotations
4. **No `cache` configuration** - No built-in caching support
5. **No `tags` field** - Cannot group procedures for documentation/batching

**File: `package/server/src/router/builder.ts`**

**Lines 24-38** - Route listing functions have no metadata context:
```typescript
export function getPublicRoutes<Ctx, R extends Router<Ctx, any>>(
  router: R
): Array<{ path: string; procedure: Procedure<Ctx, any, any> }> {
  return flattenRouter(router).filter(
    (item) => item.procedure.type === "query" || item.procedure.type === "mutation"
  );
}
```

### Impact

- Cannot generate OpenAPI/Swagger documentation
- Cannot mark deprecated procedures with warnings
- Cannot implement caching strategies per-procedure
- Cannot group procedures by feature/tags
- No introspection capability for tooling

---

## Finding 6: No Per-Request Context Builder

### Code Analysis

**File: `package/server/src/api/factory.ts`**

**Lines 154-162** - Context is provided as a static value:
```typescript
export function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: {
    router: TRoutes;
    context: Ctx;  // <-- Static context object, not a factory
    plugins?: Plugin<Ctx>[];
    middleware?: Middleware<Ctx>[];
    eventEmitter?: EventEmitter<any>;
  }
): TypedAPIInstance<Ctx, TRoutes> {
```

**Lines 170-178** - Context is stored and reused:
```typescript
const state: APIInstanceState<Ctx, TRoutes> = {
  router,
  ctx: context,  // <-- Same context used for all requests
  plugins,
  globalMiddleware: middleware,
  eventEmitter,
  // ...
};
```

**File: `examples/basic/src/index.ts`**

**Lines 57-62** - Context defined as static object:
```typescript
const { t, createAPI } = defineContext({
  context: {
    db,
    logger: console,
  },
});
```

### Root Cause

The context is created once at API creation time and reused across all requests. There is no `createContext` function that would be called per-request with request-specific information (e.g., HTTP headers, authentication tokens, request ID).

### Impact

- Cannot access HTTP request headers/cookies for authentication
- Cannot generate per-request request IDs for tracing
- Cannot inject request-specific dependencies
- Cannot implement tenant isolation (multi-tenant apps)
- Context is shared across all concurrent requests

### tRPC Comparison

tRPC's `createContext` is called per-request:
```typescript
const server = createServer({
  router: appRouter,
  createContext: ({ req, res }) => {
    return {
      req,
      user: extractUser(req.headers.authorization),
      db,
    };
  },
});
```

---

## Summary Table

| Issue | Current State | tRPC Pattern | Severity |
|-------|--------------|---------------|----------|
| Per-procedure middleware | Global only | `procedure.use(mw)` | High |
| Protected procedures | Not possible | `protectedProcedure` | High |
| Input validation | Schema defined but unused | Automatic via `.input()` | High |
| Public API filtering | Separate API via filter | `publicProcedure` base type | Medium |
| Procedure metadata | Only `name?: string` | Full `meta` support | Medium |
| Per-request context | Static context | `createContext({ req })` | High |

---

## Conclusion

The `@deessejs/server` router architecture has a solid foundation but lacks several key features required for building production-ready APIs with complex authentication, authorization, and validation requirements. The system was likely designed with simplicity in mind, but this simplicity comes at the cost of flexibility.

The hooks system (`beforeInvoke`, `afterInvoke`, `onSuccess`, `onError`) attempts to provide some extensibility but cannot substitute for proper per-procedure middleware chains. The `argsSchema` field exists in the type definitions but is never validated, providing a false sense of type safety.

The most critical gaps are:
1. **Per-procedure middleware** - Essential for auth/authz
2. **Input validation** - Critical for API reliability
3. **Per-request context** - Essential for any real-world authentication

These gaps would require significant architectural changes to address, as the current middleware execution model, procedure definition system, and context management are all tightly coupled to the current design.
