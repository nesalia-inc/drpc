# Lifecycle Rule - "Cycle de Vie"

## Rule

**Standardized hooks with consistent arguments.**
**Plugins at creation, middlewares at execution.**

## Why

Lifecycle confusion causes subtle bugs:
- Plugins registered after creation miss initialization
- Middlewares at creation time don't have request context
- Inconsistent hook signatures lead to errors
- Wrong placement makes features unreliable

## Anti-Patterns (Forbidden)

```typescript
// WRONG - middleware at creation time
const createHandler = () => {
  const middleware = async (ctx, next) => { /* uses ctx */ };
  // This middleware has no request context!
  return { handle: () => middleware };
};

// WRONG - inconsistent hook arguments
const plugin1 = { onUserCreate: (user: User) => {} };
const plugin2 = { onUserCreate: (user: User, ctx: Context) => {} }; // Different!
// Plugin system can't predict signature

// WRONG - registering middleware at wrong time
const app = createApp();
app.use(authMiddleware); // Too early - no request context yet!

app.addRoute("GET /", async (ctx) => {
  app.use(rateLimitMiddleware); // Too late - route already matched!
});

// WRONG - mixing plugin and middleware concepts
const plugin = (middleware) => { /* transforms middleware? */ };
// Plugin shouldn't receive middleware directly
```

## Correct Patterns

### 1. Plugins at Creation (Setup Time)

```typescript
// GOOD - plugins configure at creation
const createService = (config: ServiceConfig) => {
  // Plugins run during setup, configure service
  const service = {
    state: { initialized: false },
    plugins: [] as Plugin[],
  };

  for (const plugin of config.plugins ?? []) {
    plugin.setup?.(service);
  }

  return service;
};

// GOOD - plugin interface
interface Plugin<TCtx = Context> {
  readonly name: string;
  setup?: (service: Service) => void;
  beforeRequest?: (ctx: TCtx) => void | Promise<void>;
  afterResponse?: (ctx: TCtx) => void | Promise<void>;
}

// GOOD - plugin usage
const withLogging: Plugin = {
  name: "logger",
  setup: (service) => {
    service.logger = console;
    service.state.initialized = true;
  },
};

const service = createService({
  plugins: [withLogging],
});
```

### 2. Middlewares at Execution (Request Time)

```typescript
// GOOD - middleware receives request context
const createHandler = (middlewares: Middleware[]) => {
  return async (request: Request): Promise<Response> => {
    // Context created per-request
    const ctx = createContext({ request });

    // Middlewares execute with context
    const next = async () => {
      ctx.response = await handleRequest(ctx);
    };

    for (const middleware of middlewares) {
      await middleware(ctx, next);
    }

    return ctx.response;
  };
};

// GOOD - middleware with consistent signature
type Middleware<TCtx = Context> = (
  ctx: TCtx,
  next: () => Promise<void>
) => Promise<void>;

// GOOD - middleware execution chain
const authMiddleware: Middleware = async (ctx, next) => {
  if (!ctx.user) {
    ctx.status = 401;
    return; // Short-circuit
  }
  await next();
};

const validationMiddleware: Middleware = async (ctx, next) => {
  const result = validate(ctx.request.body);
  if (!result.ok) {
    ctx.status = 400;
    ctx.body = result.error;
    return;
  }
  ctx.validated = result.value;
  await next();
};
```

### 3. Standardized Hooks

