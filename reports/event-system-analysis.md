# Event System Analysis Report for @deessejs/server

## Executive Summary

This report provides a deep technical analysis of the event system in @deessejs/server, examining the event emitter, pending event queue, DSL, and their integration with mutations. Six significant issues have been identified that affect reliability, performance, and memory management.

---

## 1. Race Condition - Parallel Handler Execution with No Ordering Guarantees

**File:** `packages/server/src/events/emitter.ts`
**Lines:** 78-87

```typescript
const promises: Promise<void>[] = [];

for (const handler of allHandlers) {
  const result = handler(payload);
  if (result instanceof Promise) {
    promises.push(result);
  }
}

await Promise.all(promises);
```

**Issue:** All handlers are executed in parallel via `Promise.all()`. This means if Handler A and Handler B both listen to `user.created`, their execution order is non-deterministic. For use cases like audit logging (lines 83-93 in context.ts) where handler ordering matters for consistency, this creates a race condition. Handler B might complete before Handler A, causing audit logs to appear out of order.

**Impact:** High - Cross-cutting concerns like audit trails may record events in unpredictable order. Callers expecting sequential processing (e.g., notification before persistence) cannot rely on the current implementation.

---

## 2. eventLog Memory Leak - Unbounded Growth

**File:** `packages/server/src/events/emitter.ts`
**Lines:** 5, 73, 90-96

```typescript
private eventLog: EventPayload[] = [];

// In emit():
this.eventLog.push(payload);

// Public API:
getEventLog(): EventPayload[] {
  return [...this.eventLog];
}

clearEventLog(): void {
  this.eventLog = [];
}
```

**Issue:** The `eventLog` array grows indefinitely. Every call to `emit()` pushes to this array with no automatic cleanup. The `clearEventLog()` method exists but must be called manually. There is no automatic size limit, TTL mechanism, or automatic cleanup in the codebase.

The test at `events.test.ts` lines 565-585 explicitly expects cumulative behavior:
```typescript
it("should not clear pending events after successful emission (cumulative log)", async () => {
  // ...
  // Next mutation should have MORE events (cumulative)
  expect(events2.length).toBe(4); // 2 + 2
});
```

**Impact:** High - Long-running applications will accumulate event payloads in memory indefinitely. Each payload includes `timestamp` (ISO string), `data`, `name`, and `namespace` - all held in memory.

---

## 3. flush() Error Handling - Mid-Loop Failure Leaves Events Unprocessed

**File:** `packages/server/src/events/queue.ts`
**Lines:** 28-37

```typescript
flush: async (emitter: EventEmitter | undefined): Promise<void> => {
  if (!emitter || _events.length === 0) {
    _events = [];
    return;
  }
  for (const event of _events) {
    await emitter.emit(event.name, event.data, event.namespace);
  }
  _events = [];  // Only cleared AFTER successful iteration
},
```

**Issue:** If `emitter.emit()` throws an error on the 3rd of 5 events:
1. The error propagates up
2. The `for...of` loop terminates early
3. Events indices 4 and 5 are never emitted
4. `_events = []` on line 36 is **never reached**
5. The remaining events are lost permanently

**Impact:** High - Any event emission failure mid-flush results in data loss. Combined with issue #2, failed events are not even properly tracked for retry.

---

## 4. Wildcard Limitations - No Leading Wildcards (*.created)

**File:** `packages/server/src/events/emitter.ts`
**Lines:** 116-136

```typescript
private isWildcardMatch(eventName: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern === eventName) return true;

  const eventParts = eventName.split(".");

  // Check if pattern ends with ".*" (suffix wildcard)
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    const prefixParts = prefix.split(".");
    if (eventParts.length >= prefixParts.length) {
      for (let i = 0; i < prefixParts.length; i++) {
        if (prefixParts[i] !== eventParts[i]) return false;
      }
      return true;
    }
  }

  return false;
}
```

**Issue:** Only suffix wildcards are supported (`user.*`, `email.*`). The pattern `*.created` is **not supported**. A developer cannot subscribe to "all created events" across different entities (e.g., `user.created`, `order.created`, `product.created`).

The code only checks `pattern.endsWith(".*")` at line 123. There is no handling for leading wildcards.

**Impact:** Medium - Developers must register separate handlers for each `*.created` event or use the global wildcard `*`, which catches all events without discrimination.

---

## 5. Performance Issue - O(n) Wildcard Matching on Every Emit

**File:** `packages/server/src/events/emitter.ts`
**Lines:** 51-53, 98-114

