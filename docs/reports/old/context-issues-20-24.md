# Issue 20: EventEmitter Singleton Data Leak Risk

## Problem

The `eventEmitter` instance is created **once** at `defineContext()` call time. In a server environment (Node.js/Bun), all users share the same EventEmitter instance.

**Risk:** If User A triggers a "login" event, User B could potentially access it via event logs.

## Senior Review Analysis

> From docs/rules/lifecycle-rule.md: **Plugins at creation, middlewares at execution.**

The `EventEmitter` is a stateful, per-request resource that should be:
1. Created per-request in `createAPI` or the handler
2. OR injected via request context
3. NOT a singleton at app initialization

## Root Cause

```typescript
// builder.ts line 19 - EventEmitter created ONCE
const eventEmitter = events ? new EventEmitter<Events>(events) : undefined;

// Passed to createAPI - shared across ALL requests
const createAPIFn = (apiConfig) => {
  return createAPI({ ..., eventEmitter });
};
```

## Required Fix

Move EventEmitter creation from `defineContext` to `createAPI`:

```typescript
// In createAPI (per-request)
const eventEmitter = new EventEmitter<Events>(config.events);

// Or pass eventConfig and let createAPI instantiate
```

## Impact

- **Security:** Prevents cross-request data leakage
- **Correctness:** Each request gets its own event history
- **Architecture:** Follows lifecycle rule (creation vs execution)

---

# Issue 21: createContext Called Too Early (Dead Context)

## Problem

In `defineContext`, `createContext()` is called immediately without a request:

```typescript
const initialContext = createContext ? createContext() : context;
```

At this point (app initialization), there are **no HTTP headers, no URL, no request**. The `initialContext` will always be empty or partial. Passing this "dead context" to `QueryBuilder` is misleading.

## Senior Review Analysis

The config comment says:
> "Use this for extracting auth user from headers"

But headers only exist during **request execution**, not during `defineContext` (app startup).

## Required Fix

1. Don't call `createContext()` in `defineContext`
2. Pass `createContext` factory to `createAPI` so it can call it **per-request**
3. `QueryBuilder` should only need the **Type** of Ctx, not the instance

```typescript
// QueryBuilder should be type-only, not instance-bound
const t = new QueryBuilder<Ctx, Events>(); // No context instance needed
```

---

# Issue 22: Ambiguous `events` Parameter Naming

## Problem

In `DefineContextConfig`:

```typescript
events?: Events;
```

The variable name `events` is the same as the type `Events`. This is confusing:
- Is `events` a value (EventEmitter instance)?
- Or a type configuration object?
- Or a registry for type inference only?

## Senior Review Analysis

If `Events` is just a type registry for TypeScript inference, the runtime value should not be needed.

## Required Fix

Rename for clarity:

```typescript
// Option A: If it's just for type inference
eventsConfig?: Events; // or never mentioned at runtime

// Option B: If it's a configuration
eventRegistry?: Events;
```

---

# Issue 23: Missing `Ctx extends object` Constraint

## Problem

`Ctx` is left unbounded:

```typescript
function defineContext<Ctx, Events extends EventRegistry = EventRegistry>(...)
```

If a user passes `number` or `"string"` as Ctx, the code will crash at runtime when doing `{...ctx}` or `Object.assign(ctx, ...)`.

## Required Fix

Add constraint:

```typescript
function defineContext<
  Ctx extends object,  // <-- Add this
  Events extends EventRegistry = EventRegistry
>(config: DefineContextConfig<Ctx, Events>) { ... }
```

---

# Issue 24: QueryBuilder Coupled to Context Instance

## Problem

`QueryBuilder` is instantiated with an actual context **instance** at `defineContext` time:

```typescript
const t = new QueryBuilder<Ctx, Events>(initialContext as Ctx, eventEmitter as any);
```

But `QueryBuilder` only needs the **Type** of Ctx to build procedures. The actual context instance should only exist during route execution.

## Senior Review Analysis

> From docs/rules/lifecycle-rule.md: **Plugins at creation, middlewares at execution.**

`QueryBuilder` is a "definition time" factory - it should not require runtime context.

## Required Fix

1. Make `QueryBuilder` type-only (compile-time only)
2. Store the `createContext` factory, not the initial context
3. The actual context + eventEmitter should be created **per-request** in `createAPI`

```typescript
// QueryBuilder should be purely type-driven
const t = new QueryBuilder<Ctx, Events>(); // No runtime deps

// createAPI should create context + EventEmitter per request
const api = createAPI({
  router,
  createContext: (reqInfo) => ({ user: extractUser(reqInfo) }),
  events: { /* registry */ }
});
```

---

# Summary

| Issue | Severity | Root Cause | Fix |
|-------|----------|------------|-----|
| #20 EventEmitter singleton | **Critical** | Shared instance across requests | Move creation to per-request |
| #21 Dead context call | Medium | `createContext()` called at startup | Pass factory to createAPI |
| #22 Ambiguous naming | Low | `events` vs `Events` confusion | Rename to `eventRegistry` |
| #23 No Ctx constraint | Medium | `Ctx` unbounded | Add `extends object` |
| #24 Context coupling | Medium | QueryBuilder needs instance | Make type-only |
