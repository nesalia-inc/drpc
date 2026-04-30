# RFC 06: Hono HTTP Adapter

## Summary

`@deessejs/server-hono` is the HTTP adapter for DRPC. It wraps a DRPC API client into a Hono application, exposing procedures as HTTP endpoints. This enables DRPC to work with any HTTP client (fetch, cURL, Postman, etc.) and deploy to any environment that supports Hono (Node.js, Cloudflare Workers, Vercel Edge, Deno, Bun).

---

## Overview

### What Is an Adapter?

An adapter bridges DRPC's procedure-based API to a specific transport (HTTP, WebSocket, etc.). The core `@deessejs/server` package handles procedure execution locally. Adapters expose those procedures via a network protocol.

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   HTTP Client   │ ───▶ │   Hono Handler   │ ───▶ │  DRPC Router    │
│ (fetch/curl)    │      │ (server-hono)    │      │ (server)        │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

**Key features:**
- Exposes DRPC procedures as REST-like HTTP endpoints
- Maps error codes to HTTP status codes
- Supports query parameters for queries, JSON body for mutations
- Works in edge environments (Cloudflare Workers, Vercel Edge)
- No DRPC-specific HTTP protocol — uses standard REST conventions

---

## How It Works

### Installation

```bash
pnpm add @deessejs/server-hono hono
```

### Basic Usage

```typescript
import { initDRPC, createAPI, ok } from '@deessejs/server';
import { createPublicAPI } from '@deessejs/server';
import { createHonoHandler } from '@deessejs/server-hono';

const d = initDRPC
  .context({ db: myDatabase })
  .create();

const router = d.router({
  users: {
    list: d.query({
      handler: async (ctx) => ok(await ctx.db.listUsers()),
    }),
    byId: d.query({
      args: z.object({ id: z.string().uuid() }),
      handler: async (ctx, args) => {
        const user = await ctx.db.findUser(args.id);
        return user ? ok(user) : err({ code: 'NOT_FOUND', message: 'User not found' });
      },
    }),
    create: d.mutation({
      args: z.object({ email: z.string().email(), name: z.string() }),
      handler: async (ctx, args) => ok(await ctx.db.createUser(args)),
    }),
  },
});

const api = createAPI({ router });
const client = createPublicAPI(api);
const app = createHonoHandler(client);

export default app;
```

### Running the Server

**With Hono's built-in server:**
```typescript
import { serve } from '@hono/node-server';
serve({ fetch: app.fetch, port: 3000 });
```

**With Bun:**
```typescript
import { serve } from 'bun';
serve({ fetch: app.fetch, port: 3000 });
```

**With Cloudflare Workers:**
```typescript
export default {
  fetch: app.fetch,
};
```

**With Vercel Edge:**
```typescript
export const config = { runtime: 'edge' };
export default app;
```

---

## HTTP Interface

### Endpoint Conventions

DRPC over HTTP uses standard REST conventions without a specific protocol:

| Procedure Type | HTTP Method | Input Location |
|----------------|-------------|---------------|
| Query | `GET` | Query parameters |
| Mutation | `POST`, `PUT`, `PATCH`, `DELETE` | JSON body |

### URL Structure

```
/api/{namespace}.{method}?{args}
```

**Examples:**
```
GET  /api/users.list                    → d.query({ handler: ... })
GET  /api/users.byId?id=123              → d.query({ args: { id: "123" }, ... })
POST /api/users.create                   → d.mutation({ args: {...}, ... })
POST /api/users.delete                   → d.mutation({ args: {...}, ... })
```

**Path normalization:**
- URL path `/api/users/get` → procedure path `users.get`
- Dot notation: `/api/users.get` also works

### Query Procedures

**Input via query parameters:**

```bash
# Call list users (no args)
GET /api/users.list

# Call byId with args
GET /api/users.byId?id=550e8400-e29b-41d4-a716-446655440000
```

**URL encoding:**
```bash
GET /api/users.search?filter=alice%40example.com&status=active
```

### Mutation Procedures

**Input via JSON body:**

```bash
# Create user
POST /api/users.create
Content-Type: application/json

{
  "email": "alice@example.com",
  "name": "Alice"
}
```

