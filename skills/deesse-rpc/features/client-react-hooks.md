---
name: client-react-hooks
description: Documentation for @deessejs/client-react hooks. Use when implementing client-side data fetching with deesse RPC.
---

# @deessejs/client-react Hooks

Type-safe React hooks for consuming deesse RPC APIs, built on top of TanStack Query (React Query).

## Overview

`@deessejs/client-react` provides two ways to consume typed RPC procedures:

1. **`createClient`** - Creates a type-safe client proxy where hooks are accessed via `client.route.subRoute.useQuery()` / `client.route.subRoute.useMutation()`
2. **`createQuery` / `createMutation`** - Standalone factory functions that create hooks for specific routes

Both approaches are fully typed and integrate with TanStack Query for caching, background refetching, and state management.

## Installation

```bash
pnpm add @deessejs/client-react @tanstack/react-query
```

## createClient - Type-Safe Client Creation

The `createClient` function creates a fully typed proxy client from your server router type. Hooks are accessed through the proxy hierarchy.

```typescript
import { createClient } from "@deessejs/client-react"

// Define your transport (HTTP fetch)
const transport = {
  request: async (path: string, args: unknown): Promise<Response> => {
    return fetch(`/api/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args })
    })
  }
}

// Create typed client from your AppRouter type
const client = createClient<AppRouter>({ transport })

// Access hooks through the router hierarchy
client.users.list.useQuery({ limit: 10 })
client.users.create.useMutation()
```

### How createClient Works

The client uses JavaScript Proxy to create a hierarchical hook accessor:

```
client
  └── users
        ├── list.useQuery(args, config)
        ├── get.useQuery(args, config)
        └── create.useMutation(config)
  └── posts
        ├── list.useQuery(args, config)
        └── create.useMutation(config)
