# plugin-example-server

Demonstrates the `@deessejs/server` **plugin system** in a pure server-side context - no HTTP server, no Next.js, no Hono. Every procedure is called directly as a TypeScript function.

## Why this example?

The standard plugin-example runs a Hono HTTP server and uses `Authorization` headers to identify the caller. That is the most common deployment pattern, but it obscures the fact that the plugin system has nothing to do with HTTP. This example removes the HTTP layer entirely so you can see the plugin mechanics in isolation.

## Structure

```
src/
├── api/
│   └── index.ts        API definition: context type, procedures, router, exports
├── plugins/
│   ├── auth.ts         Auth plugin - derives isAuthenticated and requireAuth from userId
│   └── cache.ts        Cache plugin - in-memory TTL cache attached to every context
└── examples/
    └── usage.ts        Runnable demo showing public, auth-guarded, and admin calls
```

## Running

```bash
pnpm install   # from the repo root
pnpm dev       # runs tsx src/examples/usage.ts
```

## Key concepts

### 1. Context without HTTP

The base context holds a `userId` field. When building the anonymous API the field is `null`:

```typescript
const { t, createAPI } = defineContext({
  context: {
    db,
    userId: null,          // null = anonymous
    isAuthenticated: false,
    requireAuth: () => { throw new Error("Unauthorized"); },
    cache: { get: () => undefined, set: () => {}, del: () => {}, clear: () => {} },
  } as AppContext,
  plugins: [authPlugin, cachePlugin],
});

export const api = createAPI({ router: appRouter });
```

### 2. Authenticated API via `createUserAPI`

To call auth-guarded procedures, create a second API instance with a concrete `userId`:

```typescript
export function createUserAPI(userId: number) {
  return createAPI<AppContext, typeof appRouter>({
    router: appRouter,
    context: { db, userId, isAuthenticated: true, requireAuth: () => {}, ... } as AppContext,
    plugins: [authPlugin, cachePlugin],
  });
}
```

In a real application you call this inside a server action or server component after resolving the session:

```typescript
const session = await getSession();
const userApi = createUserAPI(session.userId);
const result = await userApi.posts.create({ title, content });
```

### 3. Auth plugin (no header parsing)

Without HTTP the auth plugin simply reads `ctx.userId` and derives the helper values:

```typescript
export const authPlugin: Plugin<AppContext> = {
  name: "auth",
  extend: (ctx) => ({
    userId: ctx.userId,
    isAuthenticated: ctx.userId !== null,
    requireAuth: () => {
      if (ctx.userId === null) {
        throw new UnauthorizedException("Authentication required.");
      }
    },
  }),
};
```

### 4. Cache plugin (identical in HTTP and server-only modes)

The cache plugin is stateless relative to the request context - it owns a module-level `Map` and exposes `get`, `set`, `del`, `clear` helpers. It works the same regardless of whether there is an HTTP layer:

```typescript
export const cachePlugin: Plugin<AppContext> = {
  name: "cache",
  extend: () => ({
    cache: {
      get: <T>(key) => { /* check Map, evict if expired */ },
      set: <T>(key, value, ttl?) => { /* store with expiresAt */ },
      del: (key) => { /* remove entry */ },
      clear: () => { /* flush everything */ },
    },
  }),
};
```

### 5. Calling procedures directly

```typescript
// Public query - works on any API instance
const result = await api.users.list();
if (result.ok) {
  console.log(result.value); // User[]
}

// Auth-guarded mutation - fails on the anonymous API
const fail = await api.users.create({ name: "Ghost", email: "ghost@example.com" });
// fail.ok === false, fail.error.message === "Authentication required."

// Auth-guarded mutation - succeeds on the authenticated API
const adminApi = createUserAPI(1); // Alice, admin
const ok = await adminApi.users.create({ name: "Dave", email: "dave@example.com" });
// ok.ok === true, ok.value === { id: 4, name: "Dave", ... }
```

## How plugins are applied

On every procedure call the factory applies plugins in order:

1. `authPlugin.extend(ctx)` - computes `isAuthenticated` and `requireAuth` from `ctx.userId`
2. `cachePlugin.extend(ctx)` - attaches the cache helper object

The merged context is then passed to the procedure handler. Later plugins can read properties set by earlier plugins. The `ctx` object inside the handler always contains the final merged result.

## Differences from plugin-example (HTTP version)

| Aspect | plugin-example (HTTP) | plugin-example-server (this) |
|---|---|---|
| Transport | Hono HTTP server | None |
| userId source | `Authorization: Bearer <id>` header | Base context at API-creation time |
| `createContext` | Yes - runs per HTTP request | No |
| `requestInfo` | Yes - headers, method, url | No |
| Running | `pnpm dev` starts a server | `pnpm dev` runs the script once |
