# Issue 30: Auto-Trigger Procedures from Events (Event-Driven Automation)

## Motivation

The event system currently supports emitting events via `ctx.send()`, but there's no way to automatically trigger procedures when events are emitted. This is a common pattern in event-driven architectures.

## Use Cases

1. **Event-driven mutations:** When a "user.created" event is emitted, automatically send a welcome email via a procedure
2. **Reactive data synchronization:** When an "order.updated" event is emitted, trigger a procedure to update related services
3. **Audit logging:** When sensitive procedures execute, automatically emit and process audit events

## Proposed Design

### Trigger Registration

```typescript
defineContext({
  events: {
    "user.created": { data: { id: string; email: string } },
  },
  triggers: [
    {
      event: "user.created",
      procedure: "notifications.sendWelcome",
      args: (event) => ({ userId: event.data.id }),
    },
  ],
});
```

### Trigger Execution

Triggers should:

1. Be executed **after** the main procedure succeeds (post-commit)
2. Run in parallel using `Promise.allSettled()` (isolated failures)
3. Have access to the original procedure context (user, request, etc.)
4. Support async procedures without blocking the response

### Key Behaviors

| Aspect | Behavior |
|--------|----------|
| Timing | Post-procedure execution (after queue flush) |
| Error handling | Isolated - one trigger failure doesn't block others |
| Context | Inherits original request context (user, etc.) |
| Async | Supports async procedures without blocking response |

## Implementation Requirements

1. **Trigger registry** in `DefineContextConfig`
2. **Trigger execution** in `executeProcedureWithHooks` after successful handler
3. **Per-request isolation** - triggers should not share state across requests
4. **Error logging** - failures should be logged but not propagate

## Technical Notes

### Location

- Types: `packages/server/src/context/types.ts`
- Execution: `packages/server/src/api/factory/procedure.ts` (executeProcedureWithHooks)
- Registration: `packages/server/src/context/builder.ts`

### Trigger Context

```typescript
interface TriggerContext<Ctx> {
  originalCtx: Ctx;           // Request context
  event: EventPayload;         // The event that triggered
  procedure: Procedure;        // Procedure to execute
  args: (event: EventPayload) => unknown; // Args mapper
}
```

### Execution Flow

```
executeProcedure
  └── executeProcedureWithHooks
        └── if (result.ok)
              └── queue.flush(emitter)
                    └── For each trigger in registry
                          └── Promise.allSettled([
                               trigger.procedure(handlerCtx, trigger.args(event))
                             ])
```

## References

- docs/rules/event-rule.md (flush after success, clear on error)
- docs/rules/lifecycle-rule.md (plugins at creation, middlewares at execution)
- docs/reports/event-system-issues-25-29.md (event system review)

## Priority

**Medium** - nice to have for event-driven workflows

## Status

Not yet implemented
