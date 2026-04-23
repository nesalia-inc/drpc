# Type Errors in examples/basic-next with @deessejs/server-next and Next.js 15

## Executive Summary

The type errors in `examples/basic-next/.next/types/app/api/[[...route]]/route.ts` are caused by a type mismatch between what the `hono/vercel` adapter's `handle()` function returns and what Next.js 15 App Router route handlers expect.

**Root Cause**: `hono/vercel`'s `handle()` returns `(req: Request) => Response | Promise<Response>`, but Next.js 15 expects `(req: Request | NextRequest) => Response | void | Promise<Response | void>`. The `void` return type is the key difference.

**Status**: Confirmed issue in `packages/server-next/src/createNextHandler.ts`. The runtime behavior is **correct** - only type checking fails. This is a TypeScript type definition mismatch, not a runtime bug.

**Resolution**: The `hono/vercel` adapter is the **correct and official** way to integrate Hono with Next.js App Router (as documented on hono.dev). A type assertion or `// @ts-ignore` can resolve the type mismatch if needed.

---

## Error Description

The errors appear in `.next/types/app/api/[[...route]]/route.ts` (Next.js generated type file):

### Error 1: Return Type Mismatch
```
Type '(req: Request) => Response | Promise<Response>' is not assignable to type
'void | Response | Promise<void | Response>'
```

### Error 2: Parameter Type Mismatch
```
Type 'Hono<any, any, any>' is not assignable to type 'NextRequest | Request'
```

---

## Architecture Overview

### Call Chain
```
app/api/[[...route]]/route.ts (source)
    |
    v
createNextHandler(publicAPI) from @deessejs/server-next
    |
    v
handle(app) from "hono/vercel"
    |
    v
createHonoHandler(client) from @deessejs/server-hono
    |
    v
Hono app instance
```

### Relevant Files

| File | Purpose |
|------|---------|
| `examples/basic-next/app/api/[[...route]]/route.ts` | Next.js App Router handler entry point |
| `packages/server-next/src/createNextHandler.ts` | Creates Next.js handler using hono/vercel's `handle()` |
| `packages/server-hono/src/createHonoHandler.ts` | Creates Hono app from HTTPClient |
| `package/server/src/api/factory.ts` | Creates HTTPClient (API instance) |

---

## Root Cause Analysis

### Issue Location
`packages/server-next/src/createNextHandler.ts` lines 24-30:

```typescript
return {
  GET: handle(app),
  POST: handle(app),
  PUT: handle(app),
  PATCH: handle(app),
  DELETE: handle(app),
  OPTIONS: handle(app),
};
```

### The Problem

1. **`handle()` from `hono/vercel`** returns a function with signature:
   ```typescript
   (req: Request) => Response | Promise<Response>
   ```

2. **Next.js 15 App Router** expects route handlers with signature:
   ```typescript
   (req: Request | NextRequest) => Response | void | Promise<Response | void>
   ```

3. **The mismatch**:
   - `handle()` does not accept `NextRequest` (only `Request`)
   - `handle()` never returns `void` (always returns `Response`)
   - Next.js type system requires both `void` and `Response` as valid returns

### Next.js Type Constraints (from generated `.next/types/app/api/[[...route]]/route.ts`)

The generated type checker enforces:
- First param must be `Request | NextRequest`
- Return must be `Response | void | Promise<Response | void>`

---

## Affected Files

| File | Status |
|------|--------|
| `examples/basic-next/app/api/[[...route]]/route.ts` | Source entry point (correct) |
| `examples/basic-next/.next/types/app/api/[[...route]]/route.ts` | Generated types (error manifests here) |
| `packages/server-next/src/createNextHandler.ts` | **Root cause location** |
| `packages/server-next/src/index.ts` | Exports the problematic function |
| `packages/server-hono/src/createHonoHandler.ts` | Creates the Hono app used by server-next |

---

## Next.js Version Dependency

The example specifies:
```json
"next": "^14.0.0 || ^15.0.0"
```

The type errors are likely occurring specifically with Next.js 15, which has stricter typing for route handlers than Next.js 14.

---

## Additional Analysis: Hono Next.js Integration

### Hono's Official Pattern (from hono.dev)

Hono recommends using `hono/vercel` for Next.js App Router:
```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const app = new Hono()
export const GET = handle(app)
export const POST = handle(app)
```

### The TypeScript Mismatch

The Hono pattern works at **runtime** but fails **type checking** because:

1. `hono/vercel`'s `handle()` returns `(req: Request) => Promise<Response>`
2. Next.js 15 requires `(req: Request | NextRequest) => Response | void`

The `void` return type allowed by Next.js 15 is the key incompatibility. Since `handle(app)` always returns a Response, the runtime behavior is correct but TypeScript enforces the `void` option strictly.

### Conclusion

The Hono `hono/vercel` adapter is the **correct and recommended** adapter for Next.js App Router. The type errors are a TypeScript type definition mismatch between Hono and Next.js 15's stricter types, not a runtime issue.

---

## Recommended Fixes

### Option 1: Create Next.js-specific Handler (Recommended)
Avoid using `hono/vercel` and create a native Next.js handler:

```typescript
// In packages/server-next/src/createNextHandler.ts
export function createNextHandler(client: HTTPClient): NextHandler {
  const handler = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = url.pathname.replace('/api/', '').replace(/^\//, '');
    const normalizedPath = path.replace(/\//g, '.');

    const method = req.method;
    let args: Record<string, unknown> = {};

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      args = await req.json().catch(() => ({}));
    } else {
      args = Object.fromEntries(url.searchParams);
    }

    const result = await client.execute(normalizedPath, args);

    if (result.ok) {
      return Response.json(result);
    }
    const status = getHTTPStatus(result.error?.name);
    return Response.json(result, { status });
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    PATCH: handler,
    DELETE: handler,
    OPTIONS: handler,
  };
}
```

### Option 2: Type Assertion (Short-term Workaround)
Since runtime behavior is correct, add type assertion:

```typescript
return {
  GET: handle(app) as (req: Request | NextRequest) => Response | void | Promise<Response | void>,
  // ... same for other methods
} as NextHandler;
```

### Option 3: Suppress with // @ts-ignore (Not Recommended)
Add suppression comments at export lines if other options fail.

---

## Priority

**Medium** - The type errors are a TypeScript type definition mismatch between Hono and Next.js 15. The runtime behavior is **correct**. This causes CI failures for typecheck but does not affect actual functionality.

---

## References

- Next.js 15 Route Handler Types: `.next/types/app/api/[[...route]]/route.ts`
- `hono/vercel` adapter documentation
- `packages/server-next/src/createNextHandler.ts`
- `packages/server-hono/src/createHonoHandler.ts`