# Next.js Integration

Date: 2026-04-22
Tag: [integration] [nextjs] [server]

## Overview

`@deessejs/server-next` provides a Next.js App Router adapter for `@deessejs/server`. It wraps `@deessejs/server-hono` to create HTTP handlers compatible with Next.js Route Handlers.

**Dependencies:**
- `@deessejs/server-hono` (internal)
- `hono` (HTTP framework)
- `next` (peer dependency)

## Installation

```bash
npm install @deessejs/server-next
```

## Quick Start

### 1. Create the API Handler

```typescript
// app/api/[[...route]]/route.ts
import { createNextHandler } from "@deessejs/server-next";
import { createAPI, defineContext, t } from "@deessejs/server";
import { z } from "zod";

const { createAPI } = defineContext({});

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await db.users.find(args.id);
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" });
    return ok(user);
  }
});

const api = createAPI({
  router: t.router({
    users: { get: getUser }
  })
});

export type AppRouter = typeof api;

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createNextHandler(api);
```

### 2. Use in Next.js Route Handler

The handler exports HTTP methods compatible with Next.js App Router:

```typescript
// app/api/[[...route]]/route.ts
import { GET, POST } from "./api/[[...route]]";

// These are exported automatically by createNextHandler
export { GET, POST, PUT, PATCH, DELETE, OPTIONS };
```

## API

### `createNextHandler(client)`

Creates Next.js HTTP handlers from a deesse API client.

```typescript
import type { HTTPClient } from "@deessejs/server-hono";

export function createNextHandler(client: HTTPClient): NextHandler
```

### `NextHandler`

```typescript
export interface NextHandler {
  GET: (request: Request | NextRequest) => Promise<Response>;
  POST: (request: Request | NextRequest) => Promise<Response>;
  PUT: (request: Request | NextRequest) => Promise<Response>;
  PATCH: (request: Request | NextRequest) => Promise<Response>;
  DELETE: (request: Request | NextRequest) => Promise<Response>;
  OPTIONS: (request: Request | NextRequest) => Promise<Response>;
}
```

## Request Flow

```
Next.js Route Handler
    ↓
createNextHandler (GET/POST/etc.)
    ↓
Hono Handler (createHonoHandler)
    ↓
Procedure Lookup (users.get)
    ↓
Execute handler
    ↓
Return Result
```

## HTTP Method Mapping

| Method | Procedure Type | Args Source |
|--------|---------------|-------------|
| GET | `t.query()` | URL search params |
| POST | `t.mutation()` | JSON body |
| PUT | `t.mutation()` | JSON body |
| PATCH | `t.mutation()` | JSON body |
| DELETE | `t.mutation()` | JSON body |

## Error Handling

Errors are automatically mapped to HTTP status codes:

| Error Code | HTTP Status |
|------------|-------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| Default | 500 |

## Example: Complete Setup

```typescript
// app/api/[[...route]]/route.ts
import { createNextHandler } from "@deessejs/server-next";
import { createAPI, defineContext, t } from "@deessejs/server";
import { z } from "zod";

const { createAPI } = defineContext({});

const userQueries = t.router({
  get: t.query({
    args: z.object({ id: z.number() }),
    handler: async (ctx, { id }) => {
      const user = await db.users.find(id);
      return user ? ok(user) : err({ code: "NOT_FOUND" });
    }
  }),
  list: t.query({
    args: z.object({ limit: z.number().default(10) }),
    handler: async (ctx, { limit }) => {
      const users = await db.users.findMany({ limit });
      return ok(users);
    }
  })
});

const userMutations = t.router({
  create: t.mutation({
    args: z.object({ name: z.string(), email: z.string().email() }),
    handler: async (ctx, { name, email }) => {
      const user = await db.users.create({ name, email });
      return ok(user);
    }
  })
});

export const api = createAPI({
  router: t.router({
    users: t.router({
      queries: userQueries,
      mutations: userMutations
    })
  })
});

export type AppRouter = typeof api;

// Export HTTP handlers
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createNextHandler(api);
```

## Client-Side Usage

See [Client React Hooks](./client-react-hooks.md) for client-side integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Next.js                                │
│  app/api/[[...route]]/route.ts                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  @deessejs/server-next                                       │
│  createNextHandler()                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  @deessejs/server-hono                                       │
│  createHonoHandler() - HTTP routing via Hono               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  @deessejs/server                                            │
│  Procedure execution via proxy                               │
└─────────────────────────────────────────────────────────────┘
```

## Related

- [React Hooks Integration](./client-react-hooks.md)
- [Creating API](./creating-api.md)
- [Router](./router.md)
- [Mutations](./mutations.md)
- [Queries](./queries.md)