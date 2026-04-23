# Next.js Integration Report

**Date**: 2026-04-09
**Status**: Analyzed - Package does not exist yet

---

## 1. Overview

Integrate `@deessejs/server` with Next.js App Router using a pattern similar to Payload CMS. The `@deessejs/server-next` package exposes procedures via REST API.

---

## 2. Architecture

### 2.1 Request Flow

```
Next.js Route Handler (GET/POST/PUT/PATCH/DELETE)
    ↓
hono/vercel handle() adapter
    ↓
Hono app routes (/:path*)
    ↓
4. Call client.execute(path, args)
    ↓
5. Map Result<T> to JSON response with appropriate HTTP status
```

### 2.2 Hono Relationship

```
@deessejs/server → @deessejs/server-hono → @deessejs/server-next
                                      ↑
                                      └── uses Hono internally via handle()
```

The `@deessejs/server-next` package uses Hono internally via `handle()` from `hono/vercel`. This provides a consistent adapter pattern across different server runtimes.

### 2.3 Route Mapping

| HTTP Method | Path | Procedure | Args Source |
|-------------|------|-----------|-------------|
| GET | `/api/drpc/users/list` | `users.list` | URL search params |
| GET | `/api/drpc/users/get?id=1` | `users.get` | URL search params |
| POST | `/api/drpc/users/create` | `users.create` | JSON body |
| PUT | `/api/drpc/users/update` | `users.update` | JSON body |
| PATCH | `/api/drpc/users/patch` | `users.patch` | JSON body |
| DELETE | `/api/drpc/users/delete` | `users.delete` | JSON body |

---

## 3. Proposed API

### 3.1 Target Usage Pattern

@deessejs/server-next internally uses Hono via `handle()` from `hono/vercel`.

```typescript
// app/api/[...slug]/route.ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { createNextHandler } from '@deessejs/server-next'

// Create the Next.js handler (internally uses Hono)
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = createNextHandler(client)
```

Internally, `createNextHandler` creates a Hono app and uses `handle()` to adapt it for Next.js:

```typescript
// Internal implementation pattern
const app = new Hono()
app.all('/:path*', async (c) => {
  const path = c.req.param('path')
  const result = await client.execute(path, args)
  return c.json(result)
})

export const GET = handle(app)
export const POST = handle(app)
// etc.
```

### 3.2 createNextHandler Signature

```typescript
function createNextHandler(
  client: PublicAPIInstance,
  options?: {
    cors?: CorsOptions
    onError?: (error: Error) => NextResponse
  }
): {
  GET: NextJsHandler
  POST: NextJsHandler
  PUT: NextJsHandler
  PATCH: NextJsHandler
  DELETE: NextJsHandler
  OPTIONS: NextJsHandler
}
```

---

## 4. Key Design Decisions

### 4.1 Should Use Hono Internally?

**Decision: YES for @deessejs/server-next, via `handle()` from `hono/vercel`**

Rationale:
- Next.js integration uses Hono via `handle()` from `hono/vercel`
- This provides consistent patterns across server runtimes
- Hono handles the adapter layer, keeping Next.js route handler minimal

Implementation pattern:
```typescript
import { handle } from 'hono/vercel'
import { Hono } from 'hono'

const app = new Hono()
app.all('/:path*', async (c) => {
  const path = c.req.param('path')
  const result = await client.execute(path, args)
  return c.json(result)
})

export const GET = handle(app)
export const POST = handle(app)
```

### 4.2 Context Per-Request (Headers, Cookies)

Next.js provides headers/cookies via special functions:

```typescript
import { headers, cookies } from 'next/headers'

// These must be passed to procedures via args
const authHeader = headersList.get('authorization')
const sessionCookie = cookieStore.get('session')
```

**Solution**: Pass as part of args or extend context via middleware.

### 4.3 Next.js 15 Async params

Next.js 15+ has async params:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  // ...
}
```

### 4.4 ISR/SSR Support

These are determined at the route handler level, not procedure level:

```typescript
export const dynamic = 'force-dynamic'  // or 'force-static' for ISR
export const revalidate = 3600          // revalidate every hour
```

---

## 5. Error to HTTP Status Mapping

| Error Code | HTTP Status |
|------------|-------------|
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `CONFLICT` | 409 |
| `INTERNAL_ERROR` | 500 |

---

## 6. Dependencies

```json
{
  "name": "@deessejs/server-next",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@deessejs/server": "workspace:*",
    "@deessejs/server-hono": "workspace:*",
    "hono": "^4.0.0"
  },
  "peerDependencies": {
    "next": "^14.0.0 || ^15.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 7. File Structure

```
packages/server-next/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports (createNextHandler)
│   ├── createNextHandler.ts  # Handler factory (uses Hono internally)
│   ├── honoApp.ts           # Hono app setup with routes
│   ├── mapRoute.ts          # Slug + method → procedure mapping
│   ├── errors.ts            # HTTP status mapping
│   ├── types.ts             # Next.js specific types
│   └── cors.ts              # CORS helpers
└── tests/
    └── createNextHandler.test.ts
```

Note: Internally uses Hono via `handle()` from `hono/vercel` for the Next.js adapter.

---

## 8. Implementation Phases

### Phase 1: Core Handler (1-2 days)
- [ ] Create `packages/server-next/`
- [ ] Implement `toNextJsHandler()`
- [ ] Handle all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- [ ] Extract slug from params
- [ ] Parse args from URL or body
- [ ] Return JSON responses with proper status codes

### Phase 2: Error Handling (0.5 day)
- [ ] Map error codes to HTTP statuses
- [ ] Handle unexpected errors (500)
- [ ] CORS preflight (OPTIONS)

### Phase 3: Options & Polish (0.5 day)
- [ ] CORS configuration option
- [ ] Custom error handler option
- [ ] Next.js 15 async params support

### Phase 4: Tests (1 day)
- [ ] Test all HTTP methods
- [ ] Test error cases
- [ ] Test CORS
- [ ] Test with actual Next.js app

---

## 9. Next Steps

1. Create `packages/server-next/` directory
2. Initialize with `package.json` and `tsconfig.json`
3. Implement `toNextJsHandler()`
4. Write tests
5. Integrate with main monorepo (pnpm workspace)

---

## 10. References

- [Next.js Integration Docs](../../docs/integration/nextjs/)
- [Hono Integration Report](./hono-integration.md)
- [Payload CMS Pattern](https://payloadcms.com/docs/rest-api/overview)
