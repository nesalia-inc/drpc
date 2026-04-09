# Extensible Interpreters

## Principle

Procedures can be defined independently of how they are executed. This allows the same procedure definitions to work with multiple execution backends.

## Implementation

```typescript
// Define procedures as a structured type
type ProcedureF<A> =
  | { type: 'query'; name: string; handler: Handler; args?: Schema }
  | { type: 'mutation'; name: string; handler: Handler; args?: Schema }
  | { type: 'internalQuery'; name: string; handler: Handler }
  | { type: 'internalMutation'; name: string; handler: Handler }

// Procedure wrapper
type Procedure<A> = Free<ProcedureF, A>

// Smart constructors
const query = <N extends string, A, R>(
  name: N,
  config: { args?: Schema<A>; handler: (ctx: Ctx, args: A) => Promise<R> }
): Procedure<{ name: N; args: A; result: R }> =>
  inj({ type: 'query', name, ...config })

const mutation = <N extends string, A, R>(
  name: N,
  config: { args?: Schema<A>; handler: (ctx: Ctx, args: A) => Promise<R> }
): Procedure<{ name: N; args: A; result: R }> =>
  inj({ type: 'mutation', name, ...config })

// Interpreter interface
type InterpreterM<M> = <A>(fa: ProcedureF<A>) => HKT<M, A>

// HTTP interpreter
const httpInterpreter: InterpreterM<HttpM> = (fa) => {
  switch (fa.type) {
    case 'query':
      return fa as any
    // ...
  }
}

// Test interpreter (local execution)
const localInterpreter: InterpreterM<Task> = (fa) => {
  switch (fa.type) {
    case 'query':
      return fa.handler(ctx, fa.args)
    // ...
  }
}
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Multiple backends** | Same procedures work for HTTP, WebSocket, batch, test |
| **Optimization** | Procedures can be optimized before execution |
| **Route verification** | Structure catches missing routes at compile time |
| **Testability** | Mock interpreters for testing |

## Composable Middleware

Middleware wraps interpretation:

```typescript
const withLogging = <M>(interp: InterpreterM<M>): InterpreterM<M> =>
  (fa) => {
    console.log(`Executing: ${fa.name}`)
    const result = interp(fa)
    console.log(`Completed: ${fa.name}`)
    return result
  }

const withAuth = <M>(interp: InterpreterM<M>): InterpreterM<M> =>
  (fa) => {
    if (requiresAuth(fa)) {
      if (!ctx.userId) throw new UnauthorizedError()
    }
    return interp(fa)
  }
```
