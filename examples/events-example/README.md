# Events Example - @deessejs/server

A comprehensive example demonstrating the event system features of `@deessejs/server`.

## Overview

The event system enables decoupled, cross-cutting concerns in your application. Events are emitted from mutations and handled by global listeners, allowing you to separate business logic from side effects like audit logging, analytics, and notifications.

## Features Demonstrated

1. **Event Registry Definition** - Using `defineEvents()` to define typed events
2. **`ctx.send()`** - Emitting events from mutation handlers
3. **`t.on()`** - Global event listeners for cross-cutting concerns
4. **Transaction Integrity** - Events only emitted on success
5. **Wildcard Patterns** - Using `user.*` to listen to multiple events
6. **Unsubscribe** - Cleaning up event listeners

## Project Structure

```
examples/events-example/
├── src/
│   ├── server/
│   │   ├── context.ts      # defineContext with events and global listeners
│   │   ├── events.ts       # defineEvents registry
│   │   ├── index.ts        # Main entry point and demo
│   │   └── routers/
│   │       ├── index.ts    # Main router combining all sub-routers
│   │       └── users.ts   # User CRUD with event emission
│   └── client/
│       └── index.ts       # Client setup
├── tests/
│   └── events.test.ts      # Tests for event system
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
pnpm install
```

## Running the Example

```bash
# Run the demo
pnpm start

# Run in watch mode
pnpm dev
```

## Running Tests

```bash
pnpm test
```

## Event Registry

Events are defined using `defineEvents()` which provides full type safety:

```typescript
// src/server/events.ts
import { defineEvents } from "@deessejs/server";

export const events = defineEvents({
  user: {
    created: {
      data: { id: number; email: string; name: string },
    },
    updated: {
      data: { id: number; changes: Record<string, unknown> },
    },
    deleted: {
      data: { id: number },
    },
  },
  email: {
    sent: {
      data: { to: string; template: string; subject: string },
    },
  },
});
```

## Context with Events

The context is created with the events registry, enabling `ctx.send()` and `t.on()`:

```typescript
// src/server/context.ts
import { defineContext } from "@deessejs/server";
import { events } from "./events";

const { t, createAPI } = defineContext({
  context: {
    db: { users: [], auditLogs: [], emails: [] },
    logger: console,
  },
  events, // Enables type-safe events
});
```

## Global Event Listeners

Use `t.on()` to register global listeners for cross-cutting concerns:

```typescript
// Audit logging
t.on(events.user.created, async (ctx, payload) => {
  ctx.db.auditLogs.push({
    action: "USER_CREATED",
    entityId: payload.data.id,
  });
});

// Listen to all user events with wildcard
t.on("user.*", (ctx, payload) => {
  ctx.logger.info(`User event: ${payload.name}`);
});
```

## Emitting Events

Use `ctx.send()` in mutation handlers to emit events:

```typescript
// src/server/routers/users.ts
const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args);

    // Emit event on success
    ctx.send(events.user.created, {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return ok(user);
  },
});
```

## Transaction Integrity

Events are only emitted if the mutation succeeds. If a mutation fails or throws an error, pending events are discarded:

```typescript
const riskyMutation = t.mutation({
  handler: async (ctx, args) => {
    ctx.send(events.user.created, { id: 1, email: "test@test.com", name: "Test" });
    return err("FAIL" as any, "Something went wrong");
    // Events above will NOT be emitted
  },
});
```

## Wildcard Patterns

Listen to multiple related events with wildcard patterns:

| Pattern | Matches |
|---------|---------|
| `user.*` | `user.created`, `user.updated`, `user.deleted` |
| `*` | All events |

```typescript
// Listen to all user events
t.on("user.*", (ctx, payload) => {
  // Handles user.created, user.updated, user.deleted
});

// Listen to all events
t.on("*", (ctx, payload) => {
  // Handles any event
});
```

## Unsubscribe

`t.on()` returns an unsubscribe function:

```typescript
const unsubscribe = t.on(events.user.created, (ctx, payload) => {
  // Handle event
});

// Later, when done listening:
unsubscribe();
```

## Event Payload Structure

```typescript
interface EventPayload<T = unknown> {
  name: string;      // Event name (e.g., "user.created")
  data: T;          // Event data (typed per event definition)
  timestamp: string; // ISO timestamp
  namespace: string; // Usually "default"
}
```

## Event Flow

1. Client calls a mutation (e.g., `users.create`)
2. Mutation handler executes business logic
3. If successful, `ctx.send()` adds event to pending queue
4. Mutation returns `ok(result)`
5. After successful return, pending events are emitted to all listeners
6. If mutation fails or throws, pending events are discarded

## use Cases

### Audit Logging

```typescript
t.on(events.user.created, async (ctx, payload) => {
  await ctx.db.auditLogs.create({
    action: "USER_CREATED",
    userId: payload.data.id,
  });
});
```

### Email Notifications

```typescript
t.on(events.user.created, async (ctx, payload) => {
  await ctx.emailService.send({
    to: payload.data.email,
    template: "welcome",
  });
});
```

### Analytics

```typescript
t.on("*", (ctx, payload) => {
  ctx.analytics.track(payload.name, payload.data);
});
```

### Cache Invalidation

```typescript
t.on(events.user.updated, async (ctx, payload) => {
  await ctx.cache.invalidate(`user:${payload.data.id}`);
});
```

## API Reference

### defineEvents()

```typescript
function defineEvents<Events extends EventRegistry>(events: Events): Events
```

Creates a type-safe event registry from an event definition object.

### ctx.send()

```typescript
ctx.send(event, data)
ctx.send(event, data, { namespace: "custom" })
```

Emits an event from within a mutation handler. The event is only emitted if the mutation succeeds.

### t.on()

```typescript
const unsubscribe = t.on(event, handler)
```

Registers a global event listener. Returns an unsubscribe function.

## Testing

The test file (`tests/events.test.ts`) provides comprehensive coverage of all event system features:

```bash
pnpm test
```

Key test categories:
- `defineEvents` - Event registry creation and type safety
- `ctx.send()` - Event emission and payload structure
- `t.on()` - Global listener registration and handling
- `Wildcard Patterns` - Pattern matching for event listeners
- `Transaction Integrity` - Events only emitted on success
- `Edge Cases` - Empty updates, rapid mutations, etc.