```

Each `.` in a route path creates a new level in the hierarchy. The final segment provides `useQuery` or `useMutation` hooks.

### Transport Interface

```typescript
interface Transport {
  request(path: string, args: unknown): Promise<Response>
}
```

The transport handles the actual HTTP communication. The `path` is the dot-joined route (e.g., `"users.list"`) and `args` are the procedure arguments.

### Route Path Resolution

Route paths in the server router are converted to nested proxy accessors:

| Server Route | Client Access |
|--------------|---------------|
| `users.list` | `client.users.list.useQuery()` |
| `users.get` | `client.users.get.useQuery()` |
| `posts.create` | `client.posts.create.useMutation()` |

## useQuery - Query Procedure Hook

Executes a query procedure and manages its cache lifecycle.

```typescript
const { data, isLoading, isError, error, refetch } = client.users.list.useQuery(
  { limit: 10 },  // args
  { staleTime: 5000 }  // config (optional)
)
```

### Signature

```typescript
function useQuery<TData = unknown>(
  args?: Record<string, unknown>,
  config?: QueryConfig<TData, TError> & {
    enabled?: boolean
    placeholderData?: TData | ((prev: TData | undefined) => TData | undefined)
  }
): UseQueryResult<TData, TError>
```

### QueryConfig

```typescript
interface QueryConfig<TData, TError> {
  queryKey?: unknown[]           // Custom cache key
  queryOptions?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">
}
```

### Return Value (TanStack Query)

The hook returns a TanStack Query result object:

```typescript
{
  data: TData | undefined         // The fetched data
  error: TError | null           // Error if request failed
  isError: boolean               // True if error occurred
  isLoading: boolean             // True during initial load
  isFetching: boolean            // True whenever fetching (including background)
  isSuccess: boolean             // True if data was fetched successfully
  isPlaceholderData: boolean     // True if showing placeholder data
  refetch: () => Promise<void>   // Manually trigger refetch
  status: "loading" | "error" | "success" | "idle"
}
```

### Example with Full Options

```typescript
function UserList() {
  const { data, isLoading, isError, error, refetch } = client.users.list.useQuery(
    { limit: 10 },
    {
      enabled: true,
      staleTime: 60 * 1000,                    // 1 minute
      refetchOnWindowFocus: true,
      retry: 2,
      queryKey: ["custom", "users", "list"],
      queryOptions: {
        gcTime: 5 * 60 * 1000                  // 5 minutes cache
      }
    }
  )

  if (isLoading) return <Skeleton />
  if (isError) return <Error message={error?.message} />

  return (
    <div>
      {data?.map(user => <UserCard key={user.id} user={user} />)}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

## useMutation - Mutation Procedure Hook

Executes a mutation procedure (write operations).

```typescript
const { mutate, mutateAsync, isLoading, isError, error, data } = client.users.create.useMutation({
  onSuccess: (data) => {
    console.log("User created:", data)
  }
})
```

### Signature

```typescript
function useMutation<TData = unknown, TVariables = Record<string, unknown>>(
  config?: MutationConfig<TData, TError, TVariables> & {
    onMutate?: (variables: TVariables) => Promise<TData> | TData
    onError?: (error: Error, variables: TVariables, context?: unknown) => Promise<void> | void
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => Promise<void> | void
  }
): UseMutationResult<TData, TError, TVariables>
```

### MutationConfig

```typescript
interface MutationConfig<TData, TError, TVariables> {
  queryKey?: unknown[]           // Query keys to invalidate after success
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">
  queryClient?: QueryClient      // Custom query client (defaults to context)
}
```

### Return Value

```typescript
{
  mutate: (variables: TVariables) => void              // Fire and forget
  mutateAsync: (variables: TVariables) => Promise<TData>  // Returns promise
  data: TData | undefined                              // Response data
  error: TError | null                                 // Error if failed
  isError: boolean                                     // True if error occurred
  isLoading: boolean                                   // True during mutation
  isSuccess: boolean                                   // True if mutation succeeded
  status: "loading" | "error" | "success" | "idle"
  reset: () => void                                    // Reset mutation state
}
```

### Example

```typescript
function CreateUserForm() {
  const queryClient = useQueryClient()

  const { mutate, mutateAsync, isLoading, isError, error } = client.users.create.useMutation({
    onSuccess: () => {
      // After successful mutation, queries with queryKey ["users", "list"] are invalidated
      queryClient.invalidateQueries({ queryKey: ["users", "list"] })
    }
  })

  const handleSubmit = async (formData: { name: string; email: string }) => {
    try {
      const newUser = await mutateAsync(formData)
      console.log("Created user:", newUser)
    } catch (err) {
      console.error("Failed to create user:", err)
    }
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      handleSubmit({ name: "John", email: "john@example.com" })
    }}>
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create User"}
      </button>
      {isError && <p>Error: {error?.message}</p>}
    </form>
  )
}
```

### Automatic Query Invalidation

After a successful mutation, the client automatically invalidates queries with the same route path as the mutation. For example, `client.users.create.useMutation()` invalidates all queries starting with `["users", "create"]`.

## QueryClientProvider Setup

Wrap your application with `QueryClientProvider` to enable TanStack Query features.

```tsx
import { QueryClientProvider, QueryClient } from "@deessejs/client-react"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,       // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
})

function App({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### QueryClient Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `staleTime` | `0` | Time before data is considered stale |
| `gcTime` | `5 min` | Time before unused cache is garbage collected |
| `refetchOnWindowFocus` | `true` | Refetch when window regains focus |
| `refetchOnReconnect` | `true` | Refetch when network reconnects |
| `retry` | `3` | Number of retry attempts on error |
| `retryDelay` | exponential | Delay between retries |

## ErrorBoundary Integration

The package integrates with `react-error-boundary` for graceful error handling.

### Re-exports from react-error-boundary

```typescript
import { ErrorBoundary, useErrorBoundary, withErrorBoundary } from "@deessejs/client-react"
import type { ErrorBoundaryProps, FallbackProps } from "@deessejs/client-react"
```

### Basic ErrorBoundary Usage

```tsx
import { ErrorBoundary } from "react-error-boundary"
import { client } from "./client"

function Fallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback} onReset={() => window.location.reload()}>
      <UserList />
    </ErrorBoundary>
  )
}
```

### withErrorBoundary HOC

Wrap components to automatically catch errors:

```tsx
import { withErrorBoundary } from "@deessejs/client-react"

