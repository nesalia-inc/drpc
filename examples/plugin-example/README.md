# Plugin Example for @deessejs/server

This example demonstrates the **plugin system** in `@deessejs/server`, showing how to extend the procedure context with custom properties and helpers. It uses a standalone Hono server (not Next.js) for the HTTP layer.

## What is the Plugin System?

The plugin system allows you to enrich the context available in every procedure handler without modifying the core API definition. Plugins are:

- **Composable**: Add multiple plugins to a single API
- **Per-request**: Plugins receive request-specific context (e.g., auth headers)
- **Type-safe**: Full TypeScript support with proper type inference

## Structure

```
src/
├── plugins/
│   ├── auth.ts       # Auth plugin (userId, isAuthenticated, requireAuth)
│   └── cache.ts      # Cache plugin (cache.get, cache.set, cache.del, cache.clear)
├── api/
│   └── index.ts      # Main API definition with plugins array
├── routes/
│   ├── users.ts      # User procedures (example routes)
│   └── posts.ts      # Post procedures (example routes)
└── index.ts          # Hono HTTP server entry point
```

## Key Concepts

### 1. Define the Full Context Type

The `AppContext` interface defines all properties available in handlers, including those added by plugins:

```typescript
interface AppContext {
  // Base context
  db: typeof db;
  requestInfo: RequestInfo;

  // Auth plugin properties
  userId: number | null;
  isAuthenticated: boolean;
  requireAuth: () => void;

  // Cache plugin properties
  cache: {
    get: <T>(key: string) => T | undefined;
    set: <T>(key: string, value: T, ttl?: number) => void;
    del: (key: string) => void;
    clear: () => void;
  };
}
```

### 2. Create Plugins

A plugin is an object with:
- `name`: Unique identifier (for debugging)
- `extend(ctx)`: Returns properties to merge into the context

**Auth Plugin** (`src/plugins/auth.ts`):

```typescript
import { UnauthorizedException } from "@deessejs/server";
import type { Plugin } from "@deessejs/server";
import type { AppContext } from "@/api";

export const authPlugin: Plugin<AppContext> = {
  name: "auth",

  extend: (ctx) => ({
    userId: ctx.userId, // Extracted in createContext from Authorization header
    isAuthenticated: ctx.userId !== null,

    requireAuth: () => {
      if (ctx.userId === null) {
        throw new UnauthorizedException("Authentication required");
      }
    },
  }),
};
```

**Cache Plugin** (`src/plugins/cache.ts`):

```typescript
import type { Plugin } from "@deessejs/server";
import type { AppContext } from "@/api";

export const cachePlugin: Plugin<AppContext> = {
  name: "cache",

  extend: () => ({
    cache: {
      get: <T>(key: string): T | undefined => { /* ... */ },
      set: <T>(key: string, value: T, ttl?: number): void => { /* ... */ },
      del: (key: string): void => { /* ... */ },
      clear: (): void => { /* ... */ },
    },
  }),
};
```

### 3. Use `defineContext` with Plugins Array

Pass plugins to `defineContext` to apply them per-request:

```typescript
const { t, createAPI } = defineContext({
  context: {
    db,
    userId: null,
    isAuthenticated: false,
    requireAuth: () => { throw new Error("Unauthorized"); },
    cache: { get: () => undefined, set: () => {}, del: () => {}, clear: () => {} },
  } as AppContext,

  createContext: (requestInfo?: RequestInfo): AppContext => {
    // Extract userId from Authorization header
    const userId = extractUserIdFromHeader(requestInfo?.headers?.authorization);

    return {
      db,
      userId,
      isAuthenticated: userId !== null,
      requireAuth: () => {
        if (userId === null) throw new UnauthorizedException("Auth required");
      },
      cache: { get: () => undefined, set: () => {}, del: () => {}, clear: () => {} },
    };
  },

  // Pass plugins here - they extend the context on each request
  plugins: [authPlugin, cachePlugin],
});
```

### 4. Handlers Automatically Get Extended Context

All procedure handlers receive the full context including plugin properties:

```typescript
const createPost = t.mutation({
  args: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
  }),
  handler: async (ctx, args) => {
    // Auth guard - throws if not authenticated
    ctx.requireAuth();

    // Access userId (set from Authorization header)
    console.log(`Creating post for user: ${ctx.userId}`);

    // Use cache
    const cacheKey = `post:${args.title}`;
    const cached = ctx.cache.get<Post>(cacheKey);
    if (cached) return ok(cached);

    // Create and cache the post
    const post = { id: generateId(), title: args.title, content: args.content, authorId: ctx.userId! };
    ctx.cache.set(cacheKey, post, 60 * 1000); // 60 second TTL

    return ok(post);
  },
});
```

## Running the Example

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The server runs at `http://localhost:3000`.

## API Testing

You can test the API using curl:

```bash
# List all posts (GET - no args needed)
curl http://localhost:3000/api/posts.list

# Get post by ID (GET with query args)
curl "http://localhost:3000/api/posts.get?args=%7B%22id%22%3A1%7D"

# Create post (POST - requires auth)
curl -X POST http://localhost:3000/api/posts.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1" \
  -d '{"title":"Hello","content":"World"}'

# List all users (GET - no args needed)
curl http://localhost:3000/api/users.list

# Get user by ID (GET with query args)
curl "http://localhost:3000/api/users.get?args=%7B%22id%22%3A1%7D"

# Create user (POST - requires auth)
curl -X POST http://localhost:3000/api/users.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1" \
  -d '{"name":"Test","email":"test@test.com"}'

# Delete user (POST - requires admin)
curl -X POST http://localhost:3000/api/users.delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1" \
  -d '{"id":3}'
```

## API Endpoints

| Method | Endpoint         | Auth Required | Description           |
|--------|------------------|---------------|-----------------------|
| GET    | /api/posts.list  | No            | List all posts        |
| GET    | /api/posts.get   | No            | Get post by ID        |
| POST   | /api/posts.create| Yes           | Create a new post     |
| POST   | /api/posts.delete| Yes (Admin)   | Delete a post         |
| GET    | /api/users.list  | No            | List all users        |
| GET    | /api/users.get   | No            | Get user by ID        |
| POST   | /api/users.create| Yes           | Create a new user     |
| POST   | /api/users.delete| Yes (Admin)   | Delete a user         |

## Testing Auth

Include an `Authorization` header with requests using Bearer token format:

```bash
# Authenticated request (user 1 - Alice, admin)
curl -H "Authorization: Bearer 1" http://localhost:3000/api/users.list

# Authenticated request (user 2 - Bob, regular user)
curl -H "Authorization: Bearer 2" http://localhost:3000/api/posts.list

# Anonymous request (no auth header)
curl http://localhost:3000/api/users.list
```

## How Plugins Extend Context

When a request comes in:

1. **createContext(requestInfo)** is called with HTTP headers
2. Base context is created (db, userId from header, etc.)
3. Each plugin's `extend(ctx)` is called in order:
   - `authPlugin.extend(ctx)` adds userId, isAuthenticated, requireAuth
   - `cachePlugin.extend(ctx)` adds cache helper object
4. All properties are merged into the final context
5. The merged context is passed to the procedure handler

This means later plugins can use properties from earlier plugins, and all plugins have access to the per-request context (like userId from headers).

## Benefits of the Plugin System

1. **Separation of Concerns**: Auth logic, caching logic, etc. are in separate files
2. **Reusability**: Plugins can be shared across different APIs
3. **Testability**: Plugins can be tested independently
4. **Type Safety**: Full TypeScript inference with no runtime overhead
