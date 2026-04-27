# Search Params Support - Implementation Plan

Date: 2026-04-27
Status: Pending
Priority: High
Branch: `feature/search-params-support`

## Objective

Implement URL query parameter handling aligned with tRPC OpenAPI conventions:
- **GET/DELETE** → URL query parameters with automatic type coercion
- **POST/PUT/PATCH** → Request body JSON for complex types
- Coercion for primitives: `number`, `boolean`
- Nested objects skipped with explicit warning (not silent)

## Problem Statement

### Current Issues

| Issue | Impact | Location |
|-------|--------|----------|
| Type mismatch | `?limit=20` → `{ limit: ['20'] }` (arrays, not scalars) | `createHonoHandler.ts:72` |
| No coercion | Server doesn't convert strings to numbers/booleans | `procedure.ts:115` |
| Array handling broken | `{ ids: [1,2,3] }` becomes `ids=1,2,3` not `ids=1&ids=2&ids=3` | `transport.ts:43` |
| Zod validation fails | `z.number()` fails on string `'123'` from URL | `procedure.ts:115` |

### Current Flow (Broken)

```
Client: client.users.list({ limit: 20 })
           │
           ▼ buildUrl() in transport.ts
URL: /api/users.list?limit=20
           │
           ▼ c.req.queries() in createHonoHandler.ts
Server args: { limit: ['20'] }  ← string array, no coercion!
           │
           ▼ safeParse() in procedure.ts
Zod validation FAILS: Expected number, got string
```

## tRPC OpenAPI Reference

### HTTP Method Handling

| HTTP Method | Input Location | Use Case |
|-------------|----------------|----------|
| `GET` | URL query params | Simple queries with primitives |
| `DELETE` | URL query params | Simple deletions |
| `POST/PUT/PATCH` | Request body JSON | Complex queries, mutations |

### Coercion Rules (tRPC OpenAPI)

| URL String | Coerced Value |
|------------|--------------|
| `"true"`, `"1"` | `true` (boolean) |
| `"false"`, `"0"` | `false` (boolean) |
| `"123"` | `123` (number) |
| Other strings | String (pass-through) |

For complex types, tRPC recommends `z.preprocess()` or `z.coerce`. Date coercion intentionally omitted.

## Implementation Steps

### Step 1: Server-side Type Coercion

**File:** `packages/server-hono/src/createHonoHandler.ts`

**Goal:** Convert URL query string values to primitive types before Zod validation.

```typescript
/**
 * Coerces URL query string values to primitive types.
 * Rule: "true"/"1" → true, "false"/"0" → false, numeric strings → number
 * Note: Empty string is NOT coerced to 0 (stays as empty string)
 */
function coerceQueryParams(query: Record<string, string[]>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  for (const [key, values] of Object.entries(query)) {
    const value = values[0]; // Take first value from array (Hono returns string[])
    if (value === 'true' || value === '1') {
      coerced[key] = true;
    } else if (value === 'false' || value === '0') {
      coerced[key] = false;
    } else if (value !== '' && !isNaN(Number(value))) {
      // Guard against empty string to prevent "" → 0 coercion bug
      coerced[key] = Number(value);
    } else {
      coerced[key] = value;
    }
  }
  return coerced;
}
```

**Apply in query handling:**

```typescript
} else {
  // GET/DELETE: parse search params with coercion
  const queryParams = c.req.queries();
  args = coerceQueryParams(queryParams);
}
```

### Step 2: Client Transport - Array Repeat Params

**File:** `packages/client/src/transport.ts`

**Goal:** Serialize arrays using repeat param syntax (`?ids=1&ids=2&ids=3`).

```typescript
private buildUrl(path: string, args: unknown, method: string): string {
  if (method === 'GET' && args && typeof args === 'object') {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        // Repeat param syntax: ?ids=1&ids=2&ids=3
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else if (typeof value === 'object' && value !== null) {
        // Nested objects cannot be serialized to URL
        // Log warning to help users debug issues
        console.warn(
          `[deesse] Nested object "${key}" skipped in GET request. ` +
          `Use POST body for complex queries with nested objects.`
        );
        continue;
      } else {
        searchParams.append(key, String(value));
      }
    }

    return `${base}/${path}?${searchParams}`;
  }
  return `${base}/${path}`;
}
```

