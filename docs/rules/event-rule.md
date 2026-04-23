# Event Rule - "L'Atomicite des Effets"

## Rule

**Flush events after success only.**
**Clear events on error.**
**No fire-and-forget - await ALL async operations.**

## Why

Fire-and-forget creates invisible failures:
- Errors disappear silently
- State becomes inconsistent
- Debugging is nearly impossible
- Events leak across contexts

## Anti-Patterns (Forbidden)

```typescript
// WRONG - fire and forget
const processOrder = (order: Order) => {
  saveToDatabase(order);
  emit("order:created", order); // What if this fails?
  return ok(order);
};

// WRONG - not awaiting async operations
const handleEvent = async (data: Data) => {
  fetch("/api/log", { method: "POST", body: JSON.stringify(data) });
  // fetch might fail silently!
  return ok(data);
};

// WRONG - event emitted even on error
const executeQuery = async (query: Query) => {
  try {
    const result = await db.execute(query);
    emit("query:success", query); // But what if result is empty?
    return ok(result);
  } catch (error) {
    emit("query:error", { query, error }); // Side effect on failure!
    return err(error);
  }
};

// WRONG - not clearing on error
const processPayment = async (payment: Payment) => {
  pendingEvents.push({ type: "payment", payment });
  try {
    await chargeCard(payment);
    // Success - flush happens
    await flushPendingEvents();
    return ok(payment);
  } catch (error) {
    return err(error); // Event still pending!
  }
};
```

## Correct Patterns

### 1. Await All Async Operations

```typescript
// GOOD - all operations awaited
const handleEvent = async (data: Data): Promise<Result<void>> => {
  await fetch("/api/log", { method: "POST", body: JSON.stringify(data) });
  return ok(data);
};

// GOOD - comprehensive error handling
const processOrder = async (order: Order): Promise<Result<Order>> => {
  try {
    const saved = await saveToDatabase(order);
    await emit("order:created", saved); // Awaited, can fail
    return ok(saved);
  } catch (error) {
    return err(error); // Error propagates properly
  }
};
```

### 2. Flush After Success Only

```typescript
// GOOD - flush only on success
const processPayment = async (payment: Payment): Promise<Result<void>> => {
  const pending = createPendingEvents();

  try {
    await chargeCard(payment);
    pending.flush(); // Only flush on success
    return ok();
  } catch (error) {
    pending.clear(); // Clear on failure
    return err(error);
  }
};
```

### 3. Event Queue Pattern

```typescript
// GOOD - atomic event handling
const createEventQueue = <T>(processor: (events: T[]) => Promise<void>) => {
  let queue: T[] = [];

  return {
    add: (event: T) => { queue.push(event); },
    flush: async () => {
      if (queue.length === 0) return;
      const toFlush = [...queue];
      queue = [];
      await processor(toFlush); // All or nothing
    },
    clear: () => { queue = []; },
  };
};

// Usage
const events = createEventQueue(async (batch) => {
  await analytics.trackBatch(batch);
});

const handleUserAction = async (action: Action): Promise<Result> => {
  events.add({ action, timestamp: Date.now() });
  const result = await processAction(action);
  if (result.ok) {
    await events.flush(); // Success only
  } else {
    events.clear(); // Failure only
  }
  return result;
};
```

## When Events Are Appropriate

| Use Case | Pattern |
|----------|---------|
| Analytics/Logging | Fire-and-forget IS allowed (non-critical) |
| Caching | Flush on success, clear on error |
| Background sync | Await, then clear |
| User-facing mutations | Await all, rollback on failure |

## Enforcement

- No un-awaited async calls in event handlers
- Event queues must flush on success, clear on error
- Comment WHY if fire-and-forget is intentional
- Audit event handlers for missing error handling

## Quick Reference

| Scenario | Action |
|---------|--------|
| Success | Await + Flush |
| Failure | Clear (no flush) |
| Unknown result | Await, check, then decide |
| Non-critical (logging) | Document as fire-and-forget |
