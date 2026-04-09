# Code Patterns

## Immediate: Composable Hooks

Current hooks are not composable. This pattern enables hook composition:

```typescript
type Hook<Ctx, Args, Output> = {
  beforeInvoke?: (ctx: Ctx, args: Args) => void | Promise<void>
  onSuccess?: (ctx: Ctx, args: Args, output: Output) => void | Promise<void>
  onError?: (ctx: Ctx, args: Args, error: unknown) => void | Promise<void>
}

const combineHooks =
  <Ctx, Args, Output>(...hooks: Hook<Ctx, Args, Output>[]): Hook<Ctx, Args, Output> => ({
    beforeInvoke: async (ctx, args) => {
      for (const hook of hooks) {
        if (hook.beforeInvoke) await hook.beforeInvoke(ctx, args)
      }
    },
    onSuccess: async (ctx, args, output) => {
      for (const hook of hooks) {
        if (hook.onSuccess) await hook.onSuccess(ctx, args, output)
      }
    },
    onError: async (ctx, args, error) => {
      for (const hook of hooks) {
        if (hook.onError) await hook.onError(ctx, args, error)
      }
    },
  })

const getUser = t.query({
  handler: async (ctx, args) => { ... }
}).withHooks(
  combineHooks(
    loggingHook,
    metricsHook,
    authHook
  )
)
```

---

## Immediate: Typed Error Codes

```typescript
type ErrorCodes = {
  NOT_FOUND: { code: 'NOT_FOUND'; message: string }
  UNAUTHORIZED: { code: 'UNAUTHORIZED'; message: string }
  VALIDATION: { code: 'VALIDATION'; message: string; field?: string }
}

type AppError = ErrorCodes[keyof ErrorCodes]

type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const err = <E extends AppError>(error: E): Result<never, E> => ({ ok: false, error })

const getUser = t.query({
  handler: async (ctx, args): Result<User, ErrorCodes['NOT_FOUND']> => {
    const user = await ctx.db.users.find(args.id)
    if (!user) return err({ code: 'NOT_FOUND', message: 'User not found' })
    return ok(user)
  }
})
```

---

## Short-term: Plugin Composition

```typescript
interface Plugin<Ctx, Extended> {
  name: string
  extend: (ctx: Ctx) => Extended
  map: <B>(f: (ext: Extended) => B) => Plugin<Ctx, B>
}

const mapPlugin = <Ctx, A, B>(
  p: Plugin<Ctx, A>,
  f: (a: A) => B
): Plugin<Ctx, B> => ({
  name: p.name,
  extend: (ctx) => f(p.extend(ctx)),
  map: (g) => pipe(p, mapPlugin(g), f)
})

const andThen = <Ctx, A, B>(
  p1: Plugin<Ctx, A>,
  p2: Plugin<A, B>
): Plugin<Ctx, B> => ({
  name: `${p1.name} > ${p2.name}`,
  extend: (ctx) => p2.extend(p1.extend(ctx)),
  map: (f) => pipe(p1, andThen(p2), mapPlugin(f)),
})
```
