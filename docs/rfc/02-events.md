# RFC 02: Events System

## Summary

DRPC includes an event system that allows procedures to emit events during execution. Events are batched until the procedure succeeds, then flushed. This provides a clean way to react to procedure outcomes without coupling business logic to external systems.

---

## Overview

### What Are Events?

Events are named signals that procedures can emit during their execution. They carry payload data and are delivered to subscribers after the procedure completes successfully.

**Key features:**
- **Fully typed** — event names and payloads are type-checked (autocomplete available)
- **Namespaced** — events grouped by domain (`user.created`, `post.published`)
- **Batched** — events queued until procedure succeeds
- **Wildcard subscriptions** — subscribe to patterns like `user.*` or `*`

```typescript
import { initDRPC, createAPI, defineEvents, event, ok } from '@deessejs/server';

const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    deleted: event({ args: z.object({ id: z.string() }) }),
  },
  post: {
    published: event({ args: z.object({ id: z.string(), title: z.string() }) }),
  },
});

const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();

// TypeScript autocomplete: 'user.', 'post.' ← suggests valid events
ctx.send('user.created', { id: 'new-user', email: 'test@example.com' });

// TypeScript autocomplete for subscriptions too
t.on('user.');  // ← suggests 'created', 'deleted'
```

---

## How It Works

### 1. Define Events Registry

Use `defineEvents()` to declare the events your application emits:

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    updated: event({ args: z.object({ id: z.string(), name: z.string() }) }),
    deleted: event({ args: z.object({ id: z.string() }) }),
  },
  post: {
    published: event({ args: z.object({ id: z.string(), title: z.string() }) }),
    archived: event({ args: z.object({ id: z.string(), reason: z.string() }) }),
  },
});
```

**Structure:** Events are organized in namespaces (e.g., `user`, `post`) to group related events.

**`event()` config:**
```typescript
interface EventConfig<TArgs> {
  args: ZodType<TArgs>;  // Schema for the event payload
}
```

### 2. Register with Builder

Connect events to the builder via `.withEvents()`:

```typescript
const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();
```

### 3. Emit Events in Procedures

Use `ctx.send()` to emit events from within a procedure handler:

```typescript
const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = { id: 'new-user', email: args.email };

    // Emit event with payload
    ctx.send('user.created', { id: user.id, email: user.email });

    return ok(user);
  },
});
```

**`ctx.send()` signature:**
```typescript
ctx.send(eventName: string, payload: unknown): void
```

The event name uses dot notation: `'namespace.eventName'` (e.g., `'user.created'`).

### 4. Subscribe to Events

Subscribe to events via `t.on()`:

```typescript
const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();

// Subscribe using t.on()
t.on('user.created', (payload) => {
  console.log('[EVENT] User created:', payload.data);
});

// Wildcard subscriptions
t.on('user.*', (payload) => {
  console.log('Any user event:', payload.name);
});

t.on('*', (payload) => {
  console.log('Global event:', payload.name);
});
```

` t.on()` is available on the `DRPCRoot` instance (`d`) after calling `.withEvents(events)`. It returns an unsubscribe function.

**Signature:**
```typescript
t.on(event: string, handler: EventHandler): () => void
```

**EventHandler:**
```typescript
type EventHandler = (payload: EventPayload) => void | Promise<void>;

interface EventPayload {
  name: string;       // 'user.created'
  data: unknown;      // { id: '1', email: '...' }
  timestamp: number;  // Date.now()
}
```

---

## Wildcard Subscriptions

DRPC supports wildcard patterns for subscribing to multiple events at once. The `*` character matches any string within a specific position.

### Pattern Types

| Pattern | Matches | Does NOT Match |
|---------|---------|----------------|
| `user.*` | `user.created`, `user.updated`, `user.deleted` | `post.created`, `*` |
| `*.created` | `user.created`, `post.created`, `order.created` | `user.*`, `*` |
| `*` | Everything | Nothing |

### How Wildcards Work

The event name is split by `.` (dot). A wildcard `*` matches any segment:

```
Event name: "user.created"  →  Segments: ["user", "created"]

Pattern "user.*" matches because:
  - "user" == "user" ✓
  - "*" matches "created" ✓

Pattern "*.created" matches because:
  - "*" matches "user" ✓
  - "created" == "created" ✓
