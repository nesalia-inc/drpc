# Architecture

## 2. Architecture

This document describes the request flow and route mapping for the `@deessejs/server-next` package.

## 2.1 Request Flow

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

## 2.2 Hono Relationship

```
@deessejs/server → @deessejs/server-hono → @deessejs/server-next
                                      ↑
                                      └── uses Hono internally via handle()
```

The `@deessejs/server-next` package uses Hono internally via `handle()` from `hono/vercel`. This provides a consistent adapter pattern across different server runtimes.

## 2.3 Route Mapping

| HTTP Method | Path | Procedure | Args Source |
|-------------|------|-----------|-------------|
| GET | `/api/drpc/users/list` | `users.list` | URL search params |
| GET | `/api/drpc/users/get?id=1` | `users.get` | URL search params |
| POST | `/api/drpc/users/create` | `users.create` | JSON body |
| PUT | `/api/drpc/users/update` | `users.update` | JSON body |
| PATCH | `/api/drpc/users/patch` | `users.patch` | JSON body |
| DELETE | `/api/drpc/users/delete` | `users.delete` | JSON body |

## Related Files

- [API](./api.md) - Learn about the proposed API
- [Error Mapping](./error-mapping.md) - Learn about HTTP status mapping