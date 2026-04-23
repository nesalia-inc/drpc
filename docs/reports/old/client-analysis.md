# Client Analysis Report: `@deessejs/client`

**Date**: 2026-04-09
**Status**: Analyzed - Ready for implementation

---

## 1. Concept

### What is `@deessejs/client`?

`@deessejs/client` is a type-safe HTTP client for consuming `@deessejs/server` APIs from any JavaScript/TypeScript environment (browsers, Node.js, mobile apps). It provides end-to-end type safety by sharing the `AppRouter` type between server and client, similar to tRPC's client-server contract.

The client transforms procedure calls like `api.users.get({ id: 1 })` into HTTP requests following the Deesse RPC protocol, then returns typed results with proper error handling via `@deessejs/fp` Result types.

### Core Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Type-safe procedure calls** | Proxy-based API that preserves server types |
| **HTTP transport** | Maps procedures to REST endpoints |
| **Error handling** | Returns `Result<Output>` for exhaustive error handling |
| **React integration** | TanStack Query hooks for data fetching |
| **Caching** | Server-driven cache invalidation |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      @deessejs/client                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     ClientProxy                             │ │
│  │  api.users.get({ id: 1 }) → HTTP GET /users/get?id=1       │ │
│  │  api.users.create({ name }) → HTTP POST /users/create      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    HTTP Transport                           │ │
│  │  fetch/axios with JSON serialization                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @deessejs/server-http                        │
│  (Hono, Express, Next.js Route Handlers, etc.)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      @deessejs/server                           │
│  api.execute("users.get", { id: 1 }) → Result<User>            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Type Sharing Strategy

The key to type-safety is sharing the `AppRouter` type:

```
Server                                  Client
──────                                  ──────
defineContext<Ctx>({...})          ──→  createClient<AppRouter>(...)
      │                                    │
      ▼                                    ▼
t.router({                           Proxy API preserves
  users: t.router({                     types from AppRouter
    get: t.query({...}),
    create: t.mutation({...}),
  }),
})
      │
      ▼
AppRouter type ──────────────────────── AppRouter type (imported)
```

### 2.3 Result Response Protocol

The HTTP protocol uses a consistent JSON envelope:

```typescript
// Success response
{ "ok": true, "value": { "id": 1, "name": "John" } }

// Error response
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "User not found" } }
```

---

## 3. HTTP Transport Implementation

### 3.1 Path to Procedure Mapping

| HTTP Method | Path | Procedure | Args Source |
|-------------|------|-----------|-------------|
| GET | `/users/get?id=1` | `users.get` | URL search params |
| POST | `/users/create` | `users.create` | JSON body |
| PUT | `/users/update` | `users.update` | JSON body |
| PATCH | `/users/patch` | `users.patch` | JSON body |
| DELETE | `/users/delete` | `users.delete` | JSON body |

### 3.2 HTTP Method to Procedure Type

| HTTP Method | Procedure Type | Rationale |
|-------------|---------------|-----------|
| GET | `query` | Idempotent, cacheable |
| POST | `mutation` | Non-idempotent operations |
| PUT/PATCH/DELETE | `mutation` | Data modification |

### 3.3 Transport Interface

```typescript
interface Transport {
  request(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    args: Record<string, unknown>
  ): Promise<Result<unknown>>;
}
```

### 3.4 Default Fetch Transport

```typescript
class FetchTransport implements Transport {
  constructor(private baseUrl: string) {}

  async request(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    args: Record<string, unknown>
  ): Promise<Result<unknown>> {
    const url = new URL(`${this.baseUrl}/${path}`);

    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method === "GET") {
      url.searchParams.forEach((value, key) => args[key] = value);
    } else {
      options.body = JSON.stringify(args);
    }

    const response = await fetch(url.toString(), options);
    return response.json();
  }
}
```

---

## 4. Proposed API

### 4.1 Basic Client Usage

```typescript
import { createClient } from "@deessejs/client";
import type { AppRouter } from "@deessejs/server";

// Create typed client
const client = createClient<AppRouter>({
  baseUrl: "http://localhost:3000/api",
});

// Execute procedure
const result = await client.users.get({ id: 1 });

if (result.ok) {
  console.log(result.value); // Typed as User
} else {
  console.error(result.error); // Typed error
}
```

