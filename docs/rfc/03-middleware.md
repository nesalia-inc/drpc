# RFC 03: Middleware

## Summary

DRPC middleware allows you to intercept procedure calls and execute code before, during, and after the procedure execution. Middleware forms a chain where each middleware can decide whether to allow the call to proceed to the next middleware or to short-circuit with an error.

---

## Overview

### What Is Middleware?

Middleware is a function that intercepts procedure calls. It receives the call context (ctx, meta, procedure type, path) and a `next()` function to continue the chain.

```typescript
const authMiddleware = d.middleware({
  handler: (opts) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return extra.next();
});
```

Middleware can:
- **Allow** the call to proceed via `extra.next()`
- **Reject** the call by throwing an error
- **Modify** the context via `extra.next({ ctx: { ... } })`
- **Inspect** meta to make decisions

---

## How It Works

### Creating Middleware

Use `d.middleware()` on the DRPCRoot instance, with syntax similar to query/mutation:

```typescript
const authMiddleware = d.middleware({
  handler: (ctx, args, extra) => {
    const { type, path, meta, next } = extra;

    // Check if procedure requires auth
    if (meta?.authRequired && !ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    // Continue to next middleware or procedure
    return next();
  },
});
```

With args:

```typescript
const requireRoleMiddleware = d.middleware({
  args: z.object({
    role: z.string(),
  }),
  handler: (ctx, args, extra) => {
    const { next } = extra;

    if (ctx.role !== args.role) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next();
  },
});
```

**Middleware signature:**

```typescript
type Middleware<TCtx, TMeta> = (
  ctx: TCtx,
  args: unknown,
  extra: {
    type: ProcedureType;
    path: string;
    meta: TMeta | undefined;
    next: (opts?: { ctx?: Partial<TCtx> }) => Promise<MiddlewareResult>;
  }
) => Promise<MiddlewareResult>;
```

**`path` in middleware:**

The `path` is a dot-separated string that identifies the procedure being called:

```typescript
const router = d.router({
  users: {
    list: d.query({ handler: async () => ok([]) }),
    byId: d.query({ handler: async (ctx, args) => ok({}) }),
  },
});

// When calling api.users.list:
//   path = 'users.list'

// When calling api.users.byId:
//   path = 'users.byId'
```

Middleware can use `path` to make decisions based on which procedure is being called:

```typescript
const loggingMiddleware = d.middleware({
  handler: (ctx, args, extra) => {
    console.log(`[${extra.type}] ${extra.path} called`);
    return extra.next();
  },
});
```

### MiddlewareResult

Each middleware must return a `MiddlewareResult`:

```typescript
type MiddlewareResult =
  | { ok: true; data: unknown; marker: MiddlewareMarker }
  | { ok: false; error: TRPCError; marker: MiddlewareMarker };
```

Most middleware return `extra.next()` which produces `{ ok: true, data: <result> }`.

### The `next()` Function

`next()` passes control to the next middleware in the chain. It can optionally receive a `ctx` override:

```typescript
// Normal: just continue
return next();

// With context override: enrich the context for downstream middleware/procedures
return next({
  ctx: {
    ...ctx,
    userId: 'authenticated-user-id',
    roles: ['admin'],
  },
});
```

### Middleware Chain Execution

Middleware executes in the order it's applied. Each middleware decides whether to call `next()`:

```
Request
  │
  ▼
┌─────────────┐
│ Middleware1 │ ──next()──▶
│ (checks X)  │
└─────────────┘
  │                    │
  │ ✗ (throws error)   │ ✓ (calls next)
  ▼                    ▼
[Error Response]    ┌─────────────┐
                   │ Middleware2 │ ──next()──▶
                   │ (checks Y)  │
                   └─────────────┘
                     │                    │
                     │ ✗ (throws error)   │ ✓ (calls next)
                     ▼                    ▼
                 [Error Response]     ┌─────────────────┐
                                       │   Procedure    │
                                       │   Handler     │
                                       └─────────────────┘
                                             │
                                             ▼
                                       [Result]
```

---

## Attaching Middleware to Procedures

### Using `.use()` on a Procedure

After creating middleware, attach it to procedures using `.use()`:

```typescript
const router = d.router({
  // Procedure with auth middleware
  adminPanel: d.query({
    meta: { authRequired: true },
    handler: async (ctx) => { ... },
  }).use(authMiddleware),

  // Procedure without middleware
  publicData: d.query({
    handler: async () => ok('public'),
  }),
});
```

