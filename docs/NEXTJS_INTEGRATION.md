# Next.js Integration Guide

## Overview

This guide covers how `@deessejs/server` integrates with Next.js features like Server Functions, caching, revalidation, and navigation.

## Server Functions Integration

### Current Architecture

`@deessejs/server` works by exposing queries and mutations via HTTP through a route handler:

```typescript
// app/api/deesse/[...slug]/route.ts
import { createRouteHandler } from "@deessejs/server/next"
import { clientApi } from "@/server/api"

export const POST = createRouteHandler(clientApi)
```

This creates an HTTP endpoint that accepts requests and returns responses. All communication happens via `fetch`.

### Comparison with Native Server Functions

| Feature | Native Server Functions | @deessejs |
|---------|----------------------|-----------|
| `action={}` on forms | ✅ Yes | ❌ No (uses fetch) |
| `useActionState` | ✅ Yes | ❌ No |
| `useFormStatus` | ✅ Yes | ❌ No |
| Automatic form handling | ✅ Yes | ❌ No |
| `onClick` server calls | ✅ Yes | ✅ Yes |
| Type safety | ⚠️ Manual | ✅ Automatic |

### Calling from Client Components

Currently, you call `@deessejs` operations from client components using `fetch`:

```typescript
// Client component
"use client"

import { clientApi } from "@/server/api"

function UserList() {
  const [users, setUsers] = useState([])

  const refresh = async () => {
    const result = await clientApi.users.list({})
    if (result.ok) {
      setUsers(result.value)
    }
  }

  return (
    <button onClick={refresh}>Refresh</button>
  )
}
```

## Caching and Revalidation

### Built-in Cache Integration

`@deessejs` provides a custom cache system integrated with the return values:

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return ok(user, { keys: [["users", { id: args.id }]] })
  }
})

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user, { invalidate: ["users"] })
  }
})
```

### Next.js Cache API

Next.js provides additional caching primitives that can be used alongside `@deessejs`:

#### Using revalidateTag

```typescript
import { revalidateTag } from "next/cache"

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)

    // Revalidate Next.js cache
    revalidateTag("users", "max")

    return ok(user)
  }
})
```

#### Using revalidatePath

```typescript
import { revalidatePath } from "next/cache"

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)

    // Revalidate specific path
    revalidatePath("/users", "page")

    return ok(user)
  }
})
```

### Recommended Pattern

Combine both systems for optimal caching:

```typescript
const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    // 1. Create user in database
    const user = await ctx.db.users.create(args)

    // 2. Invalidate @deessejs cache (for React hooks)
    // This affects client-side cache used by useQuery/useMutation

    // 3. Revalidate Next.js cache (for Server Components)
    // This affects pages using fetch with tags
    revalidateTag("users", "max")
    revalidatePath("/users", "page")

    return ok(user, { invalidate: ["users"] })
  }
})
```

## Cookies and Headers

### Accessing Cookies

You can access cookies in your handlers using Next.js cookies API:

```typescript
import { cookies } from "next/headers"

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("session")?.value

    if (!sessionToken) {
      return err({ code: "UNAUTHORIZED", message: "No session" })
    }

    const user = await ctx.db.users.findBySession(sessionToken)
    if (!user) {
      return err({ code: "UNAUTHORIZED", message: "Invalid session" })
    }

    return ok(user)
  }
})
```

### Setting Cookies

```typescript
const login = t.mutation({
  args: z.object({ email: z.string(), password: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.authenticate(args.email, args.password)

    if (!user) {
      return err({ code: "INVALID_CREDENTIALS" })
    }

    const session = await ctx.db.sessions.create(user.id)

    // Set cookie using Next.js API
    const cookieStore = await cookies()
    cookieStore.set("session", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7 // 1 week
    })

    return ok(user)
  }
})
```

### Accessing Headers

```typescript
const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // Access headers through the context
    const userAgent = ctx.headers.get("user-agent")
    const forwardedFor = ctx.headers.get("x-forwarded-for")

    // Log analytics
    await ctx.db.analytics.log({
      type: "user_view",
      userAgent,
      ip: forwardedFor
    })

    const user = await ctx.db.users.find(args.id)
    if (!user) {
      return err({ code: "NOT_FOUND" })
    }

    return ok(user)
  }
})
```

## Redirect

### Using redirect in Handlers

You can redirect users after mutations:

```typescript
import { redirect } from "next/navigation"

