# Query Memoization

## Principle

Query results can be automatically cached based on context dependencies, with automatic invalidation when context changes.

## Store Interface

```typescript
type Store<S, A> = (getState: (s: S) => A) & { state: S }
```

## Implementation

```typescript
interface QueryEnv {
  db: Database
  cache: Cache
  logger: Logger
  requestId: string
}

type QueryContext<A> = Store<QueryEnv, A>

const queryContext = (env: QueryEnv): QueryContext<A> => ({
  get: (f) => f(env),
  state: env,
})

const extract = <A>(qc: QueryContext<A>): A => qc.state as unknown as A

const extendQuery = <A, B>(
  qc: QueryContext<A>,
  f: (qc: QueryContext<A>) => B
): QueryContext<B> => ({
  get: (g) => g({ ...qc, state: f(qc) }),
  state: { ...qc.state },
})

const memoizedQuery = <A>(
  key: string,
  query: (ctx: QueryContext<A>) => Promise<A>
): (ctx: QueryContext<unknown>) => Promise<A> => {
  const cache = new Map<string, A>()

  return (ctx) => {
    if (cache.has(key)) {
      return Promise.resolve(cache.get(key)!)
    }
    return query(ctx).then(result => {
      cache.set(key, result)
      return result
    })
  }
}

const getUser = t.query({
  handler: async (ctx, args) => {
    const users = await memoizedQuery(
      `users:${args.id}`,
      (ctx) => ctx.get(c => c.db.users.find(args.id))
    )(ctx)
    return users
  }
})
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Automatic caching** | Query results cached based on context |
| **Dependency tracking** | Know which queries need recomputation |
| **Change propagation** | Updates propagate to affected queries |

## Automatic Invalidation

```typescript
const logout = (ctx: QueryContext<UserSession>): QueryContext<UserSession> =>
  pipe(ctx, extend((c) => ({ ...c.state, user: null })))

// All queries that depend on user.session are automatically invalidated
```