### 4.2 Direct Path Execution

```typescript
// Using execute() for dynamic procedure calls
const result = await client.execute("users.get", { id: 1 });
```

### 4.3 With TanStack Query (React)

```typescript
import { createQueryClient, createQuery, createMutation } from "@deessejs/client-react";
import { QueryClient } from "@tanstack/react-query";

// Setup
const queryClient = new QueryClient();

// Create query hook
const useUser = createQuery(queryClient, {
  queryFn: (args: { id: number }) => client.users.get(args),
  queryKey: ["users", "get", args],
});

// Create mutation hook
const useCreateUser = createMutation(queryClient, {
  mutationFn: (args: { name: string; email: string }) => client.users.create(args),
  onSuccess: () => {
    // Server-driven cache invalidation
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
});

// Usage in component
function UserProfile({ id }: { id: number }) {
  const { data, isLoading } = useUser({ id });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Not found</div>;

  return <div>{data.name}</div>;
}

function CreateUser() {
  const mutation = useCreateUser();

  const handleSubmit = async (name: string, email: string) => {
    await mutation.mutateAsync({ name, email });
  };

  return <button onClick={() => handleSubmit("John", "john@example.com")}>Create</button>;
}
```

---

## 5. Package Structure

### 5.1 `@deessejs/client`

Core HTTP client with proxy-based procedure access.

```
package/client/
├── src/
│   ├── index.ts                 # Main exports
│   ├── create-client.ts         # createClient() factory
│   ├── client-proxy.ts           # Proxy handler for route access
│   ├── transport.ts             # Transport interface
│   ├── fetch-transport.ts       # Default fetch implementation
│   ├── execute.ts               # execute(path, args) function
│   └── types.ts                 # Client types
├── package.json
└── tsconfig.json
```

### 5.2 `@deessejs/client-react`

React integration with TanStack Query.

```
package/client-react/
├── src/
│   ├── index.ts                 # Main exports
│   ├── create-query-client.ts   # QueryClient setup
│   ├── create-query.ts          # createQuery() hook factory
│   ├── create-mutation.ts       # createMutation() hook factory
│   ├── use-query.ts             # useQuery wrapper
│   ├── use-mutation.ts          # useMutation wrapper
│   ├── types.ts                 # React-specific types
│   └── utils.ts                 # Query key generation, etc.
├── package.json
└── tsconfig.json
```

### 5.3 Exports

```typescript
// @deessejs/client
export {
  createClient,
  createTransport,
  createFetchTransport,
};

// @deessejs/client-react
export {
  createQueryClient,
  createQuery,
  createMutation,
};
```

---

## 6. Key Design Decisions

### 6.1 Proxy-Based API vs Execute-Only

| Approach | Pros | Cons |
|----------|------|------|
| **Proxy-based (chosen)** | Type-safe IDE autocomplete, familiar API | Requires complex Proxy implementation |
| Execute-only | Simple, flexible | Loses type inference on property access |

**Decision**: Proxy-based approach is chosen for superior DX (similar to tRPC, axios).

### 6.2 Result Type Preservation

The client returns `Result<Output>` from `@deessejs/fp` to maintain consistency with server behavior and enable exhaustive error handling:

```typescript
// Server handler returns
return ok(user) or return err({ code: "NOT_FOUND" });

// Client receives same Result type
const result = await client.users.get({ id: 1 });
if (result.ok) {
  // result.value is typed
} else {
  // result.error is typed
}
```

### 6.3 TanStack Query Integration Pattern

Rather than wrapping TanStack Query entirely, `@deessejs/client-react` provides factory functions that create properly configured hooks:

```typescript
// Factory pattern (chosen)
const useUser = createQuery(queryClient, {
  queryFn: (args) => client.users.get(args),
  queryKey: ["users", "get", args],
});

// Direct wrapper (alternative)
const useUser = useDeesseQuery(queryClient, "users.get", { id: 1 });
```

**Decision**: Factory pattern provides better type inference and more control.

### 6.4 Separate React Package

| Decision | Rationale |
|----------|----------|
| **Separate `@deessejs/client-react`** | React-specific code should not bloat core client |
| **Peer dependency on `@deessejs/client`** | Client core is framework-agnostic |

