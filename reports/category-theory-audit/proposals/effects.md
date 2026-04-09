# Effect Composition

## Principle

Error handling and context injection can be composed using layered transformers.

## Effect Stack

- `EitherT` - error handling
- `ReaderT` - context/dependency injection
- `StateT` - mutable state
- `ErrorT` - exception handling

Transformers compose, allowing complex effect stacks.

## Implementation

```typescript
type ProcedureM<R> = EitherT<ErrorT<ReaderT<Ctx, Promise>, R>>

const liftQuery = <A>(query: (ctx: Ctx) => Promise<A>): ProcedureM<A> =>
  ReaderT((ctx: Ctx) =>
    ErrorT(Promise.resolve(query(ctx)))
  )

const throwError = <E>(error: E): ProcedureM<never> =>
  EitherT.left(ErrorT.right(error))

const catchError = <A, E>(
  m: ProcedureM<A>,
  f: (e: E) => ProcedureM<A>
): ProcedureM<A> =>
  EitherT.right(ErrorT.throw(m, f))

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: (ctx, args) => pipe(
    liftQuery(() => ctx.db.users.find(args.id)),
    chain((user) =>
      user
        ? EitherT.right(user)
        : throwError({ type: 'NOT_FOUND', message: 'User not found' })
    ),
    chain((user) =>
      ctx.user
        ? EitherT.right(user)
        : throwError({ type: 'UNAUTHORIZED', message: 'Not logged in' })
    )
  )
})
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Composable errors** | Error handling composes across middleware |
| **Type-safe codes** | Error union types tracked by TypeScript |
| **Context injection** | Context passed through the stack |
