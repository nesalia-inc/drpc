# Proposed API

## 3. Proposed API

This document describes the target usage pattern and function signature for the Next.js integration.

## 3.1 Target Usage Pattern

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

## 3.2 createNextHandler Signature

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

## Related Files

- [Architecture](./architecture.md) - Learn about request flow and route mapping
- [Error Mapping](./error-mapping.md) - Learn about HTTP status mapping