### Chaining Multiple Middleware

Multiple middleware can be chained on a single procedure:

```typescript
const router = d.router({
  restrictedData: d.query({
    meta: { role: 'admin' },
    handler: async (ctx) => ok('secret data'),
  })
    .use(authMiddleware)    // First: check if authenticated
    .use(roleMiddleware),    // Second: check if authorized
});
```

Middleware executes in order — `authMiddleware` first, then `roleMiddleware`.

---

## Built-in Middleware Helpers

### Creating Reusable Middleware

DRPC doesn't have built-in auth middleware, but you can create reusable middleware factories:

```typescript
// Factory function that creates auth middleware
const requireAuth = (config?: { roles?: string[] }) => {
  return d.middleware({
    handler: (ctx, args, extra) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Must be logged in' });
      }

      if (config?.roles && !config.roles.includes(ctx.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      return extra.next();
    },
  });
};

// Usage
const router = d.router({
  adminPanel: d.query({
    handler: async (ctx) => ok('admin area'),
  }).use(requireAuth({ roles: ['admin'] })),

  userProfile: d.query({
    handler: async (ctx) => ok({ user: ctx.userId }),
  }).use(requireAuth()),
});
```

---

## Middleware vs Hooks

DRPC has two interception mechanisms: **middleware** and **hooks**. They serve different purposes.

| Aspect | Middleware | Hooks |
|--------|-----------|-------|
| **Execution** | Before procedure (can short-circuit) | During procedure lifecycle |
| **Use case** | Auth, authorization, validation | Logging, metrics, caching |
| **Can reject** | Yes, throws error | No, just side effects |
| **Attached via** | `.use()` on procedure | `hooks` property on config |
| **Execution order** | Before procedure, in chain | Specific lifecycle points |

**When to use middleware:**
- Authentication / authorization
- Input validation
- Rate limiting
- Any decision that might reject the request

**When to use hooks:**
- Logging after successful/failed execution
- Metrics collection
- Cache management
- Audit trails

---

## Error Handling in Middleware

Middleware that throws an error short-circuits the chain. The error propagates to the caller.

```typescript
const authMiddleware = d.middleware({
  handler: (ctx, args, extra) => {
    const token = ctx.token;

    if (!token || !isValidToken(token)) {
      // Short-circuit: error returned to caller
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing token',
      });
    }

    // Continue chain
    return extra.next();
  },
});
```

**Error propagation flow:**

```
Middleware1 ──throws──▶ [Error sent to caller]
Middleware2              (never executed)
Procedure
```

**All middleware in the chain before the error point are executed.** Middleware after the error point never run.

---

## Usage Examples

### Basic Auth Middleware

```typescript
const d = initDRPC
  .context<{ userId: string | null; token: string | null }>({ userId: null, token: null })
  .meta<{ authRequired?: boolean }>()
  .create();

const authMiddleware = d.middleware({
  handler: (ctx, args, extra) => {
    if (extra.meta?.authRequired && !ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return extra.next();
  },
});

const router = d.router({
  publicList: d.query({
    handler: async () => ok(['item1', 'item2']),
  }),

  privateList: d.query({
    meta: { authRequired: true },
    handler: async (ctx) => {
      const data = await db.getPrivateList(ctx.userId);
      return ok(data);
    },
  }).use(authMiddleware),
});
```

### Context Enrichment Middleware

Middleware can enrich context for downstream use:

```typescript
const enrichContext = d.middleware({
  handler: (ctx, args, extra) => {
    return extra.next({
      ctx: {
        ...ctx,
        requestId: generateRequestId(),
        startedAt: Date.now(),
        logger: createLogger(extra.path),
      },
    });
  },
});

const router = d.router({
  userData: d.query({
    handler: async (ctx) => {
      // ctx.requestId, ctx.startedAt, ctx.logger are available here
      ctx.logger.info('Fetching user data');
      return ok({ id: ctx.userId });
    },
  }).use(enrichContext),
});
```

### Rate Limiting Middleware