```

### Examples

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string() }) }),
    updated: event({ args: z.object({ id: z.string(), name: z.string() }) }),
    deleted: event({ args: z.object({ id: z.string() }) }),
  },
  post: {
    created: event({ args: z.object({ id: z.string(), title: z.string() }) }),
    published: event({ args: z.object({ id: z.string() }) }),
    archived: event({ args: z.object({ id: z.string() }) }),
  },
});
```

**Subscribe to all user events:**

```typescript
t.on('user.*', (payload) => {
  console.log('User event:', payload.name);
});
// Matches: user.created, user.updated, user.deleted
// Does not match: post.created, post.published
```

**Subscribe to all created events (any namespace):**

```typescript
t.on('*.created', (payload) => {
  console.log('Something created:', payload.name, payload.data);
});
// Matches: user.created, post.created, order.created
// Does not match: user.updated, post.archived
```

**Subscribe to absolutely everything:**

```typescript
t.on('*', (payload) => {
  console.log('[EVENT]', payload.name, payload.data);
});
// Matches: ALL events
```

### Multiple Wildcards in One Pattern

Multiple wildcards can be used, but each `*` only matches a single segment:

```typescript
t.on('user.*.logged', (payload) => { ... });
// Would match: user.session.logged, user.action.logged
// But our events use 2-segment names, so this won't match anything
// in the example above (user.created has no 'logged' segment)
```

### Handler Priority

When multiple handlers match the same event, they are all called:

```typescript
t.on('user.created', handler1);  // Specific handler
t.on('user.*', handler2);        // Wildcard handler
t.on('*', handler3);            // Global handler

// When 'user.created' is emitted:
// handler1, handler2, and handler3 are ALL called
```

The order of execution follows the order handlers were registered.

### Unsubscribing from Wildcards

`t.on()` returns an unsubscribe function specific to that handler:

```typescript
const unsubscribe = t.on('user.*', (payload) => {
  console.log('User event:', payload.name);
});

// Later, to stop listening:
unsubscribe();
```

The unsubscribe function only removes that specific handler, not other handlers matching the same pattern.

### Practical Use Cases

**Audit logging for all user events:**

```typescript
t.on('user.*', (payload) => {
  logger.info('User event', { event: payload.name, data: payload.data, timestamp: payload.timestamp });
});
```

**Real-time notifications for all events:**

```typescript
t.on('*', (payload) => {
  notificationService.emit({
    type: 'event',
    name: payload.name,
    data: payload.data,
  });
});
```

**Monitoring specific namespaces:**

```typescript
t.on('post.*', (payload) => {
  metrics.increment('post.events', { event: payload.name });
});
```

---

## Event Batching

Events are **batched** until the procedure succeeds. If a procedure throws an error, all events emitted during that procedure are discarded.

```typescript
const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    ctx.send('user.creating', { email: args.email });

    if (args.email === 'blocked@example.com') {
      throw new Error('Blocked email');  // Events discarded!
    }

    const user = { id: 'new-user', email: args.email };
    ctx.send('user.created', { id: user.id, email: user.email });

    return ok(user);
  },
});
```

**Flow:**
1. Procedure starts
2. `ctx.send()` adds events to a queue
3. If procedure succeeds → events flushed to subscribers
4. If procedure throws → events discarded, error propagated

This ensures subscribers only receive events for successful operations.

---

## Usage Examples

### Basic Event Subscription

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
  },
});

const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();

const createUser = d.mutation({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = { id: 'new-user', email: args.email };
    ctx.send('user.created', { id: user.id, email: user.email });
    return ok(user);
  },
});

const router = d.router({ users: { create: createUser } });
const api = createAPI({ router });

// Subscribe using t.on()
t.on('user.created', (payload) => { ... });

// Wildcard subscriptions
t.on('user.*', (payload) => { ... });

t.on('*', (payload) => { ... });
```

### Multiple Events from One Procedure

```typescript
const events = defineEvents({
  post: {
    published: event({ args: z.object({ id: z.string(), title: z.string() }) }),
    archived: event({ args: z.object({ id: z.string(), reason: z.string() }) }),
  },
});