### Step 3: Documentation

**File:** `docs/features/CLIENT.md`

Add section documenting URL param handling and limitations.

## Known Limitations (Documented)

| Input | Output | Notes |
|-------|--------|-------|
| `""` (empty string) | `""` (string) | Correct - empty string stays as string |
| `"00123"` | `123` (number) | Leading zeros stripped (standard Number behavior) |
| `"123abc"` | `"123abc"` (string) | Non-numeric strings stay as strings |
| `?ids=1&ids=2` | `{ ids: ['1', '2'] }` | Arrays contain strings, not numbers |
| Invalid Date | throws | Use `z.preprocess()` for safe Date parsing |

### Workarounds for Limitations

1. **Numbers in arrays:** Use POST body or schema-level coercion with `z.preprocess()`
2. **Date types:** Use `z.preprocess()` in schema definition
3. **Empty string handling:** Use POST body or explicit validation

## Alternative Approaches (For Future Enhancement)

### Schema-Aware Coercion (Recommended for v2)

Instead of naive coercion, use schema-defined coercion:

```typescript
// Using z.coerce (Hono RPC pattern)
args: z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Using helper schemas (zodix pattern)
const QueryNum = z.preprocess(
  (arg) => (typeof arg === 'string' ? parseInt(arg) : arg),
  z.number()
)
```

**Pros:** Type-safe, controlled, works with Zod validations
**Cons:** Requires schema modification

## Tasks

- [ ] Implement `coerceQueryParams()` in `packages/server-hono/src/createHonoHandler.ts`
- [ ] Update `buildUrl()` in `packages/client/src/transport.ts` for array repeat params
- [ ] Add warning for skipped nested objects in `buildUrl()`
- [ ] Add documentation in `docs/features/CLIENT.md`
- [ ] Write tests for URL param coercion
- [ ] Verify typecheck passes

## Test Coverage Required

### `packages/server-hono/tests/createHonoHandler.test.ts`

Add tests for `coerceQueryParams()` function:

```typescript
describe('coerceQueryParams', () => {
  it('should coerce numeric strings to numbers', () => {
    const input = { limit: ['20'], offset: ['0'] };
    const result = coerceQueryParams(input);
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it('should coerce "true" and "1" to boolean true', () => {
    const input1 = { active: ['true'] };
    const input2 = { active: ['1'] };
    expect(coerceQueryParams(input1)).toEqual({ active: true });
    expect(coerceQueryParams(input2)).toEqual({ active: true });
  });

  it('should coerce "false" and "0" to boolean false', () => {
    const input1 = { active: ['false'] };
    const input2 = { active: ['0'] };
    expect(coerceQueryParams(input1)).toEqual({ active: false });
    expect(coerceQueryParams(input2)).toEqual({ active: false });
  });

  it('should preserve empty strings as empty strings', () => {
    const input = { name: [''] };
    const result = coerceQueryParams(input);
    expect(result).toEqual({ name: '' });
    // NOT { name: 0 }
  });

  it('should preserve non-numeric strings', () => {
    const input = { name: ['john'] };
    const result = coerceQueryParams(input);
    expect(result).toEqual({ name: 'john' });
  });

  it('should handle mixed types in query', () => {
    const input = { limit: ['10'], active: ['true'], name: ['john'] };
    const result = coerceQueryParams(input);
    expect(result).toEqual({ limit: 10, active: true, name: 'john' });
  });
});
```

### `packages/client/tests/createClient.test.ts`

Add tests for array serialization in `buildUrl()`:

