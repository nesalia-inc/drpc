# Event Architecture Analysis: Deterministic Events with Embedded Results

**Date:** 2026-04-13
**Status:** Analysis Complete
**Author:** Claude Code (Senior Analysis)

---

## Executive Summary

This document analyzes the current event architecture in `@deessejs/server` and proposes an enhanced architecture where:
1. Events are deterministic and return structured data about what they did
2. Query/mutation results include emitted events via `result.events`
3. Events are embedded in the Result, not stored in a separate global log

---

## 1. Current Architecture Overview

### 1.1 Event Flow Diagram

```
Handler Execution
      |
      v
ctx.send(eventName, data)
      |
      v
[Events queued in pendingEvents[]]
      |
      v
Handler returns Result<Output>
      |
      +---> [If Error/Throw]--> Clear pendingEvents, return error
      |
      +---> [If Success] -----> emitPendingEvents()
                                       |
                                       v
                              eventEmitter.emit(event, data)
                                       |
                                       v
                              eventLog[] (cumulative)
                                       |
                                       v
                              api.getEvents() --> returns ALL events (not per-call)
```

### 1.2 Key Interfaces

**PendingEvent** (`types.ts`):
```typescript
interface PendingEvent {
  name: string;
  data: unknown;
  timestamp: string;
  namespace: string;
  options?: SendOptions;
}
```

**EventPayload** (`types.ts`):
```typescript
interface EventPayload<T = unknown> {
  name: string;
  data: T;
  timestamp: string;
  namespace: string;
  source?: string;
}
```

**EventRegistry** (`types.ts`):
```typescript
interface EventRegistry {
  [eventName: string]: {
    data?: unknown;
    response?: unknown;  // NOTE: This field exists but is never used
  };
}
```

**ContextWithSend** (`types.ts`):
```typescript
interface ContextWithSend<Ctx, Events extends EventRegistry> {
  ctx: Ctx;
  send: <EventName extends keyof Events>(
    event: EventName,
    data: Events[EventName]["data"]
  ) => void;  // Returns void (fire-and-forget)
}
```

### 1.3 Current Limitations

| Issue | Description |
|-------|-------------|
| `ctx.send()` returns void | Fire-and-forget, handler has no confirmation of what was processed |
| No event data in Result | Events are not embedded in the execute result |
| Global event log | `api.getEvents()` returns ALL events from ALL calls, not per-call |
| Unused `response` field | `EventRegistry.response` exists but is never utilized |

---

## 2. Proposed Architecture

### 2.1 Core Principles

1. **Deterministic Events** - `ctx.send()` returns structured data immediately
2. **Embedded Results** - Events are included in `Result.events`, tied to each call
3. **Type Safety** - The unused `response` field in EventRegistry is utilized
4. **Audit-Friendly** - Complete record of what happened in `result.events`

### 2.2 EventResult Type

```typescript
interface EventResult<TData = unknown, TResponse = unknown> {
  eventName: string;
  data: TData;
  response?: TResponse;
  processed: boolean;
  timestamp: string;
  namespace: string;
}
```

### 2.3 Enhanced Result Type

```typescript
interface ExecutedEvent<TData = unknown, TResponse = unknown> {
  name: string;
  data: TData;
  response?: TResponse;
  timestamp: string;
  namespace: string;
}

interface ResultWithEvents<Output, TEvents extends EventRegistry = EventRegistry> {
  ok: true;
  value: Output;
  events: ExecutedEvent[];
}

interface ErrorResult {
  ok: false;
  error: Error;
  events: ExecutedEvent[];  // Empty, but included for interface consistency
}

type ExecuteResult<Output> = ResultWithEvents<Output> | ErrorResult;
```

### 2.4 Enhanced send() Signature

```typescript
send: <EventName extends keyof Events>(
  event: EventName,
  data: Events[EventName]["data"]
) => EventResult<Events[EventName]["data"], Events[EventName]["response"]>;
```

### 2.5 Example Usage

**Before:**
```typescript
const result = await api.users.create({ name: "Alice", email: "alice@example.com" });
// result = { ok: true, value: { id: 1, name: "Alice", email: "..." } }
// Events? Only accessible via api.getEvents() (global log)
```

