# Middleware Rule - "L'Oignon Robuste"

## Rule

**Protect `next()` - only ONE call allowed.**
**Context immutability - use Object.assign or spread.**
**Global try/catch to transform crashes into Result.err.**

## Why

Middleware is the "onion" layer around your logic:
- Multiple `next()` calls break execution order
- Mutable context causes race conditions
- Unhandled exceptions crash the entire system
- Without protection, a single bad middleware breaks everything

## Anti-Patterns (Forbidden)

```typescript
// WRONG - multiple next() calls
const middleware = (ctx, next) => {
  next(); // Called
  next(); // Called again - double execution!
};

// WRONG - mutable context
const authMiddleware = async (ctx, next) => {
  ctx.user = await getUser(ctx.request); // Mutation!
  await next();
  // ctx.user now leaks to other requests
};

// WRONG - no try/catch, raw exceptions
const middleware = async (ctx, next) => {
  await riskyOperation(); // Could throw!
  await next();
};

// WRONG - context reassignment (breaks reference)
const loggingMiddleware = async (ctx, next) => {
  ctx = { ...ctx, startTime: Date.now() }; // Reassign loses original!
  await next();
};
```

## Correct Patterns

### 1. Single `next()` Call (Protected)

```typescript
// GOOD - single next() call
const middleware = async (ctx, next) => {
  // Pre-processing
  const data = await loadData(ctx);
  ctx.data = data;

  // Single next() - execution continues to next middleware
  await next();

  // Post-processing (runs after inner middleware completes)
  ctx.response = transform(ctx.response);
};

// GOOD - conditional next()
const adminMiddleware = async (ctx, next) => {
  if (!ctx.user?.isAdmin) {
    ctx.status = 403;
    return; // No next() - short circuit
  }
  await next(); // Only called once
};
```

### 2. Context Immutability

```typescript
// GOOD - Object.assign creates new object
const createContext = (base: Context, additions: Partial<Context>): Context =>
  Object.assign({}, base, additions);

// GOOD - spread operator for new context
const withTimestamp = (ctx: Context): Context => ({
  ...ctx,
  timestamp: Date.now(),
});

// GOOD - middleware that adds to context
const enrichMiddleware = async (ctx: Context, next: () => Promise<void>) => {
  const enriched: Context = {
    ...ctx,
    requestId: generateId(),
    startTime: Date.now(),
    enrich: (data: Record<string, unknown>) => ({ ...ctx, ...data }),
  };

  // Pass enriched context (framework may pass via closure or parameter)
  Object.assign(ctx, enriched);
  await next();
};

// GOOD - context factory pattern
const createMiddlewareContext = (req: Request) => ({
  request: req,
  state: {} as Record<string, unknown>,
  errors: [] as Error[],
});
```

### 3. Global try/catch with Result

```typescript
// GOOD - middleware wrapper transforms exceptions
const withErrorHandling = (middleware: Middleware) =>
  async (ctx: Context, next: () => Promise<void>): Promise<Result> => {
    try {
      await middleware(ctx, next);
      return ok(ctx);
    } catch (error) {
      ctx.error = error;
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

// GOOD - multiple middleware with error handling
const middlewareStack = [
  withErrorHandling(authMiddleware),
  withErrorHandling(validationMiddleware),
  withErrorHandling(handlerMiddleware),
];

// GOOD - run all with error isolation
const runMiddlewareChain = async (
  middlewares: Middleware[],
  ctx: Context
): Promise<Result> => {
  let index = 0;

  const next = async (): Promise<void> => {
    if (index < middlewares.length) {
      const current = middlewares[index++];
      await current(ctx, next);
    }
  };

  try {
    await next();
    return ok(ctx);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
```

### 4. Middleware Composition Pattern

```typescript
// GOOD - composed middleware
const composeMiddleware = (...middlewares: Middleware[]): Middleware =>
  async (ctx, next) => {
    let index = 0;
    const run = async (): Promise<void> => {
      if (index < middlewares.length) {
        const current = middlewares[index++];
        await current(ctx, run);
      } else {
        await next();
      }
    };
    await run();
  };

// Usage
const app = composeMiddleware(
  loggingMiddleware,
  authMiddleware,
  validationMiddleware,
  handlerMiddleware,
);
```

## When `next()` IS Called Multiple Times

Never. If you need conditional execution, use early returns:

```typescript
// WRONG - calling next conditionally might be multiple
const buggy = async (ctx, next) => {
  if (ctx.skipAuth) await next(); // Could call next
  await next(); // Called again!
};

// CORRECT - single conditional path
const correct = async (ctx, next) => {
  if (!ctx.skipAuth) {
    await next();
  }
};
```

## Enforcement

- ESLint rule: detect multiple `next()` calls
- Code review: verify context is not mutated
- All middleware must be wrapped in try/catch at boundary
- Use `Object.assign` or spread for context additions

## Quick Reference

| Problem | Solution |
|---------|----------|
| Multiple `next()` | Single `next()` with early returns |
| Mutable context | `Object.assign({}, base, additions)` |
| Unhandled exceptions | Wrap middleware in try/catch |
| Context leaks | Context is created per-request |