```typescript
describe('buildUrl with arrays', () => {
  it('should serialize arrays as repeat params', async () => {
    const mockTransport = {
      request: vi.fn().mockResolvedValue({ ok: true, value: [] })
    };
    const client = createClient({ transport: mockTransport as any }) as any;

    await client.users.list({ ids: [1, 2, 3] });

    // Verify URL contains repeat params: users/list?ids=1&ids=2&ids=3
    expect(mockTransport.request).toHaveBeenCalledWith(
      'users/list',
      expect.objectContaining({ ids: [1, 2, 3] })
    );
  });

  it('should log warning for nested objects in GET', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockTransport = {
      request: vi.fn().mockResolvedValue({ ok: true, value: [] })
    };
    const client = createClient({ transport: mockTransport as any }) as any;

    await client.users.search({ filter: { status: 'active' } });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Nested object "filter" skipped')
    );
    warnSpy.mockRestore();
  });
});
```

### Integration Test (Hono Handler + Client)

```typescript
describe('GET request with query params', () => {
  it('should handle number coercion from URL', async () => {
    const { t, createAPI } = defineContext({ context: {} });

    const listUsers = t.query({
      args: z.object({ limit: z.number() }),
      handler: async (ctx, args) => {
        return ok({ count: args.limit });
      },
    });

    const api = createAPI({
      router: t.router({ users: { list: listUsers } }),
    });

    const client = createPublicAPI(api);
    const app = createHonoHandler(client);

    // Simulate GET request with ?limit=20
    const request = new Request('http://localhost/api/users.list?limit=20');
    const response = await app.fetch(request);

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.value.count).toBe(20); // Number, not string!
  });
});
```

## Files Modified

### `packages/server-hono/src/createHonoHandler.ts`
- Add `coerceQueryParams()` function
- Guard against empty string coercion bug
- Apply coercion before Zod validation

### `packages/client/src/transport.ts`
- Update `buildUrl()` for array repeat param syntax
- Add warning for skipped nested objects

### `packages/server-hono/tests/createHonoHandler.test.ts`
- Add tests for `coerceQueryParams()` function
- Test number, boolean, empty string coercion
- Integration test for GET request with query params

### `packages/client/tests/createClient.test.ts`
- Add tests for array serialization as repeat params
- Add test for nested object warning

### `docs/features/CLIENT.md`
- Document URL param handling and limitations

## Verification

| Test Case | Input | Expected Output | Status |
|-----------|--------|-----------------|--------|
| Number coercion | `?limit=20` | `{ limit: 20 }` | Pending |
| Boolean true coercion | `?active=true` | `{ active: true }` | Pending |
| Boolean "1" coercion | `?active=1` | `{ active: true }` | Pending |
| Boolean false coercion | `?active=false` | `{ active: false }` | Pending |
| Boolean "0" coercion | `?active=0` | `{ active: false }` | Pending |
| Empty string preserved | `?name=` | `{ name: '' }` | Pending |
| Non-numeric string | `?name=john` | `{ name: 'john' }` | Pending |
| Array repeat params | `?ids=1&ids=2` | `['1', '2']` (strings) | Pending |
| Nested object warning | `{ filter: {...} }` | Warning logged, filter skipped | Pending |
| Client list query | `client.users.list({ limit: 20 })` | GET `/api/users.list?limit=20` | Pending |
| Client complex query | `client.users.search({ filter: {...} })` | POST with body JSON | Pending |

## References

- [tRPC OpenAPI Repository](https://github.com/trpc/trpc-openapi)
- [tRPC OpenAPI Issue #44](https://github.com/trpc/trpc-openapi/issues/44) - RFC: Support number, boolean, Date
- [Hono RPC Guide](https://hono.dev/docs/guides/rpc) - Type-Safe Fullstack Development
- [zodix](https://github.com/coji/zodix) - Zod utilities with helper schemas pattern
- [Type-Safe API Research Report](../reports/type-safe-api-research-2026.md)

## Notes

- Naive coercion approach chosen for MVP: universal, no schema changes required
- tRPC OpenAPI alignment ensures ecosystem compatibility
- Complex GET queries with nested objects should use POST body (standard practice)
- Schema-aware coercion (z.coerce) available as v2 enhancement
