# Issue 31: TypeScript Type Inference Fails with Untyped Context

## Problem

When `defineContext({})` is called with an empty object or no explicit type parameter, TypeScript cannot resolve the context type, leading to errors like:

```
Router<unknown> is not assignable to type 'never'
```

## Root Cause

The `defineContext` function signature is:

```typescript
function defineContext<
  Ctx,
  Events extends EventRegistry = EventRegistry
>(
  config: DefineContextConfig<Ctx, Events>
): {
  t: QueryBuilder<Ctx, Events>;
  createAPI: (apiConfig: { router: Router<Ctx>; middleware?: Middleware<Ctx>[] }) => TypedAPIInstance<Ctx, Router<Ctx>>;
}
```

When a user calls `defineContext({})` without explicitly typing `Ctx`, TypeScript infers `Ctx = unknown`. This then propagates through the entire type system, causing the `Router<unknown>` → `never` error.

## Example of the Problem

```typescript
// User code (type error if no explicit types)
const { t, createAPI } = defineContext({
  events: {
    "user.created": { data: { id: string } },
  },
});

// TypeScript error:
// Router<unknown> is not assignable to type 'never'
```

## Senior Analysis

The issue is that `unknown` propagates through the generic constraint chain:

1. `Ctx = unknown` from inference
2. `Router<Ctx>` = `Router<unknown>` becomes problematic
3. Eventually ends up as `never` in some constraint checks

## Required Fix

Add a constraint to ensure `Ctx` defaults to `Record<string, unknown>` or use a base interface:

```typescript
// Option 1: Default Ctx to object
function defineContext<
  Ctx extends object = Record<string, unknown>,
  Events extends EventRegistry = EventRegistry
>(config: DefineContextConfig<Ctx, Events>) { ... }

// Option 2: Provide a base interface
interface BaseContext {
  // Empty or with minimal required properties
}
```

## Impact

- **Developer Experience:** Users get confusing TypeScript errors when they don't provide explicit types
- **Workaround:** Requires explicit typing `defineContext<MyContext, MyEvents>({ ... })`

## Priority

**Medium** - runtime works correctly, but DX (Developer Experience) suffers

## Status

Not yet implemented
