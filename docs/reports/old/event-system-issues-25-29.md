# Event System Senior Review (Issues 25-29)

**Global Note: 6.5/10**

**Quick Analysis:** Complete system with advanced features (wildcards, transactional queue). Intent is excellent and code is well-organized. However, it contains fragile heuristics for type detection and async execution choices that could cause major reliability and performance issues in production.

---

## Issue 25: Fragile `flattenEvents` Heuristic (Critical)

### Problem

In `flattenEvents`, the distinction between an event and a namespace is made with:

```typescript
if (value && ... && Object.keys(value).length <= 2)
```

### Why This Is Dangerous

This is a "magic rule" that's very risky. If tomorrow you add an optional property to an event definition (e.g., `metadata`, `traceId`), or if a namespace contains only a single sub-event, your logic will collapse or misinterpret the tree.

### Senior Recommendation

Use an explicit "brand" or flag. For example, the `event()` function should add a hidden field `__type: 'event'`. Never rely on the number of keys in an object to determine its nature.

```typescript
// Current (fragile)
if (value && typeof value === "object" && "data" in value && Object.keys(value).length <= 2)

// Senior approach
interface EventWithBrand {
  data: unknown;
  readonly __deesseEventBrand: symbol;
}

function isEventDefinition(obj: unknown): obj is EventWithBrand {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "__deesseEventBrand" in obj
  );
}
```

### Reference

- docs/rules/typing-rule.md (no magic numbers/keys)
- docs/rules/api-rule.md (explicit over implicit)

---

## Issue 26: Sequential Handler Execution (Performance)

### Problem

In `emitter.ts`, handlers are triggered with a sequential `for...of` loop:

```typescript
for (const handler of allHandlers) {
  const result = handler(payload);
  if (result instanceof Promise) await result;
}
```

### Why This Is a Problem

If you have 5 handlers and the first takes 2 seconds (API call, DB), the other 4 wait. For an event system, this is often unacceptable.

### Senior Recommendation

Unless order is critical, use `Promise.allSettled()` to launch all handlers in parallel. This prevents a slow handler from paralyzing the entire pipeline.

```typescript
await Promise.allSettled(
  Array.from(allHandlers).map(async (handler) => {
    try {
      const result = handler(payload);
      if (result instanceof Promise) await result;
    } catch (error_) {
      // Log but don't throw - let other handlers complete
      console.error(`Handler error:`, error_);
    }
  })
);
```

### Reference

- docs/rules/performance-rule.md
- docs/rules/event-rule.md

---

## Issue 27: "All or Nothing" Failure Strategy (Reliability)

### Problem

If one handler crashes, `emit` stops and returns an error:

```typescript
for (const handler of allHandlers) {
  try {
    const result = handler(payload);
    if (result instanceof Promise) await result;
  } catch (error_) {
    return err(fpErr); // Stops ALL remaining handlers!
  }
}
```

### Why This Is a Problem

In a decoupled system, if the "Logging" handler crashes, you still want the "Email confirmation" handler to execute. Here, a single failure blocks all subsequent ones.

### Senior Recommendation

Capture errors individually for each handler, log them, but let others execute. The emitter should never be responsible for crashing a third-party consumer.

```typescript
const results = await Promise.allSettled(
  Array.from(allHandlers).map(handler => handler(payload))
);

const errors = results.filter(r => r.status === "rejected");
if (errors.length > 0) {
  // Log errors but don't fail the entire emit
  for (const error_ of errors) {
    console.error("Handler failed:", error_.reason);
  }
}
return ok(unit);
```

### Reference

- docs/rules/event-rule.md (flush after success, clear on error)
- docs/rules/middleware-rule.md (try/catch for isolation)

---

## Issue 28: Wildcard Matching Performance (GC Pressure)

### Problem

`isWildcardMatch` does `split('.')` and string manipulations on every emit:

```typescript
private isWildcardMatch(eventName: string, pattern: string): boolean {
  const eventParts = eventName.split(".");  // Created EVERY emit
  // ...
}
```