**After:**
```typescript
const result = await api.users.create({ name: "Alice", email: "alice@example.com" });
// result = {
//   ok: true,
//   value: { id: 1, name: "Alice", email: "..." },
//   events: [
//     { name: "user.created", data: { id: 1 }, response: { auditId: 1 }, timestamp: "...", namespace: "default" },
//     { name: "email.sent", data: { to: "alice@example.com" }, response: undefined, timestamp: "...", namespace: "default" }
//   ]
// }
```

---

## 3. Code Flow Diagrams

### 3.1 Proposed Flow in executeProcedure

```
Handler Execution
      |
      v
ctx.send(eventName, data)
      |
      v
[Event Validation + Processing]
      |
      v
[EventResult returned to handler]
      |
      v
[Handler continues with EventResult data if needed]
      |
      v
Handler returns Result<Output>
      |
      +---> [If Error/Throw]--> Discard pending EventResults, return error
      |
      +---> [If Success] -----> Build ExecutedEvent[] from EventResults
                                       |
                                       v
                              Return ResultWithEvents { value, events }
                                       |
                                       v
                              Async emit to eventEmitter (for global listeners)
```

### 3.2 EventHandler Synchronous Processing

```
ctx.send("user.created", { id: 1, email: "..." })
      |
      v
[Validate data against EventRegistry schema]
      |
      v
[Run sync event handlers (if any)]
      |
      v
[Collect responses into EventResult]
      |
      v
Return EventResult immediately to handler
      |
      v
[Later] Async emit to eventEmitter for global listeners
```

---

## 4. Design Decisions

### 4.1 Event Result Structure: Array vs Map

**Option A: Array (Recommended)**
```typescript
result.events = [
  { name: "user.created", data: {...}, response: {...}, timestamp: "...", namespace: "default" },
  { name: "email.sent", data: {...}, response: undefined, timestamp: "...", namespace: "default" }
]
```
- Maintains ordering
- Allows duplicate event names
- Natural iteration order

**Option B: Map**
```typescript
result.events = {
  "user.created": { data: {...}, response: {...}, timestamp: ... },
  "email.sent": { data: {...}, response: undefined, timestamp: ... }
}
```
- Easy to look up by name
- No ordering guarantee
- Duplicates not supported

**Decision:** Option A (Array) - ordering matters for audit trails and email sequences.

### 4.2 Error Handling Strategy

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| **All-or-nothing** (Recommended) | Events only emitted if handler completes successfully | Simple, predictable | Loses info on partial work |
| **Partial success** | Return events that were processed before failure | More informative | Complex to implement |
| **Transactional** | Events participate in transaction rollback | Most accurate | Most complex |

**Decision:** All-or-nothing for Phase 1. Partial success as future enhancement.

### 4.3 Event Emission Timing

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Deferred** (current) | Emit after handler completes | Transaction integrity | Not deterministic within handler |
| **Immediate** | Emit during ctx.send() | Deterministic within handler | Breaks transaction integrity |
| **Hybrid** (Recommended) | Return EventResult immediately, async emit to listeners | Best of both worlds | Most complex |

**Decision:** Hybrid approach - `ctx.send()` returns immediately, async listeners still receive via `eventEmitter`.

### 4.4 Nested Events

**Current:** Events do NOT trigger other events. Listeners run AFTER handler completion.

**Decision:** Keep flat model. Nested events could cause infinite loops and blur transaction boundaries. Achieved via listeners triggering new `ctx.send()` calls (but this happens AFTER original handler completes).

---

## 5. PendingEventQueue Pattern

### 5.1 Why a Queue Pattern?

The current implementation uses a raw array (`pendingEvents: PendingEvent[]`) scattered throughout the code:

```typescript
// Current - ad-hoc array manipulation
const pendingEvents: PendingEvent[] = [];
ctx.send() → pendingEvents.push(event)
handler success → forEach emit → pendingEvents.length = 0
handler error → pendingEvents.length = 0
```

This approach has issues:
- No encapsulation - anyone can mutate the array directly
- No validation on enqueue
- No hooks for monitoring (debugging, logging)
- Clear by `length = 0` is implicit and error-prone
- No way to inspect pending events without accessing internal state