const archivePost = d.mutation({
  args: z.object({ id: z.string(), reason: z.string() }),
  handler: async (ctx, args) => {
    const post = await ctx.db.archivePost(args.id);

    // Emit multiple events
    ctx.send('post.archived', { id: post.id, reason: args.reason });

    return ok(post);
  },
});
```

### Wildcard for Logging

```typescript
// Log all events to console using wildcard
t.on('*', (payload) => {
  console.log(`[${new Date(payload.timestamp).toISOString()}] ${payload.name}:`, payload.data);
});
```

---

## EventHandler Type

When subscribing, your handler receives `EventHandler`:

```typescript
type EventHandler = (payload: EventPayload) => void | Promise<void>;
```

```typescript
interface EventPayload {
  name: string;       // 'user.created'
  data: unknown;      // { id: '1', email: '...' }
  timestamp: number;  // Date.now()
}
```

---

## API Reference

### defineEvents()

```typescript
function defineEvents<T extends EventDefinitions>(
  definitions: T
): T;
```

Creates a typed event registry from an object structure.

### event()

```typescript
function event<TArgs>(config: { args: ZodType<TArgs> }): EventDefinition<TArgs>;

interface EventDefinition<TArgs> {
  args: ZodType<TArgs>;
  __brand: unique symbol;  // For type discrimination
}
```

### EventRegistry

```typescript
interface EventRegistry {
  [namespace: string]: {
    [eventName: string]: EventDefinition<unknown>;
  };
}
```

### Subscription API

Subscriptions are made via `t.on()` on the DRPCRoot instance:

```typescript
const d = initDRPC
  .context({ userId: '1' })
  .withEvents(events)
  .create();

// Subscribe - returns unsubscribe function
const unsubscribe = t.on('user.created', (payload) => {
  console.log('User created:', payload.data);
});

// Later: call unsubscribe to remove the handler
unsubscribe();
```

**Available methods:**

```typescript
interface EventSubscription {
  // Subscribe to an event - returns unsubscribe function
  on(event: string, handler: EventHandler): () => void;

  // Subscribe once (auto-unsubscribes after first event)
  once(event: string, handler: EventHandler): void;

  // Get all logged events
  getEventLog(): EventPayload[];
}
```

**EventPayload:**

```typescript
interface EventPayload {
  name: string;       // 'user.created'
  data: unknown;      // { id: '1', email: '...' }
  timestamp: number;  // Date.now()
}
```

---

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Procedure Handler                                       │
│                                                         │
│  ctx.send('user.created', { id: '1', email: '...' })  │
│      │                                                 │
│      ▼                                                 │
│  ┌─────────────┐                                        │
│  │ Event Queue │  (batched until success)               │
│  └─────────────┘                                        │
│      │                                                 │
│      │ success?                                         │
│      │    │                                             │
│      ▼    ▼                                             │
│   ┌────┐  ┌──────┐                                       │
│   │DROP│  │FLUSH │  Events sent to subscribers          │
│   └────┘  └──────┘                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### Batching Mechanism

Events are stored in a per-procedure queue. Only when the procedure completes successfully are they released to the global event queue for delivery.

This prevents partial state — if a procedure fails midway, any events it emitted are rolled back.

### Event Delivery Timing

Events are delivered synchronously after the procedure succeeds but before the response is returned. This means:

```typescript
const result = await api.users.create({ email: 'test@example.com' });
// Events already delivered to subscribers at this point
```

### Type Safety

DRPC provides full type safety for events. Event names and their payloads are typed based on the event definitions.

**Event names autocomplete:**

```typescript
const events = defineEvents({
  user: {
    created: event({ args: z.object({ id: z.string(), email: z.string() }) }),
    updated: event({ args: z.object({ id: z.string(), name: z.string() }) }),
    deleted: event({ args: z.object({ id: z.string() }) }),
  },
});

// TypeScript knows all valid event names in the 'user' namespace
ctx.send('user.');  // ← autocomplete suggests: 'created', 'updated', 'deleted'
```

**Payload type inference:**

```typescript
// TypeScript knows the exact shape of the payload for each event
ctx.send('user.created', { id: '1', email: 'test@example.com' });  // ✓ Valid
ctx.send('user.created', { id: 1, email: 'test@example.com' });    // ✗ Type error: id must be string
ctx.send('user.created', { name: 'Alice' });                         // ✗ Type error: missing 'id' and 'email'
```

**Wildcard type safety:**

```typescript
// Even wildcards are type-checked - but more permissive since they match multiple events
t.on('user.*', (payload) => {
  // payload.name is typed as 'user.created' | 'user.updated' | 'user.deleted'
  // payload.data is typed as the union of all matching event payloads
});
```

**Subscription type inference:**

```typescript
// t.on() also provides type-safe event names
t.on('user.');  // ← autocomplete suggests valid events
t.on('user.nonexistent');  // ✗ Type error
t.on('post.*');  // ← autocomplete suggests 'post.created', 'post.published', etc.
```

---

## Status

**Draft** — Design for events system as described in RFC 01. Implementation pending.
