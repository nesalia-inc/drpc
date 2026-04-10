# Should Use Hono Internally

## 4.1 Should Use Hono Internally?

**Decision: YES for @deessejs/server-next, via `handle()` from `hono/vercel`**

### Rationale

- Next.js integration uses Hono via `handle()` from `hono/vercel`
- This provides consistent patterns across server runtimes
- Hono handles the adapter layer, keeping Next.js route handler minimal
- The pattern uses `export const GET = handle(app)` and `export const POST = handle(app)`

### Implementation Pattern

```typescript
import { handle } from 'hono/vercel'
import { Hono } from 'hono'

const app = new Hono()
app.get('/users/get', async (c) => {
  const args = c.req.json()
  const result = await client.execute("users.get", args)
  return c.json(result)
})

export const GET = handle(app)
export const POST = handle(app)
```

### Architecture Relationship

```
@deessejs/server → @deessejs/server-hono → @deessejs/server-next
                                      ↑
                                      └── uses Hono internally
```

### Related Decisions

- See [context.md](./context.md) for how to handle per-request context
- See [isr-ssr.md](./isr-ssr.md) for ISR/SSR support