### 5.2 Closure-Based Queue (Selected)

```typescript
interface PendingEventQueue {
  enqueue(event: PendingEvent): EventResult;
  flush(emitter: EventEmitter | undefined): Promise<void>;
  clear(): void;
  isEmpty(): boolean;
  events(): PendingEvent[];
  size(): number;
}

const createPendingEventQueue = (): PendingEventQueue => {
  let _events: PendingEvent[] = [];

  return {
    enqueue: (event: PendingEvent): EventResult => {
      _events.push(event);
      return {
        eventName: event.name,
        data: event.data,
        processed: true,
        timestamp: event.timestamp,
        namespace: event.namespace,
      };
    },

    flush: async (emitter: EventEmitter | undefined): Promise<void> => {
      if (!emitter || _events.length === 0) {
        _events = [];
        return;
      }
      for (const event of _events) {
        await emitter.emit(event.name, event.data, event.namespace);
      }
      _events = [];
    },

    clear: (): void => {
      _events = [];
    },

    isEmpty: (): boolean => {
      return _events.length === 0;
    },

    events: (): PendingEvent[] => {
      return [..._events];
    },

    size: (): number => {
      return _events.length;
    },
  };
};
```

### 5.3 Benefits of This Pattern

| Aspect | Before (raw array) | After (closure queue) |
|--------|--------------------|-----------------------|
| Encapsulation | Mutable array exposed | Private state, controlled access |
| Validation | None | Can add validation in `enqueue` |
| Hooks | None | Can add `onEnqueue`, `onFlush` callbacks |
| Clear semantics | `length = 0` | Explicit `clear()` method |
| Inspection | Direct array access | `events()` returns copy |
| Size | `array.length` | `size()` method |

### 5.4 Enhanced Version with Hooks (Optional)

```typescript
interface QueueHooks {
  onEnqueue?: (event: PendingEvent) => void;
  onFlush?: (events: PendingEvent[]) => void;
  onClear?: () => void;
}

const createPendingEventQueue = (hooks: QueueHooks = {}): PendingEventQueue => {
  let _events: PendingEvent[] = [];

  return {
    enqueue: (event: PendingEvent): EventResult => {
      _events.push(event);
      hooks.onEnqueue?.(event);
      return { /* EventResult */ };
    },

    flush: async (emitter): Promise<void> => {
      if (_events.length === 0) return;
      hooks.onFlush?.(_events);
      // ... emit logic
    },

    clear: (): void => {
      hooks.onClear?.();
      _events = [];
    },
    // ...
  };
};
```

### 5.5 Integration with createAPI

```typescript
const createAPI = ({ router, context, plugins, middleware, eventEmitter }) => {
  const queue = createPendingEventQueue();

  const handlerCtx = {
    ...context,
    send: (name: string, data: unknown, options?) => {
      return queue.enqueue({
        name,
        data,
        timestamp: new Date().toISOString(),
        namespace: options?.namespace ?? "default",
        options,
      });
    },
  };

  // On success:
  await queue.flush(eventEmitter);

  // On error:
  queue.clear();
};
```

### 5.6 Queue as Module

The queue can live in `src/events/queue.ts`:

```typescript
// src/events/queue.ts
export interface PendingEventQueue {
  enqueue(event: PendingEvent): EventResult;
  flush(emitter: EventEmitter | undefined): Promise<void>;
  clear(): void;
  isEmpty(): boolean;
  events(): PendingEvent[];
  size(): number;
}

export const createPendingEventQueue = (): PendingEventQueue => { /* ... */ };
```

---

## 6. Implementation Path

### Phase 1: Add EventResult Type
- Define `EventResult<TData, TResponse>` interface
- Modify `send()` signature to return `EventResult`
- Update `PendingEvent` to `PendingEventResult`

### Phase 2: Modify Result Type
- Add `events: ExecutedEvent[]` to Result interface
- Create `ResultWithEvents` and `ErrorResultWithEvents` types
- Update `execute()` and `executeRaw()` return types