```typescript
// GOOD - consistent hook signature
interface Hooks<TCtx = Context> {
  onStart?: () => void | Promise<void>;
  onBeforeRequest?: (ctx: TCtx) => void | Promise<void>;
  onAfterRequest?: (ctx: TCtx) => void | Promise<void>;
  onError?: (ctx: TCtx, error: Error) => void | Promise<void>;
  onEnd?: () => void | Promise<void>;
}

// GOOD - all hooks receive same context type
const createServiceWithHooks = <TCtx>(
  config: ServiceConfig,
  hooks: Hooks<TCtx>
) => {
  const service = createService(config);

  return {
    ...service,

    async handle(ctx: TCtx): Promise<Result> {
      hooks.onStart?.();

      try {
        hooks.onBeforeRequest?.(ctx);
        const result = await service.execute(ctx);
        hooks.onAfterRequest?.(ctx);
        return result;
      } catch (error) {
        hooks.onError?.(ctx, error as Error);
        return err(error as Error);
      } finally {
        hooks.onEnd?.();
      }
    },
  };
};

// GOOD - hook receives typed context
interface UserContext {
  request: Request;
  user?: User;
  state: Record<string, unknown>;
}

const hooks: Hooks<UserContext> = {
  onStart: () => console.log("Starting..."),
  onBeforeRequest: (ctx) => {
    console.log(`User: ${ctx.user?.id}`);
  },
  onError: (ctx, error) => {
    console.error(`Error for user ${ctx.user?.id}: ${error.message}`);
  },
};
```

### 4. Lifecycle Ordering

```typescript
// GOOD - clear lifecycle order
const Lifecycle = {
  // 1. Service creation (plugins run)
  CREATE: "create",

  // 2. Request starts (before middlewares)
  REQUEST_START: "request_start",

  // 3. Middlewares execute in order
  MIDDLEWARE_1: "middleware_1",
  MIDDLEWARE_2: "middleware_2",
  // ...

  // 4. Handler executes
  HANDLER: "handler",

  // 5. Response starts (after handler, before middlewares complete)
  RESPONSE_START: "response_start",

  // 6. Middlewares complete in reverse
  MIDDLEWARE_COMPLETE: "middleware_complete",

  // 7. Request ends
  REQUEST_END: "request_end",

  // 8. Service cleanup
  DESTROY: "destroy",
} as const;

// GOOD - execution diagram
/**
 * Request Flow:
 *
 * CREATE -> REQUEST_START -> MIDDLEWARE_1 -> MIDDLEWARE_2 -> HANDLER
 *                                         |
 *                                   RESPONSE_START
 *                                         |
 *              MIDDLEWARE_COMPLETE <- MIDDLEWARE_COMPLETE
 *                      |
 *               REQUEST_END -> DESTROY
 */
```

## When Plugins and Middlewares Are Both Used

```typescript
// GOOD - plugins configure, middlewares execute
const createApp = (config: AppConfig) => {
  // PLUGINS - run at creation
  const plugins = config.plugins ?? [];
  const service = createService(config);

  for (const plugin of plugins) {
    plugin.setup?.(service);
  }

  // Return handler with MIDDLEWARES bound at creation
  return {
    handle: createHandler(config.middlewares ?? []),

    // Plugins attached to service for lifecycle
    service,
  };
};

// GOOD - plugin configures, middleware uses config
const withAuth: Plugin = {
  name: "auth",
  setup: (service) => {
    service.authEnabled = true;
  },
};

const authMiddleware: Middleware = async (ctx, next) => {
  // Middleware uses configuration from plugin
  if (!ctx.service.authEnabled) {
    return await next();
  }
  // Auth logic...
};
```

## Quick Reference

| Phase | What Runs | Examples |
|-------|-----------|----------|
| Creation | Plugins | `setup()`, `configure()` |
| Request Start | Hooks | `onBeforeRequest()` |
| Execution | Middlewares | Auth, validation, logging |
| Handler | Business Logic | `handleRequest()` |
| Response | Hooks | `onAfterResponse()`, `onError()` |
| Cleanup | Hooks | `onEnd()` |

## Enforcement

- Plugins must not access request context (it doesn't exist yet)
- Middlewares must not be registered at creation time with closed-over state
- All hooks in a system must have consistent signatures
- Use TypeScript to enforce hook argument types

## Anti-Pattern: The Hybrid

```typescript
// WRONG - this is not a plugin or middleware
const hybrid = {
  setup: () => { /* configures */ },
  middleware: async (ctx, next) => { /* uses ctx */ }, // Mixed concerns!
};

// GOOD - separate concerns
const plugin = { setup: (service) => { service.config = {}; } };
const middleware = async (ctx, next) => { /* request context */ };
```