function UserProfile({ userId }) {
  const { data } = client.users.get.useQuery({ id: userId })
  return <div>{data?.name}</div>
}

// Wrap with error boundary
const UserProfileWithBoundary = withErrorBoundary(UserProfile, {
  FallbackComponent: ErrorFallback,
  onReset: () => {}
})
```

### useErrorBoundary Hook

Access error boundary state and reset function:

```tsx
import { useErrorBoundary } from "@deessejs/client-react"

function MyComponent() {
  const { showBoundary, resetBoundary } = useErrorBoundary()

  if (somethingWrong) {
    showBoundary(new Error("Something went wrong"))
  }

  return <div>Content</div>
}
```

### useQueryErrorBoundary

Automatically resets error boundary on query errors:

```typescript
import { useQueryErrorBoundary } from "@deessejs/client-react"

function UserList() {
  const { onError } = useQueryErrorBoundary()

  const { data } = client.users.list.useQuery(
    {},
    {
      queryOptions: {
        onError  // Automatically resets boundary on error
      }
    }
  )

  return <div>{data}</div>
}
```

### useMutationErrorBoundary

Automatically resets error boundary on mutation errors:

```typescript
import { useMutationErrorBoundary } from "@deessejs/client-react"

function CreateUserForm() {
  const { onError } = useMutationErrorBoundary()

  const { mutate } = client.users.create.useMutation({
    mutationOptions: {
      onError  // Automatically resets boundary on error
    }
  })

  return <button onClick={() => mutate({ name: "John" })}>Create</button>
}
```

## SSR / Hydration Support

The package re-exports TanStack Query's SSR utilities:

```typescript
import { dehydrate, hydrate, HydrationBoundary, useQueryClient } from "@deessejs/client-react"
import type { DehydratedState } from "@deessejs/client-react"
```

### Server-Side Prefetching

```tsx
// app/users/page.tsx (Next.js App Router)
import { dehydrate, HydrationBoundary } from "@deessejs/client-react"
import { QueryClient } from "@deessejs/client-react"
import { client } from "@/lib/client"

export default async function UsersPage() {
  const queryClient = new QueryClient()

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: ["users", "list", { limit: 10 }],
    queryFn: () => client.users.list.query({ limit: 10 })
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  )
}
```

### Manual Query Execution

```typescript
// Get query function for manual execution
const { data } = client.users.list.useQuery({ limit: 10 })

// If you need to call the query function directly (e.g., for SSR)
const result = await client.users.list.query({ limit: 10 })
```

## createQuery and createMutation (Alternative API)

For more explicit control, use the standalone factory functions:

### createQuery

```typescript
import { createQuery } from "@deessejs/client-react"

const useUserQuery = createQuery<UserRouter, User, Error>(
  client,                    // Typed client instance
  "users.get"               // Route path as string
)

// Usage
function UserProfile({ userId }: { userId: number }) {
  const { data, isLoading } = useUserQuery(
    { id: userId },
    { staleTime: 60000 }
  )

  if (isLoading) return <Skeleton />
  return <div>{data?.name}</div>
}
```

### createMutation

```typescript
import { createMutation } from "@deessejs/client-react"

const useCreateUser = createMutation<UserRouter, User, Error, { name: string; email: string }>(
  client,
  "users.create"
)

// Usage
function CreateUserForm() {
  const { mutate, isLoading } = useCreateUser({
    mutationOptions: {
      onSuccess: (data) => console.log("Created:", data)
    }
  })

  return <button onClick={() => mutate({ name: "John", email: "john@example.com" })}>Create</button>
}
```

## Full Usage Example

### 1. Server Router Definition

```typescript
// server/router.ts
import { defineContext, createAPI } from "@deessejs/server"
import { z } from "zod"