### Phase 3: Update executeProcedure
- Modify `executeProcedure` to build `ExecutedEvent[]` from `EventResult[]`
- Return `ResultWithEvents` on success
- Return `ErrorResultWithEvents` on failure

### Phase 4: Async Event Emission
- Keep `eventEmitter.emit()` for global listeners
- Emit after handler success (transaction integrity preserved)
- Modify `emitPendingEvents()` to run async

### Phase 5: Update EventRegistry.response
- Allow event handlers to return data
- Populate `response` field in `EventResult`

### Phase 6: Deprecation
- Deprecate `api.getEvents()` in favor of `result.events`
- Update documentation and examples

---

## 7. Pros and Cons

### Pros

| Benefit | Description |
|---------|-------------|
| **Deterministic** | Handler knows exactly what events were processed |
| **Embedded** | Events tied to Result, not a separate global log |
| **Type-safe** | Utilizes the unused `response` field in EventRegistry |
| **Structured** | Each event includes name, data, response, timestamp, namespace |
| **Audit-friendly** | Complete record of what happened in `result.events` |
| **Composable** | Handler can use event results for conditional logic |

### Cons

| Drawback | Description |
|----------|-------------|
| **Breaking change** | `ctx.send()` returned void, now returns `EventResult` |
| **Interface update** | All handlers using `ctx.send()` need updates |
| **Performance** | Returning `EventResult` adds slight overhead |
| **Complexity** | Partial-success error scenarios are complex |

---

## 8. Alternative Approaches

### Alternative 1: Event Sourcing Light

Each mutation produces events as a byproduct. Events are the "truth".

**Pros:** Pure event sourcing
**Cons:** Significant architectural change

### Alternative 2: Middleware-Based Events

Keep `ctx.send()` void but add middleware that collects events into Result.

```typescript
const eventMiddleware = async (ctx, next) => {
  const result = await next();
  return { ...result, events: ctx.getEmittedEvents() };
};
```

**Pros:** Non-invasive, keeps current semantics
**Cons:** Events still deferred, not deterministic within handler

### Alternative 3: Separate Event Accumulator

Keep a separate event accumulator that callers poll.

**Pros:** Clean separation
**Cons:** Still deferred emission

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| `src/types.ts` | Add `EventResult`, `ExecutedEvent`, `ResultWithEvents` types |
| `src/api/factory.ts` | Update `send()`, `executeProcedure`, `emitPendingEvents` |
| `src/api/types.ts` | Update `LocalExecutor` interface (if still needed) |
| `src/events/emitter.ts` | Update `emit()` signature |
| `src/events/dsl.ts` | Update `event()` return type |
| `examples/*` | Update all usages of `ctx.send()` and `result` |

---

## 10. Backward Compatibility

### Strategy: Dual-Mode send()

```typescript
// Type-safe wrapper that returns EventResult
send: <EventName extends keyof Events>(
  event: EventName,
  data: Events[EventName]["data"]
) => EventResult<Events[EventName]["data"], Events[EventName]["response"]>;

// Original void behavior available as:
sendFireAndForget: <EventName extends keyof Events>(
  event: EventName,
  data: Events[EventName]["data"]
) => void;
```

This allows gradual migration - handlers can opt into the new behavior without breaking existing code.

---

## 11. Summary

The proposed architecture transforms events from "fire-and-forget signals" to "structured, returnable data about what happened". This makes events:

- **Deterministic** - handler knows what was processed
- **Embedded** - tied to Result, not global log
- **Type-safe** - utilizes unused `EventRegistry.response` field
- **Audit-friendly** - complete trace in `result.events`

The main trade-off is the breaking change to `ctx.send()` return type, but a backward-compatible approach can be used during migration.

---

## 12. Appendix: Current File References

| File | Relevant Lines |
|------|---------------|
| `src/api/factory.ts` | 76-109 (`send()`, `emitPendingEvents`), 111-163 (`executeProcedure`) |
| `src/types.ts` | 90-96 (`PendingEvent`), 115-125 (`EventRegistry`) |
| `src/events/emitter.ts` | 90-92 (`getEventLog`), 115-130 (`isWildcardMatch`) |
| `src/events/dsl.ts` | 13-26 (`event()`), 52-60 (`eventNamespace()`) |