const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)

    // Redirect to user profile
    redirect(`/users/${user.id}`)

    return ok(user) // This won't be reached
  }
})
```

### Returning Redirect Response

For API responses, you might want to return a redirect indicator:

```typescript
const login = t.mutation({
  args: z.object({ email: z.string(), password: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.authenticate(args.email, args.password)

    if (!user) {
      return err({ code: "INVALID_CREDENTIALS" })
    }

    // Return redirect info in response
    return ok({
      user,
      redirect: "/dashboard"
    })
  }
})
```

Then handle it on the client:

```typescript
const LoginForm = () => {
  const [result, mutate, pending] = useMutation(api.auth.login)

  useEffect(() => {
    if (result?.ok && result.value.redirect) {
      window.location.href = result.value.redirect
    }
  }, [result])

  // ...
}
```

## Server Components (RSC)

### Calling from Server Components

Server Components can call the API directly without HTTP:

```typescript
// app/users/page.tsx (Server Component)
import { api } from "@/server/api"

export default async function UsersPage() {
  // Direct call - no HTTP needed
  const result = await api.users.list({})

  if (!result.ok) {
    return <div>Error: {result.error.message}</div>
  }

  return (
    <ul>
      {result.value.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### Using with Client Components

Pass data from Server Components to Client Components:

```typescript
// app/users/page.tsx (Server Component)
import { api } from "@/server/api"
import { UserList } from "@/components/UserList"

export default async function UsersPage() {
  const result = await api.users.list({})

  return <UserList initialUsers={result.ok ? result.value : []} />
}

// app/components/UserList.tsx (Client Component)
"use client"

import { useQuery } from "@deessejs/server/react"
import { clientApi } from "@/server/api"

export function UserList({ initialUsers }) {
  const { data } = useQuery(clientApi.users.list, {
    initialData: initialUsers
  })

  return (
    <ul>
      {data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

## Dynamic Routes

### Accessing Route Parameters

```typescript
// app/users/[id]/page.tsx (Server Component)
import { api } from "@/server/api"

export default async function UserPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await api.users.get({ id: Number(id) })

  if (!result.ok) {
    return <div>User not found</div>
  }

  return <div>{result.value.name}</div>
}
```

## Environment Variables

### Server-Side Only

Environment variables starting with `NEXT_PUBLIC_` are exposed to the client. Keep sensitive data private:

```typescript
// Server-side only - NOT exposed to client
const apiKey = process.env.API_KEY

// Exposed to client
const publicUrl = process.env.NEXT_PUBLIC_API_URL
```

## Best Practices

### 1. Separate Server and Client APIs

```typescript
// server/api.ts
import { createAPI, createPublicAPI } from "@/server"

const api = createAPI({
  router: t.router({
    users: t.router({
      get: getUser,
      create: createUser,
      // Internal - server only
      delete: deleteUser,
      adminStats: getAdminStats,
    }),
  }),
})

// Client-safe API
export const clientApi = createPublicAPI(api)

// Full API for server
export { api }
```

### 2. Use Internal Operations for Sensitive Actions

```typescript
// Internal operations are never exposed via HTTP
const deleteUser = t.internalMutation({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    // This can ONLY be called from server code
    await ctx.db.users.delete(args.id)
    return ok({ success: true })
  }
})

// Call from Server Component
// app/admin/users/page.tsx
import { api } from "@/server/api"

export default async function AdminPage() {
  const deleteUserAction = async (id: number) => {
    "use server"
    await api.users.delete({ id })
    revalidatePath("/admin/users")
  }

  // ...
}
```

### 3. Handle Errors Consistently

```typescript
const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.users.create(args)
      revalidateTag("users")
      return ok(user)
    } catch (error) {
      if (error.code === "UNIQUE_CONSTRAINT") {
        return err({
          code: "DUPLICATE_EMAIL",
          message: "A user with this email already exists"
        })
      }
      return err({
        code: "INTERNAL_ERROR",
        message: "Failed to create user"
      })
    }
  }
})
```

### 4. Type-Safe Error Codes

Define error types for better type safety:

```typescript
import { defineErrors } from "@deessejs/server"

const errors = defineErrors({
  NOT_FOUND: { message: "Resource not found" },
  UNAUTHORIZED: { message: "Authentication required" },
  FORBIDDEN: { message: "Permission denied" },
  DUPLICATE_EMAIL: { message: "Email already exists" },
  VALIDATION_ERROR: { message: "Invalid input" },
})

// Usage
return err(errors.NOT_FOUND)
```

## Migration from Server Actions

If you're migrating from native Server Actions:

### Before (Server Actions)

```typescript
// app/actions.ts
"use server"

import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string

  await db.users.create({ name })

  revalidateTag("users")
  redirect("/users")
}
```

### After (@deessejs)

```typescript
// server/api.ts
const createUser = t.mutation({
  args: z.object({ name: z.string() }),
  handler: async (ctx, args) => {
    await ctx.db.users.create(args)
    revalidateTag("users", "max")
    return ok({ redirect: "/users" })
  }
})

// Client component
"use client"

import { clientApi } from "@/server/api"

function CreateUserForm() {
  const { mutate } = useMutation(clientApi.users.create)

  const handleSubmit = async (formData: FormData) => {
    const result = await mutate({ name: formData.get("name") as string })
    if (result.ok && result.value.redirect) {
      window.location.href = result.value.redirect
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  )
}
```

## Future Considerations

- **Server Action Generation**: Auto-generate Server Actions from mutations
- **useActionState Integration**: Support React 19's useActionState
- **useFormStatus Integration**: Support useFormStatus for pending states
- **Native Form Handling**: Support `action={}` prop directly
- **Direct cookies()**: Access via ctx.cookies() instead of importing
- **Direct redirect()**: Access via ctx.redirect() instead of importing
