# Hono Integration Report

**Date**: 2026-04-09
**Status**: Analyzed - Ready for implementation

---

## 1. Overview

Hono integration enables `@deessejs/server` procedures to be exposed via HTTP using Hono as the web framework. This allows modern deployment targets (Cloudflare Workers, Vercel Edge, AWS Lambda, Bun, Deno, Node.js).

---

## 2. Architecture

### 2.1 Integration Pattern

```
HTTP Request (GET/POST/PUT/PATCH/DELETE)
    → Hono route handler
    → Map HTTP method + path to procedure
    → Execute via api.execute("users.get", args)
    → Map Result<Output> to HTTP response
```

### 2.2 Path to Procedure Mapping

| HTTP Method | Path | Procedure |
|-------------|------|-----------|
| GET | `/users/list` | `users.list` (query) |
| GET | `/users/:id` | `users.get` (query) with `{ id }` as args |
| POST | `/users` | `users.create` (mutation) |
| PUT | `/users/:id` | `users.update` (mutation) |
| PATCH | `/users/:id` | `users.patch` (mutation) |
| DELETE | `/users/:id` | `users.delete` (mutation) |

### 2.3 HTTP Method to Procedure Type

| HTTP Method | Procedure Type | Args Source |
|-------------|---------------|-------------|
| GET | `query` | URL search params |
| POST | `mutation` | JSON body |
| PUT/PATCH/DELETE | `mutation` | JSON body |

---

## 3. Proposed API

### 3.1 Package Structure

```
@deessejs/server-hono (new package)
├── createHonoHandler(client)  // Main export
│   ├── Registers GET routes for all query procedures
│   ├── Registers POST routes for all mutation procedures
│   └── Returns Hono app
└── mapPathToProcedure(path, method)
    ├── Convert /users/:id → "users.get" with { id }
    └── Determine if query or mutation from HTTP method
```

### 3.2 Usage Example

```typescript
import { Hono } from 'hono'
import { createClient } from '@deessejs/server'
import { createHonoHandler } from '@deessejs/server-hono'
import { api } from './api' // your @deessejs/server API

// Create Hono app
const app = new Hono()

// Add middleware (auth, CORS, logging)
app.use('*', async (c, next) => {
  const userId = await authenticate(c.req)
  c.set('userId', userId)
  await next()
})

// Create handler and mount
const { fetch } = createHonoHandler(createClient(api))
app.route('/api', fetch)

export default app
```

### 3.3 Error to HTTP Status Mapping

| Error Code | HTTP Status |
|------------|-------------|
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `CONFLICT` | 409 |
| `INTERNAL_ERROR` | 500 |

---

## 4. Key Design Decisions

### 4.1 Separate Package

**Decision**: Create `@deessejs/server-hono` as a separate package.

**Rationale**:
- Keeps `@deessejs/server` core framework-agnostic
- Allows independent versioning
- Users choose which HTTP adapter to use

### 4.2 Internal Operations

`internalQuery` and `internalMutation` are **NOT** HTTP exposed.

- Hono handler only registers routes for `query` and `mutation`
- Use `getPublicRoutes()` to filter
- Internal operations remain callable via `api.users.count({})` server-side

### 4.3 Context Integration

Hono context (`c.get`/`c.set`) vs @deessejs/server context:

| Hono | @deessejs/server |
|------|------------------|
| Request-scoped `c.set('key', value)` | Application context `ctx` |
| Middleware sets values | Plugins extend context |

**Solution**: Pass Hono context variables via args:
```typescript
app.get('/users/:id', async (c) => {
  const result = await api.users.get({
    id: c.req.param('id'),
    requestedBy: c.get('userId') // from auth middleware
  })
  return c.json(result)
})
```

---

## 5. Implementation Phases

### Phase 1: Core Handler (1-2 days)
- [ ] Create `createHonoHandler()` function
- [ ] Register GET routes for query procedures
- [ ] Register POST routes for mutation procedures
- [ ] Path parameter extraction
- [ ] JSON response with proper status codes

### Phase 2: Middleware Integration (1 day)
- [ ] Document Hono middleware + @deessejs/server pattern
- [ ] Show auth, CORS, logging integration
- [ ] Context passing examples

### Phase 3: Edge Runtime Testing (2-3 days)
- [ ] Test on Cloudflare Workers
- [ ] Test on Vercel Edge
- [ ] Verify bundle size

### Phase 4: Client Integration (2-3 days)
- [ ] Type-safe client with Hono's `hc` pattern
- [ ] Or dedicated `@deessejs/client`

---

## 6. Dependencies

```json
{
  "@deessejs/server": "workspace:*",
  "@hono/node-server": "^2.0.0",
  "hono": "^4.0.0"
}
```

Dev dependencies for testing:
```json
{
  "@cloudflare/workers-types": "^4.0.0"
}
```

---

## 7. File Structure

```
packages/
└── server-hono/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts              // exports
    │   ├── createHonoHandler.ts   // main function
    │   ├── mapRoute.ts           // path → procedure mapping
    │   └── errors.ts             // HTTP status mapping
    └── tests/
        └── index.test.ts
```

---

## 8. Next Steps

1. Create `packages/server-hono/` directory
2. Initialize with `package.json` and `tsconfig.json`
3. Implement `createHonoHandler()`
4. Write tests
5. Publish as `@deessejs/server-hono@0.0.0`

---

## 9. References

- [Hono Official Docs](https://hono.dev)
- [Hono RPC](https://hono.dev/docs/builtin/rpc)
- [Existing hono-analysis.md](../../docs/hono-analysis.md)