```typescript
const rateLimiter = (limit: number, windowMs: number) => {
  const requests = new Map<string, number[]>();

  return d.middleware({
    handler: (ctx, args, extra) => {
      const key = ctx.userId ?? ctx.ip ?? 'anonymous';
      const now = Date.now();
      const window = requests.get(key) ?? [];

      // Filter old requests
      const recent = window.filter(t => t > now - windowMs);
      recent.push(now);
      requests.set(key, recent);

      if (recent.length > limit) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Max ${limit} per ${windowMs}ms`,
        });
      }

      return extra.next();
    },
  });
};

// Usage
const router = d.router({
  search: d.query({
    handler: async (ctx) => ok(searchResults),
  }).use(rateLimiter(100, 60000)),
});
```

### Meta-Based Authorization

```typescript
interface Meta {
  authRequired?: boolean;
  roles?: string[];
}

const d = initDRPC
  .context<{ userId: string; userRole: string }>({ userId: '', userRole: 'guest' })
  .meta<Meta>()
  .create();

const authMiddleware = d.middleware({
  handler: (opts) => {
  const { ctx, meta, next } = opts;

  // Check auth requirement
  if (meta?.authRequired && !ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Check role requirement
  if (meta?.roles && !meta.roles.includes(ctx.userRole)) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  return next();
});

const router = d.router({
  adminOnly: d.query({
    meta: { roles: ['admin'] },
    handler: async (ctx) => ok('admin secrets'),
  }).use(authMiddleware),

  userOnly: d.query({
    meta: { authRequired: true },
    handler: async (ctx) => ok('user data'),
  }).use(authMiddleware),
});
```

---

## API Reference

### d.middleware()

```typescript
d.middleware(config: MiddlewareConfig<TCtx, TMeta>): Middleware<TCtx, TMeta>
```

### MiddlewareConfig

```typescript
interface MiddlewareConfig<TCtx, TMeta> {
  args?: ZodType<unknown>;          // Optional args schema (validated at registration)
  meta?: TMeta;                     // Meta type for this middleware
  handler: (
    ctx: TCtx,
    args: unknown,
    extra: {
      type: ProcedureType;
      path: string;
      meta: TMeta | undefined;
      next: (opts?: { ctx?: Partial<TCtx> }) => Promise<MiddlewareResult>;
    }
  ) => Promise<MiddlewareResult>;
}
```

**Middleware with args example:**

```typescript
// Define middleware with configurable args
const requireRole = (requiredRole: string) => {
  return d.middleware({
    args: z.object({ role: z.string() }),
    handler: (ctx, args, extra) => {
      const { next } = extra;

      if (ctx.role !== args.role) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `Requires role: ${requiredRole}` });
      }
      return next();
    },
  });
};
```
// Usage
const router = d.router({
  adminData: d.query({
    handler: async (ctx) => ok('admin data'),
  }).use(requireRole('admin')),
});
```

### ProcedureType

```typescript
type ProcedureType = 'query' | 'mutation' | 'subscription';
```

### MiddlewareResult

```typescript
type MiddlewareResult = {
  ok: true;
  data: unknown;
  marker: MiddlewareMarker;
} | {
  ok: false;
  error: TRPCError;
  marker: MiddlewareMarker;
};
```

### TRPCError Codes

```typescript
type TRPCErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'PRECONDITION_FAILED';
```

---

## Implementation Notes

### Middleware Execution Model

- Middleware is called in **synchronous order** as registered
- Each middleware **must** call `next()` (or throw) for the chain to continue
- Context overrides are **shallow merged** — `next({ ctx: { extra: 'data' } })` adds/overrides keys but doesn't replace the entire context
- Errors thrown by middleware **bypass** all subsequent middleware and hooks

### Marker Symbol

The `marker: MiddlewareMarker` is an internal symbol used for tracking middleware execution. Middleware implementations should not need to interact with it directly.

### Combining with Hooks

Middleware and hooks can be used together:

```typescript
const router = d.router({
  data: d.query({
    hooks: {
      beforeInvoke: (ctx, args) => auditLog.log('before', ctx, args),
      afterInvoke: (ctx, args, output) => auditLog.log('after', ctx, args, output),
    },
    handler: async (ctx) => ok(processData(ctx)),
  }).use(authMiddleware).use(timingMiddleware),
});
```

**Execution order:**
1. Middleware (authMiddleware)
2. Middleware (timingMiddleware)
3. Hook: beforeInvoke
4. Procedure handler
5. Hook: afterInvoke / onError (if error)

---

## Status

**Draft** — Design for middleware as described in RFC 01. Implementation pending.