const { t, createAPI } = defineContext({
  context: { db: myDatabase }
})

const getUser = t.query({
  args: z.object({ id: z.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    if (!user) return err({ code: "NOT_FOUND", message: "User not found" })
    return ok(user)
  }
})

const listUsers = t.query({
  args: z.object({ limit: z.number().default(10) }),
  handler: async (ctx, args) => {
    return ok(await ctx.db.users.findMany({ limit: args.limit }))
  }
})

const createUser = t.mutation({
  args: z.object({ name: z.string(), email: z.string().email() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})

export const appRouter = createAPI({
  router: t.router({
    users: {
      get: getUser,
      list: listUsers,
      create: createUser
    }
  })
})

export type AppRouter = typeof appRouter
```

### 2. Client Setup

```typescript
// lib/client.ts
import { createClient } from "@deessejs/client-react"
import type { AppRouter } from "../server/router"

const transport = {
  request: async (path: string, args: unknown): Promise<Response> => {
    const response = await fetch("/api/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, args })
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response
  }
}

export const client = createClient<AppRouter>({ transport })
```

### 3. App Provider

```tsx
// app/providers.tsx
"use client"

import { QueryClientProvider, QueryClient } from "@deessejs/client-react"
import { ErrorBoundary } from "react-error-boundary"
import { ReactNode } from "react"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
})

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => {}}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
```

### 4. Using in Components

```tsx
// components/UserList.tsx
"use client"

import { client } from "../lib/client"

export function UserList() {
  const { data: users, isLoading, isError, error, refetch } = client.users.list.useQuery(
    { limit: 10 },
    { staleTime: 30000 }
  )

  if (isLoading) return <Skeleton count={5} />
  if (isError) return <Error message={error?.message} />

  return (
    <div>
      <h1>Users</h1>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.name} ({user.email})</li>
        ))}
      </ul>
    </div>
  )
}

// components/CreateUserForm.tsx
"use client"

import { useState } from "react"
import { client } from "../lib/client"

export function CreateUserForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const { mutate, isLoading, isError, error, isSuccess } = client.users.create.useMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    mutate({ name, email })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create User"}
      </button>
      {isError && <p>Error: {error?.message}</p>}
      {isSuccess && <p>User created successfully!</p>}
    </form>
  )
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Component                          │
│                                                                  │
│   const { data } = client.users.list.useQuery({ limit: 10 })   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     createClient Proxy                          │
│                                                                  │
│   Routes: client → users → list.useQuery()                      │
│                                                                  │
│   Path Resolution: ["users", "list"]                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Transport Layer                            │
│                                                                  │
│   transport.request("users.list", { limit: 10 })                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HTTP Request                               │
│                                                                  │
│   POST /api/rpc { path: "users.list", args: { limit: 10 } }     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     @deessejs/server                            │
│                                                                  │
│   1. Route matching (users.list)                                │
│   2. Args validation (Zod)                                      │
│   3. Handler execution                                          │
│   4. Context injection                                          │
│   5. Response serialization                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TanStack Query                              │
│                                                                  │
│   Cache Management:                                             │
│   - Query Key: ["users", "list", { limit: 10 }]                │
│   - Stale Time: 60s                                             │
│   - Garbage Collection: 5min                                    │
│                                                                  │
│   Automatic Invalidation:                                        │
│   - After mutation success → refetch affected queries          │
└─────────────────────────────────────────────────────────────────┘
```

## See Also

- [Queries](../queries.md) - Server-side query procedure definition
- [Mutations](../mutations.md) - Server-side mutation procedure definition
- [Cache System](../cache-system.md) - Cache invalidation and key management
- [Error Handling](../error-handling.md) - Error types and HTTP status mapping
- [Next.js Integration](../nextjs-integration.md) - Framework-specific setup