**Alternative HTTP methods:**
```bash
# Same endpoint, different methods all treated as mutations
PUT  /api/users.create  -d '{"email": "bob@example.com", "name": "Bob"}'
PATCH /api/users.update -d '{"id": "123", "name": "Robert"}'
DELETE /api/users.delete -d '{"id": "123"}'
```

### Response Format

**Success:**
```json
{
  "ok": true,
  "data": { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "Alice", "email": "alice@example.com" }
}
```

**Error:**
```json
{
  "ok": false,
  "error": { "code": "NOT_FOUND", "message": "User not found" }
}
```

### HTTP Status Codes

Errors are mapped to HTTP status codes:

| Error Code | HTTP Status |
|------------|-------------|
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `INVALID_ARGS` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `CONFLICT` | 409 |
| `ROUTE_NOT_FOUND` | 404 |
| Other | 500 |

---

## RequestInfo Injection

When using dynamic context, the adapter injects `RequestInfo`:

```typescript
interface RequestInfo {
  readonly headers?: Record<string, string>;
  readonly method?: string;
  readonly url?: string;
}
```

**Example with auth header:**
```typescript
const d = initDRPC
  .context((req) => ({
    userId: req.headers['x-user-id'] ?? 'anonymous',
    authToken: req.headers['authorization'] ?? null,
  }))
  .create();

const router = d.router({
  profile: d.query({
    handler: async (ctx) => {
      // ctx.userId is extracted from X-User-Id header
      return ok({ userId: ctx.userId });
    },
  }),
});
```

---

## OpenAPI / Swagger Integration

Since DRPC over HTTP uses standard REST conventions, it integrates with OpenAPI tooling:

```typescript
// Routes are registered at /api/:path{.*}
// Tools like Zod-to-OpenAPI can generate spec from Zod schemas

import { generateOpenAPI } from 'zod-to-openapi';
import { Document } from '@hono/openapi';

const spec = generateOpenAPI({
  openapi: '3.0.0',
  info: { title: 'My API', version: '1.0.0' },
  paths: {
    '/api/users.list': {
      get: {
        operationId: 'listUsers',
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: z.array(UserSchema),
              },
            },
          },
        },
      },
    },
  },
});

app.get('/openapi.json', (c) => c.json(spec));
```

---

## Error Handling

### Client Errors

**400 Bad Request — Validation errors:**
```bash
GET /api/users.byId?id=not-a-uuid
```
```json
{
  "ok": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Invalid UUID format" }
}
```

**404 Not Found — Missing routes:**
```bash
GET /api/nonexistent.route
```
```json
{
  "ok": false,
  "error": { "code": "ROUTE_NOT_FOUND", "message": "Route not found: nonexistent.route" }
}
```

### Server Errors

**500 Internal Server Error:**
```json
{
  "ok": false,
  "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" }
}
```

**Note:** Internal error details are not leaked to clients for security.

---

## Environment Support

### Node.js

```typescript
import { serve } from '@hono/node-server';
serve({ fetch: app.fetch, port: 3000 });
```

### Bun

```typescript
import { serve } from 'bun';
serve({ fetch: app.fetch, port: 3000 });
```

### Cloudflare Workers

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },
};
```

### Vercel Edge

```typescript
export const config = { runtime: 'edge' };

export default app;
```

### Deno

```typescript
import { serve } from 'hono/deno';
serve({ fetch: app.fetch, port: 3000 });
```

---

## API Reference

### createHonoHandler()

```typescript
import { createHonoHandler } from '@deessejs/server-hono';

function createHonoHandler(client: HTTPClient): Hono;
```

Creates a Hono application that exposes DRPC procedures as HTTP endpoints.

**Parameters:**
- `client`: An `HTTPClient` — the return type of `createPublicAPI(api)`

**Returns:**
- A `Hono` instance with routes registered at `/api/:path{.*}`

### HTTPClient Type

```typescript
export type HTTPClient = ReturnType<typeof createPublicAPI>;
```

The HTTP client is a proxy object that allows calling procedures directly:

```typescript
const client = createPublicAPI(api);

// Direct procedure calls
const users = await client.users.list();
const user = await client.users.byId({ id: '123' });
await client.users.create({ email: 'alice@example.com', name: 'Alice' });
```

### Error Mapping

```typescript
const errorToStatusMap: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  ROUTE_NOT_FOUND: 404,
  INVALID_ARGS: 400,
};
```

---

## Usage Examples

### Full Example

```typescript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { initDRPC, createAPI, ok, err } from '@deessejs/server';
import { createPublicAPI } from '@deessejs/server';
import { createHonoHandler } from '@deessejs/server-hono';
import { z } from 'zod';