### Why This Is a Problem

On a high-throughput system (e.g., 1000 msg/sec), GC pressure will explode due to massive creation of ephemeral string arrays.

### Senior Recommendation

Since patterns are known in advance (at `.on()` time), compile them into `RegExp` once and store them. `test()` of a pre-compiled regex is much more performant than repeated splits.

```typescript
// At registration time
if (pattern.endsWith(".*")) {
  const regex = new RegExp("^" + pattern.replace(".*", "\\..*") + "$");
  this.patternIndex.set(pattern, regex);
}

// At match time
private isWildcardMatch(eventName: string, pattern: string): boolean {
  const compiled = this.patternIndex.get(pattern);
  if (compiled) return compiled.test(eventName);
  // Fallback for dynamic patterns
  // ...
}
```

### Reference

- docs/rules/performance-rule.md (avoid allocations in hot paths)

---

## Issue 29: Unnecessary `Result` Wrapping in Queue (Cognitive Load)

### Problem

`enqueue(event: PendingEvent): Result<...>` wraps a simple array push in Result:

```typescript
enqueue: (event: PendingEvent) => {
  _events.push(event);  // Cannot practically fail in JavaScript
  return ok({ ... });   // Unless OOM - very rare
}
```

### Why This Is a Problem

Pushing an object to an array (`_events.push`) can practically never fail in JavaScript (except OOM). Wrapping this in `Result.ok()` adds cognitive complexity and additional memory allocation for nothing.

### Senior Recommendation

Keep `Result` for operations with a real probability of failure (I/O, parsing, validation).

```typescript
// Current
enqueue: (event: PendingEvent): Result<...> => {
  _events.push(event);
  return ok({ eventName: ..., data: ..., processed: true, ... });
}

// Senior approach
enqueue: (event: PendingEvent) => {
  _events.push(event);
  // No return value needed - void
  // Or return the event for chaining
  return event;
}
```

### Reference

- docs/rules/api-rule.md (Result contracts for business logic, not mechanical operations)

---

## Senior Rules Compliance Analysis

| Rule | Compliance | Notes |
|------|------------|-------|
| **Typing Rule** | ⚠️ Partial | `flattenEvents` uses `as any` - hides fragility of type detection |
| **Event Rule** | ✅ Good | `PendingEventQueue` respects atomicity with `slice(processedCount)` |
| **Performance Rule** | ⚠️ Needs work | `split()` in hot paths (Emitter) is GC pressure risk |
| **Middleware Rule** | ✅ Good | try/catch in handlers - good isolation |
| **Lifecycle Rule** | ⚠️ Needs work | EventEmitter should be per-request, not singleton |

---

## What I Like

- **Wildcard Indexing:** The `prefixIndex` for optimizing `user.*` pattern searches shows real thinking about performance. Very "Senior".
- **Namespace DSL:** The ability to group events by domain is great for maintainability of large projects.
- **Transactional Queue:** The `slice(processedCount)` rollback on flush failure is an excellent implementation.

---

## Summary

| Issue | Severity | Problem | Fix |
|-------|----------|---------|-----|
| #25 `flattenEvents` heuristic | **Critical** | Magic key count detection | Use explicit brand/flag |
| #26 Sequential handlers | Medium | Slow handler blocks all others | Use `Promise.allSettled` |
| #27 All-or-nothing emit | Medium | One handler crash kills pipeline | Isolate errors per handler |
| #28 Wildcard GC pressure | Medium | `split()` creates garbage per emit | Pre-compile RegExp |
| #29 Unnecessary Result | Low | Cognitive overhead for push | Remove Result wrapper |

---

## What Was Not Addressed

The user asked: *"As-tu déjà implémenté la partie qui lie ces événements aux procédures (trigger auto)?"*

**Answer:** No automatic procedure triggering from events has been implemented. This would be a significant feature that requires:

1. Event-to-procedure mapping registry
2. Automatic trigger on `ctx.send()`
3. Potential async execution within the queue flush
4. Error handling propagation back to the caller

This should be a separate issue/feature if needed.
