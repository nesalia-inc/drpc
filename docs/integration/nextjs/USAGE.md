# Usage Patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                                │
│                  fetch("/api/drpc", {...})                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js Route Handler                          │
│         toNextJsHandler(client) - app/api/drpc/route.ts    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  @deessejs/drpc                              │
│                                                             │
│  drpc = createAPI({...})     - Full API (server-only)       │
│  client = createClient(drpc) - Public API (exposed via HTTP) │
└─────────────────────────────────────────────────────────────┘
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `createAPI()` | Creates full API with all operations (internal + public) |
| `createClient()` | Creates client-safe API (filters internal operations) |
| `toNextJsHandler()` | Exposes client API via Next.js route handler |

## Server Components

Use the full `drpc` API to access all operations including internal ones:

```typescript
// app/admin/page.tsx (Server Component)
import { drpc } from "@/server/drpc"

export default async function AdminPage() {
  // Can call ALL operations directly
  const user = await drpc.users.get({ id: 1 })
  const users = await drpc.users.list({ limit: 10 })
  const stats = await drpc.users.getAdminStats({})  // ✅ Internal works
  await drpc.users.delete({ id: 1 })                  // ✅ Internal works

  return <Dashboard stats={stats} />
}
```

## Client Components (Browser)

From the browser, call procedures via HTTP through the route handler:

```typescript
// app/components/UserList.tsx (Client Component)
"use client"

// Browser-side: call via HTTP fetch
const result = await fetch("/api/drpc/users.get", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ args: { id: 1 } }),
})

const response = await result.json()
// response: { ok: true, value: { id: 1, name: "John", ... } }
```

The `client` API is passed to `toNextJsHandler()` in the route handler, which:
- Exposes public operations (`query`, `mutation`) via HTTP
- Filters out internal operations (`internalQuery`, `internalMutation`)

## With Authentication

You can combine multiple route handlers in the same Next.js application:

```typescript
// app/api/auth/[...route]/route.ts - better-auth
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { POST, GET } = toNextJsHandler(auth)
```

```typescript
// app/api/drpc/route.ts - drpc
import { client } from "@/server/drpc"
import { toNextJsHandler } from "@deessejs/drpc-next"

export const { POST, GET } = toNextJsHandler(client)
```

## CRUD Examples

### List with Pagination

```typescript
// Query
const users = await client.users.list({
  limit: 10,
  offset: 0,
})

if (users.ok) {
  console.log(users.value) // { items: [...], total: 100 }
}
```

### Get Single Resource

```typescript
// Query
const user = await client.users.get({ id: 1 })

if (user.ok) {
  console.log(user.value.name) // "John"
} else {
  console.error(user.error.message) // "User not found"
}
```

### Create Resource

```typescript
// Mutation
const result = await client.users.create({
  name: "John",
  email: "john@example.com",
})

if (result.ok) {
  console.log(result.value.id) // 123
}
```

### Update Resource

```typescript
// Mutation
const result = await client.users.update({
  id: 1,
  name: "Jane",
})

if (result.ok) {
  console.log(result.value.name) // "Jane"
}
```

### Delete Resource

```typescript
// Mutation
const result = await client.users.delete({ id: 1 })

if (result.ok) {
  console.log(result.value.success) // true
}
```

### Search

```typescript
// Query
const users = await client.users.search({
  query: "john",
  limit: 5,
})

if (users.ok) {
  console.log(users.value) // [...]
}
```

## Error Handling

```typescript
const result = await client.users.create({
  email: "invalid-email",
})

if (!result.ok) {
  switch (result.error.code) {
    case "VALIDATION_ERROR":
      console.log("Invalid input")
      break
    case "DUPLICATE":
      console.log("Email already exists")
      break
    default:
      console.log("Unknown error")
  }
}
```

## See Also

- [SETUP.md](./SETUP.md) - Complete setup guide
- [API.md](./API.md) - API reference
- [SECURITY.md](./SECURITY.md) - Security best practices