const d = initDRPC
  .context({ db: myDatabase })
  .meta<{ authRequired?: boolean }>()
  .create();

const router = d.router({
  users: {
    list: d.query({
      meta: { authRequired: false },
      handler: async (ctx) => ok(await ctx.db.listUsers()),
    }),
    byId: d.query({
      meta: { authRequired: true },
      args: z.object({ id: z.string().uuid() }),
      handler: async (ctx, args) => {
        const user = await ctx.db.findUser(args.id);
        return user ? ok(user) : err({ code: 'NOT_FOUND', message: 'User not found' });
      },
    }),
    create: d.mutation({
      args: z.object({ email: z.string().email(), name: z.string() }),
      handler: async (ctx, args) => {
        const user = await ctx.db.createUser(args);
        return ok(user);
      },
    }),
  },
});

const api = createAPI({ router });
const client = createPublicAPI(api);
const app = createHonoHandler(client);

// Start server
console.log('Server running on http://localhost:3000');
serve({ fetch: app.fetch, port: 3000 });
```

### With Middleware

```typescript
import { initDRPC, createAPI, ok } from '@deessejs/server';
import { createPublicAPI } from '@deessejs/server';
import { createHonoHandler } from '@deessejs/server-hono';

const d = initDRPC
  .context({ userId: 'anonymous' })
  .meta<{ authRequired?: boolean }>()
  .create();

const authMw = d.middleware({
  handler: (ctx, args, extra) => {
    if (extra.meta?.authRequired && ctx.userId === 'anonymous') {
      return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' }, marker: null as any };
    }
    return extra.next();
  },
});

const router = d.router({
  publicData: d.query({
    handler: async (ctx) => ok('public data'),
  }),
  privateData: d.query({
    meta: { authRequired: true },
    handler: async (ctx) => ok('private data'),
  }).use(authMw),
});

const api = createAPI({ router });
const client = createPublicAPI(api);
const app = createHonoHandler(client);
```

### With Dynamic Context

```typescript
const d = initDRPC
  .context((req: RequestInfo) => ({
    userId: req.headers['x-user-id'] ?? 'anonymous',
    startedAt: Date.now(),
  }))
  .create();

const router = d.router({
  hello: d.query({
    handler: async (ctx) => ok(`Hello, ${ctx.userId}!`)),
  }),
});

const api = createAPI({ router });
const client = createPublicAPI(api);
const app = createHonoHandler(client);
```

---

## Implementation Notes

### Path Normalization

The adapter normalizes URL paths to procedure paths:

```typescript
// URL: /api/users/get
// → procedure path: users.get

// URL: /api/users.get
// → procedure path: users.get
```

### Method Detection

HTTP methods are used only to determine mutation vs query:

```typescript
function isMutationMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}
```

Query parameters are always parsed from the URL, but the method determines how input is parsed.

### Internal Procedures

Internal procedures (`internalQuery`, `internalMutation`) are **not exposed** via the Hono handler. Only public procedures are registered:

```typescript
const router = d.router({
  publicData: d.query({ handler: async () => ok('public') }),
  internalData: d.internalQuery({ handler: async () => ok('internal') }),
});

// Only /api/publicData is exposed
// /api/internalData is NOT accessible via HTTP
```

### Context Per-Request

For dynamic context, each HTTP request gets its own context:

```typescript
const d = initDRPC
  .context((req) => ({
    userId: req.headers['x-user-id'] ?? 'anonymous',
  }))
  .create();

// Each request gets a fresh context based on its headers
// Concurrent requests don't share context mutations
```

---

## Status

**Implemented** — `@deessejs/server-hono` is available and functional.

---

## Ecosystem Packages

| Package | Purpose |
|---------|---------|
| `@deessejs/server` | Server SDK — procedure execution |
| `@deessejs/server-hono` | **This package** — HTTP via Hono |
| `@deessejs/server-next` | Next.js adapter |
| `@deessejs/server-electron` | Electron adapter |
| `@deessejs/client-react` | React client |
