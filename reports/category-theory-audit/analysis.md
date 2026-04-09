# Analysis

## Current Weaknesses

### Gap 1: Direct Context Mutation

The `extend` function in plugins returns `Partial<Ctx>` which is merged imperatively:

```typescript
extend: (ctx) => ({
  userId: null,
  isAuthenticated: false,
})
```

**Problem:** No guarantee that context properties are immutable. Plugin order matters in ways that are not type-enforced.

**Should be:** Context extension as an operation that preserves input context and produces new context.

---

### Gap 2: Error Handling is Ad-Hoc

Handlers throw errors directly:

```typescript
handler: async (ctx, args) => {
  if (!user) {
    throw { code: "NOT_FOUND", message: "User not found" };
  }
}
```

**Problem:** No type safety on error codes. No way to compose error handling across middleware layers.

**Should be:** Typed error codes with composable error transformations.

---

### Gap 3: Hooks Don't Compose

The current hook system:

```typescript
const getUser = t.query({ ... })
  .beforeInvoke(...)
  .onSuccess(...)
  .onError(...)
```

**Problem:** Hooks are attached imperatively and don't compose well. Adding hooks changes the procedure type in ways that aren't tracked.

**Should be:** Composable hooks that can be combined.

---

### Gap 4: Plugin Lifecycle is Implicit

Plugin execution order is sequential:

```
onInvoke (plugins 1→2→3)
```

**Problem:** Ordering is a runtime constraint with no type-level guarantee.

**Should be:** Explicit composition with enforced order.

---

## Missing Abstractions

| Current | Missing | Why It Matters |
|---------|---------|----------------|
| `defineContext()` | Union types | Type-safe context composition |
| `t.query/mutation()` | Batch operations | Combine queries efficiently |
| Hooks | Composition | Merge hook sets |
| `Router` | Path concatenation | Routes as morphisms |
| `Plugin` | Context morphisms | Plugins extend context |

---

## Type-Level Gaps

1. **No route verification**: `api.users.get` fails at runtime if route doesn't exist
2. **No type-safe events**: Event names are strings prone to typos
3. **No cache key types**: Cache keys are runtime strings
4. **No dependent args**: Args shape depends on runtime schema
