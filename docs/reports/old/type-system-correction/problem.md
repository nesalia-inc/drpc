# Type System Correction - Problem Analysis

**Date**: April 13, 2026
**Project**: @deessejs/server
**Version**: 1.2
**Status**: In Progress

---

## 1. Executive Summary

The main issue was that the `ctx` parameter in procedure handlers ended up typed as `any`, forcing users to cast like `(ctx as any).send()` to emit events.

**Initial problem**:
```typescript
// In examples, users had to cast
handler: async (ctx, args) => {
  (ctx as any).send("user.created", { id: user.id }); // <-- untyped
}
```

**Result after correction** (Phase 1-3):
```typescript
// ctx is now correctly typed as HandlerContext
handler: async (ctx, args) => {
  ctx.send("user.created", { id: user.id }); // <-- type-safe
}
```

> **Reviewer's Note**: The implemented changes add type annotations but the fundamental architecture issues remain. See Section 5 for the detailed critical assessment.

---

## 2. Root Causes Identified

### 2.1 Primary erosion: `createHookedProcedure`

**File**: `package/server/src/query/builder.ts:117-154`

```typescript
// BEFORE - BaseProc with handler typed as any
interface BaseProc {
  handler: (ctx: any, args: any) => Promise<Result<any>>; // <-- ANY HERE
}

function createHookedProcedure<Proc extends BaseProc>(
  proc: Proc
): Proc & HookedProcedureMixin<any, any> { // <-- Returns any, any
```

The same pattern was duplicated in 4 files:
- `query/builder.ts`
- `mutation/builder.ts`
- `internal-query/builder.ts`
- `internal-mutation/builder.ts`

### 2.2 Secondary erosion: `createAPI` returns `any`

**File**: `api/factory.ts:162`

```typescript
export function createAPI<Ctx, TRoutes extends Router<Ctx>>(
  config: { ... }
): any { // <-- Destroys all type information
```

When calling `createAPI({ router: appRouter })`, the returned `api` has no type information. So `api.users.list({})` has no typed args, and TypeScript defaults to `any`.

### 2.3 `send` missing from types

The `ContextWithSend` type existed in `types.ts` but was never used:

```typescript
// types.ts:98-104 - defined but never imported
export interface ContextWithSend<Ctx, Events extends EventRegistry> {
  ctx: Ctx;
  send: <EventName extends keyof Events>(
    event: EventName,
    data: Events[EventName]["data"]
  ) => void;
}
```

---

## 3. Degraded Type Flow

```
defineContext<Context, Events>(config)
  │
  v
QueryBuilder<Ctx>.query({ handler: (ctx, args) => ... })
  │
  v
createHookedProcedure({ handler })  --> returns HookedProcedureMixin<any, any>
  │                                  ^^^^ Ctx, Args erased HERE
  v
createAPI({ router })
  │
  v (returns any)
api.users.create(args)  --> ctx is any
```

---

## 4. Impact

The type erosion means:
1. Users cannot get proper type inference for `ctx` in handlers
2. The `send` method is not type-safe with respect to Events
3. Client-side procedure calls also lose type information
4. Linting and type-checking pass but actual type safety is broken

---

## 5. Critical Gaps (Senior Review Assessment - 4/10)

The senior review identified that the implemented corrections do not actually fix the core problem. The type system remains fundamentally broken for the `Events` generic.

### Gap 1: The `Events` Generic Does NOT Actually Flow

The report claims the `Events` generic should flow through the chain, but **this chain is fundamentally broken**:

**Evidence - `defineContext` drops `Events`**:
```typescript
// context/builder.ts
export function defineContext<Ctx, Events extends EventRegistry = EventRegistry>(config) {
  // ...
  const t = new QueryBuilder<Ctx>(context, eventEmitter as any);  // <-- Events is DROPPED
  // ...
}
```

`QueryBuilder<Ctx>` has **no Events generic parameter**. The `Events` type is accepted but never passed.

**Evidence - `QueryBuilder` has no Events parameter**:
```typescript
// query/builder.ts
export class QueryBuilder<Ctx> {  // <-- No Events generic
  constructor(
    private context: Ctx,
    private eventEmitter?: EventEmitter<any>
  ) {}
}
```

**Evidence - `query()` method doesn't propagate Events**:
```typescript
// query/builder.ts:29-37
query<Args, Output>(config: QueryConfig<Ctx, Args, Output>): QueryWithHooks<Ctx, Args, Output> {
  // Note: No Events generic on query<Args, Output>()
  // Events defaults to EventRegistry = {} (empty object)
  return createHookedProcedure({...}) as QueryWithHooks<Ctx, Args, Output>;
}
```

The `Events` generic defaults to `EventRegistry = {}` (empty object), so `HandlerContext<Ctx, Events>` becomes `HandlerContext<Ctx, {}>`.

### Gap 2: `HandlerContext` is Defined But Never Used at Runtime

The type exists in `types.ts`:
```typescript
export type HandlerContext<Ctx, Events extends EventRegistry> = Ctx & {
  send: <EventName extends keyof Events>(...) => void;
};
```