---

## 7. Caching Strategy

### 7.1 Server-Driven Cache Invalidation

The server can emit invalidation events that the client listens to:

```typescript
// Server: Define event
const appRouter = t.router({
  users: t.router({
    create: t.mutation({
      handler: async (ctx, args) => {
        const user = await ctx.db.users.create(args);
        ctx.send("users.invalidate", { id: user.id });
        return ok(user);
      }
    }),
  }),
});

// Client: Listen and invalidate
const queryClient = createQueryClient(client, {
  listeners: {
    "users.invalidate": ({ queryKey }) => {
      queryClient.invalidateQueries({ queryKey });
    },
  },
});
```

### 7.2 Query Key Generation

Query keys mirror the procedure path:

```typescript
// Procedure: users.get with args { id: 1 }
// Query key: ["users", "get", { id: 1 }]

function generateQueryKey(path: string, args: unknown): string[] {
  const [namespace, procedure] = path.split(".");
  return [namespace, procedure, args];
}
```

### 7.3 Default Cache Times

| Procedure Type | Default Cache | Rationale |
|---------------|---------------|-----------|
| `query` | 5 minutes | Queries are typically stable |
| `mutation` | No cache | Mutations modify data |

---

## 8. React Integration (TanStack Query)

### 8.1 createQuery Factory

```typescript
function createQuery<TArgs, TOutput>(
  queryClient: QueryClient,
  config: {
    queryFn: (args: TArgs) => Promise<Result<TOutput>>;
    queryKey?: string[];
    staleTime?: number;
    gcTime?: number;
  }
): (args: TArgs) => UseQueryResult<TOutput> {
  return (args: TArgs) => {
    const queryKey = config.queryKey ?? generateQueryKeyFromArgs(args);

    return useQuery({
      queryKey,
      queryFn: () => config.queryFn(args),
      staleTime: config.staleTime ?? 5 * 60 * 1000,
      gcTime: config.gcTime ?? 10 * 60 * 1000,
    });
  };
}
```

### 8.2 createMutation Factory

```typescript
function createMutation<TArgs, TOutput>(
  queryClient: QueryClient,
  config: {
    mutationFn: (args: TArgs) => Promise<Result<TOutput>>;
    onSuccess?: (data: TOutput) => void;
    onError?: (error: AppError) => void;
    onSettled?: (data?: TOutput, error?: AppError) => void;
  }
): UseMutationResult<TOutput, AppError, TArgs> {
  return useMutation({
    mutationFn: config.mutationFn,
    onSuccess: config.onSuccess,
    onError: config.onError,
    onSettled: config.onSettled,
  });
}
```

---

## 9. Type Sharing Strategy

### 9.1 The AppRouter Type

The `AppRouter` type is defined once on the server and shared with the client:

```typescript
// shared/types.ts
import type { Router } from "@deessejs/server";

export type AppRouter = Router<Ctx, {
  users: Router<Ctx, {
    get: Query<Ctx, { id: number }, User>;
    create: Mutation<Ctx, { name: string; email: string }, User>;
    list: Query<Ctx, void, User[]>;
  }>;
  posts: Router<Ctx, {
    get: Query<Ctx, { id: number }, Post>;
    create: Mutation<Ctx, { title: string; content: string }, Post>;
  }>;
}>;
```

### 9.2 Type Flow

```
Server defines AppRouter
        │
        ▼
Exports AppRouter type ───────────────────────┐
        │                                     │
        ▼                                     │ (via workspace or npm package)
createAPI({ router: appRouter })              │
        │                                     │
        ▼                                     ▼
PublicAPIInstance ──────────────────> Client imports AppRouter type
                                              │
                                              ▼
                                    createClient<AppRouter>({ baseUrl })
                                              │
                                              ▼
                                    client.users.get({ id: 1 })
                                              │
                                              ▼
                                    Result<User> with full type safety
```

### 9.3 Workspace Type Sharing

For monorepos, the AppRouter can be shared via workspace references:

```json
// package/client/package.json
{
  "dependencies": {
    "@acme/shared": "workspace:*"
  }
}
```

