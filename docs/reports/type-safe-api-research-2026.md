# Type-Safe API Research Report: Beyond tRPC

Date: 2026-04-27
Author: Senior Analysis
Status: Complete

## Executive Summary

This report analyzes state-of-the-art approaches for type-safe API frameworks beyond tRPC, with a focus on URL query parameter handling. Research examined oRPC, Hono RPC, ElysiaJS Eden, zodix, and emerging 2026 API patterns.

**Key Finding:** The industry is moving toward schema-aware coercion patterns rather than naive string-to-type conversion. Hono RPC and zodix provide the most relevant patterns for @deessejs/server.

---

## 1. Problem Context

### Current Issue in @deessejs/server

URL query parameters arrive as strings (`"?limit=20"` → `{ limit: ['20'] }`) and fail Zod validation because `z.number()` expects actual numbers, not string representations.

### Root Cause

1. Client sends URL params as strings
2. Hono's `c.req.queries()` returns `Record<string, string[]>`
3. No coercion layer exists before Zod validation

---

## 2. Industry Research

### 2.1 oRPC

**Repository:** [orpc.io](https://orpc.io/)
**Stars:** Not publicly tracked (new project)
**License:** MIT

#### Features

| Feature | Description |
|---------|-------------|
| End-to-End Type Safety | Input, output, and error types from client to server |
| First-Class OpenAPI | Built-in OpenAPI 3.0.3 support |
| Contract-First Development | Define API contract before implementation |
| OpenTelemetry | Native observability integration |
| Framework Integrations | TanStack Query, SWR, Pinia, NestJS |
| Server Actions | React Server Actions compatible |
| Schema Support | Zod, Valibot, ArkType |
| Native Types | Date, File, Blob, BigInt, URL |
| Lazy Router | Cold start optimization |
| SSE & Streaming | Full type-safe support |
| Multi-Runtime | Cloudflare, Deno, Bun, Node.js |

#### Relevance to @deessejs/server

oRPC adds OpenAPI generation as a first-class feature. This is a potential future enhancement but out of scope for current URL params plan.

---

### 2.2 Hono RPC

**Repository:** [hono.dev/docs/guides/rpc](https://hono.dev/docs/guides/rpc)
**Framework:** Hono (used by @deessejs/server-hono)

#### Key Patterns for URL Query Parameters

**1. Schema Coercion with `z.coerce.*`**

```typescript
// Server
const route = app.get(
  '/posts/:id',
  zValidator(
    'query',
    z.object({
      page: z.coerce.number().optional(), // Automatic string → number
    })
  ),
  (c) => {
    const { page } = c.req.valid('query')
    // page is already a number
  }
)

// Client - query is passed as string, coerced automatically
const res = await client.posts[':id'].$get({
  query: { page: '1' } // String!
})
```

**2. Custom Query Serializer**

```typescript
const client = hc<AppType>('http://localhost', {
  buildSearchParams: (query) => {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue
      if (Array.isArray(v)) {
        v.forEach((item) => searchParams.append(`${k}[]`, item))
      } else {
        searchParams.set(k, v)
      }
    }
    return searchParams
  },
})
```

**3. URL Helpers**

```typescript
// $url() returns URL object
const url = client.api.posts.$url()

// $path() returns path string with query
const path = client.posts.$path({
  query: { page: '1', limit: '10' }
})
// → "/posts?page=1&limit=10"
```

#### Relevance to @deessejs/server

**High relevance.** Hono RPC is already used by @deessejs/server-hono. The `z.coerce.*` pattern and `buildSearchParams` config are directly applicable.

---

### 2.3 ElysiaJS Eden

**Repository:** [elysiajs.com/eden/overview](https://elysiajs.com/eden/overview)

#### Features

| Feature | Description |
|---------|-------------|
| RPC-like Client | Object-like representation with type safety |
| Eden Treaty | Improved RPC version with error type narrowing |
| Eden Fetch | Fetch-like alternative with type safety |
| No Code Gen | Type inference via TypeScript only |
| < 2KB | Extremely lightweight |

#### Example

```typescript
import { treaty } from '@elysia/eden'
import type { App } from './server'

const app = treaty<App>('localhost:3000')

// Object-like access with full type support
const { data } = await app.get()
const { data: nendoroid, error } = await app.nendoroid({ id: 1895 }).put({
  name: 'Skadi',
  from: 'Arknights'
})
```

#### Relevance to @deessejs/server

**Medium relevance.** The RPC-like pattern with `treaty` is interesting, but ElysiaJS is a different framework. The error type narrowing pattern could be useful.

---

### 2.4 zodix (React Router v7 Utilities)

**Repository:** [github.com/coji/zodix](https://github.com/coji/zodix)
**Stars:** 8
**License:** MIT

#### Features

| Feature | Description |
|---------|-------------|
| parseQuery() | Parse and validate URLSearchParams |
| parseForm() | Parse FormData |
| parseParams() | Parse route params |
| Safe variants | parseQuerySafe(), etc. for non-throwing |
| Helper schemas | NumAsString, IntAsString, BoolAsString, CheckboxAsString |
| Zod v3/v4 | Full compatibility both versions |

#### Helper Schemas (Most Relevant)

```typescript
// parseQuery with helpers
export async function loader({ request }: Route.LoaderArgs) {
  const { count, page } = zx.parseQuery(request, {
    count: zx.NumAsString,    // "5" → 5
    page: zx.NumAsString,
  })
}

// Helper schemas detail
zx.NumAsString  // "3" → 3, "3.14" → 3.14
zx.IntAsString  // "3" → 3, "3.14" → throws
zx.BoolAsString // "true" → true, "false" → false
zx.CheckboxAsString // "on" → true, undefined → false
```

#### Custom Parser Support

```typescript
// For non-standard formats like ?ids[]=1&ids[]=2
const customParser: ParserFunction = (params) => {
  // Custom parsing logic
}
zx.parseQuery(request, { ids: z.array(z.string()) }, { parser: customParser })
```

#### Relevance to @deessejs/server

**Very high relevance.** The helper schema pattern (`NumAsString`, `BoolAsString`) provides a clean, type-safe approach to URL param parsing. This is more robust than naive coercion.

---

### 2.5 FalkZ/zod-search-params

**Repository:** [github.com/FalkZ/zod-search-params](https://github.com/FalkZ/zod-search-params)
**Stars:** 1
**License:** MIT

#### Features

| Feature | Description |
|---------|-------------|
| searchParamsObject() | Create Zod schema from object |
| toSearchParams() | Serialize back to URLSearchParams |
| Bidirectional | parse → validate → serialize → parse roundtrip |

#### Example

```typescript
import { searchParamsObject, toSearchParams } from '@falkz/zod-search-params'

const schema = searchParamsObject({
  query: z.string(),
  page: z.number(),
  limit: z.number().optional(),
  active: z.boolean(),
})

// Parse
const params = schema.parse("?query=hello&page=1&active=true")
// { query: 'hello', page: 1, limit: undefined, active: true }

// Serialize
const urlParams = toSearchParams({ query: "world", page: 2, active: false })
```

#### Relevance to @deessejs/server

**Medium relevance.** The `searchParamsObject` pattern is interesting but requires a different schema creation API. The roundtrip parsing/serializing is useful for testing.

---

## 3. API Patterns Analysis (2026)

### Source: [APIScout - Death of REST?](https://apiscout.dev/blog/death-of-rest-type-safe-api-patterns-2026)

### Comparison Matrix

| Feature | REST | tRPC | GraphQL | gRPC |
|---------|------|------|---------|------|
| Type safety | Manual | Automatic | Codegen | Codegen |
| Language agnostic | Yes | No (TS) | Yes | Yes |
| Browser support | Yes | Yes | Yes | gRPC-Web |
| Streaming | SSE | Yes | Subscriptions | Native |
| Caching | HTTP cache | Limited | Complex | No |
| Code generation | No | No | Yes | Yes |
| Public API | Yes | No | Yes | No |

### Key Insights

1. **REST isn't dead** - Still dominant for public APIs, third-party integrations
2. **tRPC standard for full-stack TypeScript** - Internal APIs moving to tRPC
3. **Type safety everywhere** - The common thread across all modern patterns
4. **Schema-first** - Defining types before implementation is emerging

---

## 4. Recommended Approaches

### 4.1 For @deessejs/server - URL Query Parameters

Based on research, the following approaches are recommended in order of preference:

#### Option A: Hono RPC Pattern (Recommended)

```typescript
// Server-side coercion via z.coerce
const listUsers = t.query({
  args: z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().default(0),
  }),
  handler: async (ctx, args) => {
    // args.limit is already a number
  }
})
```

**Pros:**
- Standard Zod pattern
- Clear intention in schema
- Works with existing Zod validation
- Recommended by Hono RPC

**Cons:**
- Requires user to know about `z.coerce.*`
- Schema modification required

#### Option B: zodix Helper Schemas

```typescript
// Create server-side helpers
const QueryNum = z.preprocess(
  (arg) => (typeof arg === 'string' ? parseInt(arg) : arg),
  z.number()
)
const QueryBool = z.preprocess(
  (arg) => {
    if (typeof arg === 'string') {
      if (arg === 'true' || arg === '1') return true
      if (arg === 'false' || arg === '0') return false
    }
    return arg
  },
  z.boolean()
)

// Usage
const listUsers = t.query({
  args: z.object({
    limit: QueryNum.default(20),
    offset: QueryNum.default(0),
    active: QueryBool,
  }),
  handler: async (ctx, args) => { }
})
```

**Pros:**
- Explicit, readable
- Type-safe conversion
- Reusable helpers

**Cons:**
- More verbose than naive coercion
- Custom helper definitions

#### Option C: Server-Side Naive Coercion (Current Plan)

```typescript
// In createHonoHandler.ts
function coerceQueryParams(query: Record<string, string[]>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {}
  for (const [key, values] of Object.entries(query)) {
    const value = values[0]
    if (value === 'true' || value === '1') coerced[key] = true
    else if (value === 'false' || value === '0') coerced[key] = false
    else if (!isNaN(Number(value)) && value !== '') coerced[key] = Number(value)
    else coerced[key] = value
  }
  return coerced
}
```

**Pros:**
- No schema changes required
- Works universally
- Backward compatible

**Cons:**
- Edge cases: `""` → `0`, `"00123"` → `123`
- Less explicit
- Schema-aware validation unavailable

---

### 4.2 For @deessejs/server - Array Serialization

**Reference:** Hono RPC `buildSearchParams` config

```typescript
// Client transport enhancement
const client = hc<AppType>('http://localhost', {
  buildSearchParams: (query) => {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue
      if (Array.isArray(v)) {
        v.forEach((item) => searchParams.append(`${k}[]`, String(item)))
      } else {
        searchParams.set(k, String(v))
      }
    }
    return searchParams
  },
})
```

**For @deessejs/server transport.ts:**

```typescript
private buildUrl(path: string, args: unknown, method: string): string {
  if (method === 'GET' && args && typeof args === 'object') {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        // Repeat param syntax: ?ids=1&ids=2&ids=3
        for (const item of value) {
          searchParams.append(key, String(item))
        }
      } else if (typeof value === 'object' && value !== null) {
        console.warn(`Nested object "${key}" skipped in GET request.`)
        continue
      } else {
        searchParams.append(key, String(value))
      }
    }
    return `${base}/${path}?${searchParams}`
  }
  return `${base}/${path}`
}
```

---

### 4.3 For @deessejs/server - Future Enhancements

| Enhancement | Reference | Priority | Complexity |
|-------------|-----------|----------|------------|
| `$url()` / `$path()` helpers | Hono RPC | Medium | Low |
| `buildSearchParams` config | Hono RPC | Medium | Low |
| OpenAPI generation | oRPC | Low | High |
| Helper schemas (NumAsString) | zodix | Medium | Low |
| Error type narrowing | ElysiaJS Eden | Low | Medium |

---

## 5. Conclusion

### Summary of Findings

1. **Hono RPC** provides the most relevant patterns for @deessejs/server since it already uses Hono
2. **zodix helper schemas** offer an elegant solution for type-safe URL param parsing
3. **Naive coercion** (current plan) is acceptable for MVP but has edge cases
4. **Schema-aware coercion** via `z.coerce.*` is the standard recommended by Hono

### Recommended Next Steps

1. **Implement naive coercion** (current plan) for immediate fix
2. **Add helper schemas** for better type safety in examples
3. **Document `z.coerce.*` requirement** for URL query parameters
4. **Consider `$url()` / `$path()` helpers** for URL building

### Out of Scope

The following are not recommended for current URL params plan but could be future enhancements:
- OpenAPI generation (complex, different feature)
- Multi-runtime support (Hono only for now)
- OpenTelemetry (not in current requirements)

---

## References

### Primary Sources

- [oRPC](https://orpc.io/) - Typesafe APIs Made Simple
- [Hono RPC Guide](https://hono.dev/docs/guides/rpc) - Type-Safe Fullstack Development
- [ElysiaJS Eden](https://elysiajs.com/eden/overview) - End-to-End Type Safety
- [zodix](https://github.com/coji/zodix) - Zod utilities for React Router
- [FalkZ/zod-search-params](https://github.com/FalkZ/zod-search-params) - Type-safe URL search params

### Secondary Sources

- [APIScout - REST vs tRPC vs GraphQL vs gRPC](https://apiscout.dev/blog/death-of-rest-type-safe-api-patterns-2026) - API Patterns 2026
- [LogRocket - tRPC vs oRPC](https://blog.logrocket.com/trpc-vs-orpc-type-safe-rpc/) - Comparison Article
- [tRPC OpenAPI Issue #44](https://github.com/trpc/trpc-openapi/issues/44) - RFC: Support number, boolean, Date in query params

---

## Appendix A: Edge Cases

| Input | Naive Coercion Output | Expected Output |
|-------|----------------------|-----------------|
| `""` (empty) | `0` (number) | `""` (string) |
| `"00123"` | `123` (number) | `123` (number) or `"00123"` (string) |
| `"123abc"` | `"123abc"` (string) | `"123abc"` (string) |
| `?ids=1&ids=2` | `{ ids: ['1', '2'] }` (strings) | `{ ids: [1, 2] }` (numbers) |
| `"true"`/`"1"` | `true` | `true` |
| `"false"`/`"0"` | `false` | `false` |

## Appendix B: Zod Coercion vs Naive Coercion

| Approach | Code | Pros | Cons |
|----------|------|------|------|
| `z.coerce.number()` | Schema-level | Standard, well-supported | Schema modification |
| `z.preprocess()` | Schema-level | Customizable | Verbose |
| Naive coercion | Handler-level | Universal, no schema changes | Edge cases, less explicit |

---

*Report generated: 2026-04-27*
