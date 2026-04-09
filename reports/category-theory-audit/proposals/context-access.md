# Type-safe Context Access

## Principle

Nested context properties can be accessed and updated in a type-safe way without string paths.

## Interface

```typescript
type Lens<S, A> = {
  get: (s: S) => A
  set: (s: S, a: A) => S
}
```

## Implementation

```typescript
import { Lens, lens, compose } from 'optics-ts'

interface Ctx {
  db: Database
  user: {
    session: {
      id: string
      permissions: string[]
    }
  }
  logger: Logger
}

const ctxLens = lens<Ctx>()

const sessionId = compose(
  ctxLens.focusAt('user'),
  focusAt('session'),
  focusAt('id')
)

const getSessionId = (ctx: Ctx): string => sessionId.get(ctx)
const setSessionId = (ctx: Ctx, id: string): Ctx => sessionId.set(ctx, id)

const getUser = t.query({
  handler: async (ctx, args) => {
    const sessionId = pipe(ctx, sessionId.get)
    const permissions = pipe(
      ctx,
      compose(
        ctxLens.focusAt('user'),
        focusAt('session'),
        focusAt('permissions')
      ).get
    )

    const newCtx = pipe(ctx, sessionId.set('new-session-id'))
    return { sessionId, permissions }
  }
})
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Type safety** | No string paths like `'user.session.id'` that could typo |
| **Composability** | Accessors compose naturally |
| **Immutability** | Updates return new context, no mutation |
| **Partial access** | For optional nested properties |

## Context Validation

```typescript
const requiredCtx: Lens<Partial<Ctx>, Ctx> = {
  get: (s) => {
    const errors: string[] = []
    if (!s.db) errors.push('db required')
    if (!s.user) errors.push('user required')
    if (errors.length > 0) throw new ContextError(errors)
    return s as Ctx
  },
  set: (s, a) => a,
}

const requireContext = (ctx: Partial<Ctx>): Ctx =>
  requiredCtx.get(ctx)
```