But `createHandlerContext` creates a different type:
```typescript
// factory.ts:81-98
function createHandlerContext<Ctx>(ctx: Ctx, queue: ...): Ctx & { send: SendFunction } {
  const send: SendFunction = (name: string, data: unknown, options?: SendOptions) => {
    // ...untyped send function
  };
  return { ...(ctx as object), send } as Ctx & { send: SendFunction };
  // ^-- NOT HandlerContext! send is (name: string, data: unknown) - untyped
}
```

The `send` function is typed as `SendFunction = (name: string, data: unknown) => void` - **completely untyped with respect to Events**.

### Gap 3: `TypedAPIInstance` is Decorative, Not Functional

Even though `createAPI` now has the signature:
```typescript
export function createAPI<Ctx, TRoutes extends Router<Ctx>>(...): TypedAPIInstance<Ctx, TRoutes>
```

The call site in `defineContext` still casts:
```typescript
// context/builder.ts:34
return createAPI({...}) as any;  // <-- STILL AS ANY!
```

The return type is decorative - it exists for documentation but is bypassed.

### Gap 4: The Hono Comparison is Inapt

**How Hono actually works** (runtime mechanism):
```typescript
const app = new Hono<{ Variables: { user: User } }>();
c.set('user', currentUser);  // Runtime storage with type safety
const user = c.var.user;     // Type-safe retrieval
```

**How @deessejs/server works** (type-level only):
- `HandlerContext` is a type-only intersection
- No runtime mechanism to `set`/`get` variables
- The actual runtime context is `Ctx & { send: SendFunction }` - a plain object spread

These are fundamentally different patterns.

---

## 6. Architecture Issues Not Addressed

### Issue A: Middleware Context Type is Inconsistent

```typescript
// types.ts:43-50
export interface Middleware<Ctx, Args = unknown> {
  handler: (
    ctx: Ctx & { args: Args; meta: Record<string, unknown> },  // <-- Different shape
    next: () => Promise<Result<unknown>>
  ) => Promise<Result<unknown>>;
}
```

Middleware receives a differently-shaped context than handlers, yet both are cast to `any` at call sites.

### Issue B: `flattenEvents` Type Mismatch

The `defineEvents` DSL supports namespaces like `user.created` via `eventNamespace`, but `flattenEvents` flattens this at runtime while TypeScript types don't reflect the flattening.

### Issue C: Internal Procedures

Internal query/mutation builders have the same `as any` pattern. The report doesn't analyze whether these have the same or different issues.

---

## 7. Current Limitations

### `as any` Still Needed in Examples

Although types are now correct, examples still use `(ctx as any).send()`:

```typescript
// examples/events-example/src/server/routers/users.ts
handler: async (ctx, args) => {
  (ctx as any).send("user.created", { id: user.id }); // <-- still present
}
```

### Why?

- `HandlerContext<Ctx, Events>` is an intersection type `Ctx & { send: ... }`
- TypeScript cannot infer that `ctx` (typed as plain `Ctx`) is actually a `HandlerContext<Ctx, Events>` at runtime

### Root Cause

The fundamental issue is that the `Events` generic does not actually flow through the chain:

```typescript
// defineContext accepts Events
export function defineContext<Ctx, Events extends EventRegistry = EventRegistry>(config) {
  // But creates QueryBuilder WITHOUT Events
  const t = new QueryBuilder<Ctx>(context, eventEmitter as any);  // <-- Events dropped
}
```

---

## 8. Unanswered Questions

1. **How should Events actually flow?** The report says "make it flow" but provides no concrete implementation plan.

2. **How does `defineEvents` preserve type information?** The constructor receives `_events?: Events` but does nothing with it - purely static typing.

3. **What is the runtime validation strategy?** If no events are specified, `HandlerContext<Ctx, EventRegistry>` allows `ctx.send("any.string", { anyShape: true })`.

---

## 9. Summary Assessment

| Aspect | Report Rating | Reviewer Assessment |
|--------|---------------|---------------------|
| Problem identification | 8/10 | Accurate symptoms identified |
| Root cause analysis | 6/10 | Surface causes found, deeper issues missed |
| Technical accuracy | 3/10 | HandlerContext defined but not used; Events still doesn't flow |
| Completeness | 4/10 | Many gaps: middleware, internal procs, flattenEvents |
| Architecture recommendations | 2/10 | Hono comparison is inapt; recommendations disconnected from code |
| Practicality | 2/10 | "Next steps" are not actionable given current architecture |
| Backward compatibility claim | 5/10 | Types added but `as any` still used everywhere |
| Verification | 3/10 | Only lint/typecheck - no actual type safety verification |

### Key Findings

**What Was Missed**:
1. Events generic doesn't flow through the chain
2. HandlerContext defined but never used at runtime
3. TypedAPIInstance is decorative, not functional
4. Hono comparison is fundamentally inapt

### Final Assessment

*"The types exist on paper but are completely bypassed at runtime. The type system and the runtime execution are two completely separate systems that were not actually connected by this refactoring."*