```typescript
// In emit():
const handlers = this.listeners.get(eventName);
const wildcardHandlers = this.getWildcardHandlers(eventName);

// getWildcardHandlers iterates ALL registered patterns:
private getWildcardHandlers(eventName: string): Set<...> {
  const handlers = new Set<...>();
  for (const pattern of this.listeners.keys()) {  // O(n) iteration
    if (this.isWildcardMatch(eventName, pattern)) {
      // ... add handlers
    }
  }
  return handlers;
}
```

**Issue:** Every `emit()` call performs:
1. A `Map.get()` for exact match
2. Full iteration over ALL registered patterns in the `listeners` Map
3. For each pattern, a string `split(".")` and comparison loop in `isWildcardMatch`

With `n` registered patterns, each emit is O(n). As the number of handlers grows, emit performance degrades linearly.

**Impact:** Medium - For applications with many wildcard subscriptions, high-frequency event emissions could cause performance degradation. No indexing or caching of wildcard matches is performed.

---

## 6. Error Isolation - One Throwing Handler Breaks Others

**File:** `packages/server/src/events/emitter.ts`
**Lines:** 78-87

```typescript
await Promise.all(promises);
```

**Issue:** `Promise.all()` follows "fail-fast" semantics. If Handler A throws an error, Handler B and Handler C are still executing or may be rejected, but the aggregate Promise rejects immediately. The error from the first rejecting handler propagates up to the caller of `emit()`.

In the context of `queue.flush()` (queue.ts line 34), this means a single throwing handler can cause the entire queue flush to fail, potentially leaving subsequent events unflushed.

**Impact:** Medium - Robust event systems should isolate handler failures. One buggy handler (e.g., database connection lost in audit logger) should not prevent other handlers (e.g., email notifier) from executing.

---

## Summary Comparison with tRPC Subscriptions

| Aspect | @deessejs/server Events | tRPC Subscriptions |
|--------|------------------------|-------------------|
| Handler ordering | Non-deterministic (Promise.all) | Sequential per subscription |
| Memory management | Unbounded eventLog | Handled by user/limiter |
| Error handling | Fail-fast (Promise.all) | Per-handler isolation |
| Wildcard support | Suffix only (user.*) | Pattern-based, flexible |
| Performance | O(n) pattern scan per emit | Optimized with dedicated routers |
| Event persistence | Built-in eventLog | Not built-in |
| Transport | In-memory (local) | WebSocket/Server-Sent Events |
| Real-time | No (poll/log retrieval) | Yes (push) |
| Client-initiated | No | Yes (subscribe) |
| Type safety | Full TypeScript | Full TypeScript |
| Scalability | Single instance | Multi-instance via Redis |

---

## Code Snippets Showing Issues

**Issue #3 - Mid-loop failure scenario:**
```typescript
// queue.ts lines 33-36
for (const event of _events) {
  await emitter.emit(event.name, event.data, event.namespace);
  // If this throws, line 36 never executes
}
_events = [];
```

**Issue #4 - Wildcard only supports suffix:**
```typescript
// Can do:
t.on("user.*", handler);  // Matches user.created, user.updated

// CANNOT do:
t.on("*.created", handler);  // Would NOT match user.created
```

**Issue #6 - Fail-fast error propagation:**
```typescript
// emitter.ts line 87
await Promise.all(promises);  // If ANY handler throws, emit() throws
```

---

## Summary Table of Files and Issues

| File | Lines | Issue |
|------|-------|-------|
| `packages/server/src/events/emitter.ts` | 78-87 | Promise.all() parallel execution |
| `packages/server/src/events/emitter.ts` | 5,73,90-96 | eventLog unbounded growth |
| `packages/server/src/events/queue.ts` | 28-37 | flush() mid-loop failure |
| `packages/server/src/events/emitter.ts` | 116-136 | No leading wildcard support |
| `packages/server/src/events/emitter.ts` | 98-114 | O(n) wildcard matching |
| `packages/server/src/events/emitter.ts` | 87 | Fail-fast error propagation |

---

## Conclusion

The event system architecture is well-structured with clear separation of concerns (EventEmitter, PendingEventQueue, DSL). The transactional integrity - events only emitted if mutation succeeds - is a distinctive and valuable feature.

However, the implementation has critical reliability issues:

1. **Race conditions** from parallel handler execution
2. **Memory leaks** from unbounded eventLog
3. **Data loss** from mid-flush failures
4. **Limited patterns** for wildcard matching
5. **Performance concerns** from O(n) pattern scanning
6. **Brittle error handling** from fail-fast semantics

These issues would need addressing before the event system can be considered production-ready for high-frequency event scenarios or applications requiring strong ordering guarantees.
