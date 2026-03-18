# React Hooks Features

This folder contains analysis and proposed implementations for `@deessejs/server/react` features, comparing with TanStack Query.

## Overview

[`TANSTACK_QUERY_ANALYSIS.md`](TANSTACK_QUERY_ANALYSIS.md) provides a comprehensive overview of TanStack Query features and what is currently implemented or missing in `@deessejs/server/react`.

## Current Features

- Basic `useQuery` and `useMutation`
- Server-driven cache invalidation
- Cache key management via `keys` / `invalidate`
- Manual cache manipulation via `useQueryClient`
- Basic SSR hydration
- Dependent queries (`enabled` option)

## Proposed Features

### High Priority

| Feature | File | Description |
|---------|------|-------------|
| Infinite Queries | [`INFINITE_QUERIES.md`](INFINITE_QUERIES.md) | Pagination with infinite scrolling |
| Optimistic Updates | [`OPTIMISTIC_UPDATES.md`](OPTIMISTIC_UPDATES.md) | Immediate UI updates with rollback |
| DevTools | [`DEVTOOLS.md`](DEVTOOLS.md) | Visual debugging interface |
| Cache Persistence | [`CACHE_PERSISTENCE.md`](CACHE_PERSISTENCE.md) | Offline support, localStorage/IndexedDB |

### Medium Priority

| Feature | File | Description |
|---------|------|-------------|
| Background Refetch | [`BACKGROUND_REFETCH.md`](BACKGROUND_REFETCH.md) | Auto-refresh on interval/focus/reconnect |
| Placeholder Data | [`PLACEHOLDER_DATA.md`](PLACEHOLDER_DATA.md) | Temporary data while loading |
| Mutation State | [`MUTATION_STATE.md`](MUTATION_STATE.md) | Track multiple mutations |
| Retry Logic | [`RETRY_LOGIC.md`](RETRY_LOGIC.md) | Automatic retry with backoff |

## Architecture Difference

### TanStack Query (Client-Driven)

```
Client → Query Key → Fetch → Cache → Notify
         ↑
    Client decides what to invalidate
```

### @deessejs/server/react (Server-Driven)

```
Server Query → Returns Keys → Client Cache → Auto-invalidate
                              ↑
    Server decides what to invalidate
```

The server-driven approach simplifies the API but limits some advanced use cases.

## Usage

```typescript
import { useQuery, useMutation } from "@deessejs/server/react"

// Query with auto-cache
const { data } = useQuery(api.users.list, {
  args: { limit: 10 },
})

// Mutation with auto-invalidation
const { mutate } = useMutation(api.users.create)
await mutate({ name: "John" })
// Automatically refetches related queries
```

## See Also

- [Documentation](../README.md)
- [SPEC.md](../SPEC.md)
- [Client System](../features/CLIENT.md)
- [React Integration](../integration/REACT_HOOKS.md)