```typescript
// package/client/src/index.ts
import type { AppRouter } from "@acme/shared";
export { type AppRouter };
```

---

## 10. Implementation Phases

### Phase 1: Core Client (2-3 days)

- [ ] Create `package/client` structure
- [ ] Implement `FetchTransport` class
- [ ] Implement `ClientProxy` with Proxy handler
- [ ] Implement `createClient()` factory
- [ ] Add `execute()` method for dynamic calls
- [ ] TypeScript type definitions

### Phase 2: React Integration (2 days)

- [ ] Create `package/client-react` structure
- [ ] Implement `createQueryClient()`
- [ ] Implement `createQuery()` factory
- [ ] Implement `createMutation()` factory
- [ ] Server-driven invalidation listener

### Phase 3: Advanced Features (2-3 days)

- [ ] Batch requests support
- [ ] Retry logic with backoff
- [ ] Request/response interceptors
- [ ] Offline support with persisted queries

### Phase 4: Additional Transports (1-2 days)

- [ ] Node.js http transport
- [ ] XMLHttpRequest transport (legacy browsers)
- [ ] Mock transport for testing

---

## 11. Dependencies

### `@deessejs/client`

| Dependency | Type | Purpose |
|------------|------|---------|
| `@deessejs/fp` | peer | Result type for error handling |
| `@deessejs/server` | peer | AppRouter type only (no runtime dep) |

### `@deessejs/client-react`

| Dependency | Type | Purpose |
|------------|------|---------|
| `@deessejs/client` | peer | Core client |
| `@tanstack/react-query` | peer | React Query core |
| `@deessejs/fp` | peer | Result type |

### DevDependencies

| Dependency | Purpose |
|------------|---------|
| `typescript` | Type checking |
| `vitest` | Unit tests |
| `@testing-library/react` | Component tests |

---

## 12. Next Steps

1. **Create the `@deessejs/client` package** with basic HTTP transport
2. **Implement the proxy handler** for type-safe procedure access
3. **Add TanStack Query integration** in `@deessejs/client-react`
4. **Create example usage** in `examples/client-react/`
5. **Write comprehensive tests** for both packages
6. **Document the type sharing pattern** for monorepo setups

---

## Appendix A: API Reference

### createClient()

```typescript
function createClient<TRouter extends Router>(
  config: {
    baseUrl: string;
    transport?: Transport;
  }
): ClientInstance<TRouter>;

type ClientInstance<TRouter extends Router> = {
  [K in keyof TRouter]: TRouter[K] extends Router<infer Ctx, infer Routes>
    ? ClientInstance<Routes>
    : TRouter[K] extends Procedure<infer Ctx, infer Args, infer Output>
      ? (args: Args) => Promise<Result<Output>>
      : never;
} & {
  execute: (path: string, args: unknown) => Promise<Result<unknown>>;
};
```

### createQuery()

```typescript
function createQuery<TArgs, TOutput>(
  queryClient: QueryClient,
  config: {
    queryFn: (args: TArgs) => Promise<Result<TOutput>>;
    queryKey?: string[];
    staleTime?: number;
    gcTime?: number;
  }
): (args: TArgs) => UseQueryResult<TOutput>;
```

### createMutation()

```typescript
function createMutation<TArgs, TOutput>(
  queryClient: QueryClient,
  config: {
    mutationFn: (args: TArgs) => Promise<Result<TOutput>>;
    onSuccess?: (data: TOutput) => void;
    onError?: (error: AppError) => void;
    onSettled?: (data?: TOutput, error?: AppError) => void;
  }
): UseMutationResult<TOutput, AppError, TArgs>;
```

---

## Appendix B: Error Handling Pattern

```typescript
import { createClient } from "@deessejs/client";
import { isErr, match } from "@deessejs/fp";

const client = createClient<AppRouter>({ baseUrl: "http://localhost:3000" });

// Pattern 1: Check ok property
const result = await client.users.get({ id: 1 });
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error.code);
}

// Pattern 2: Use isErr helper
if (isErr(result)) {
  console.error(result.error);
}

// Pattern 3: Pattern matching (if using @deessejs/fp match)
match(result, {
  ok: (value) => renderUser(value),
  err: (error) => renderError(error.code),
});
```
