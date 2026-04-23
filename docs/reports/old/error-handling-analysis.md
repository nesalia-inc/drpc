# Error Handling Analysis Report for @deessejs/server

## Executive Summary

This report provides a deep technical analysis of error handling issues in @deessejs/server, examining the error type system, serialization/deserialization pipeline, HTTP status mapping, and client-side error parsing. Five critical issues have been identified that can cause incorrect error responses, loss of custom error data, and improper HTTP status codes being returned to clients.

---

## 1. Missing FORBIDDEN (403) and CONFLICT (409) in Error Code Definitions

### Finding

The `ErrorCodes` constant in `packages/server/src/errors/server-error.ts:47-54` does NOT include `FORBIDDEN` or `CONFLICT`:

```typescript
export const ErrorCodes = {
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  INVALID_ARGS: "INVALID_ARGS",
} as const;
```

However, the `errorToStatusMap` in `packages/server-hono/src/errors.ts:4-13` DOES include them:

```typescript
export const errorToStatusMap: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  ROUTE_NOT_FOUND: 404,
  INVALID_ARGS: 400,
};
```

### Analysis

This creates an inconsistency:

1. The server-side `ErrorCodes` constant is missing these error codes
2. The server-side exception classes (`ServerException`, `NotFoundException`, etc.) exist in `packages/server/src/errors/server-error.ts:7-41`, but there are NO `ForbiddenException` or `ConflictException` classes
3. The Hono handler's `errorToStatusMap` has the codes, but the server's error builder system does not

### Impact

- If application code tries to use `ErrorCodes.FORBIDDEN` or `ErrorCodes.CONFLICT`, it will fail at compile time (undefined)
- Custom errors using these codes must be created via the generic `ServerException` or `createErrorResult()` without type safety
- No standardized exception class for 403/409 scenarios

---

## 2. Error Serialization Loses Custom Error Data

### Finding

In `examples/basic-next/server/api.ts:16-26`, custom errors are defined with rich data:

```typescript
const NotFoundError = error({
  name: "NotFoundError",
  message: (args: { resource: string; id: number }) =>
    `${args.resource} ${args.id} not found`,
});

const ConflictError = error({
  name: "ConflictError",
  message: (args: { field: string; value: string }) =>
    `${args.field} "${args.value}" already exists`,
});
```

These are used at lines 74 and 89:
```typescript
return err(NotFoundError({ resource: "User", id: args.id }));
// ...
return err(ConflictError({ field: "email", value: args.email }));
```

### The Serialization Problem

The `ServerError` interface in `packages/server/src/errors/types.ts:1-4` is extremely limited:

```typescript
export interface ServerError {
  code: string;
  message: string;
}
```

When errors flow through the system:

1. **Handler response** in `packages/server-hono/src/createHonoHandler.ts:53-60`:
```typescript
if (result.ok) {
  return c.json(result);
}
// Map error code to HTTP status
const error = result.error as Error | undefined;
const status = getHTTPStatus(error?.name);
return c.json(result, status as 400 | 401 | 403 | 404 | 409 | 500);
```

2. **Client parsing** in `packages/client/src/createClient.ts:19-29`:
```typescript
async function parseResult(response: Response): Promise<{ ok: boolean; value?: unknown; error?: { message: string; code?: string } }> {
  const data = await response.json();

  if (data.ok === true) {
    return { ok: true, value: data.value };
  }

  // Handle error case - ensure error has a message
  const error = data.error || { message: `HTTP ${response.status}: ${data.message || 'Unknown error'}` };
  return { ok: false, error };
}
```

### Analysis

The `data.error` object is passed through directly without preserving custom properties. The `NotFoundError` carries `{ resource: "User", id: 1 }` but this information is completely lost by the time it reaches the client.

The `parseResult` function on line 27 only extracts `message` and `code` from `data.error`:
```typescript
const error = data.error || { message: `HTTP ${response.status}: ${data.message || 'Unknown error'}` };
```

Any additional properties (like `resource`, `id`, `field`, `value`) are discarded.

### Impact

- Clients cannot access rich error context (e.g., which resource was not found, what ID caused the error)
- Error messages are hard-coded strings computed at server-side, not structured data
- Clients cannot programmatically handle specific error scenarios (e.g., display "User 123 not found" vs "Product 456 not found")

---

## 3. Thrown ServerException Becomes Generic INTERNAL_ERROR

### Finding

In `packages/server/src/api/factory.ts:146-151`, uncaught exceptions are converted to generic errors:

```typescript
} catch (error: unknown) {
  // On error, discard pending events (don't emit them)
  queue.clear();
  const errorMessage = error instanceof Error ? error.message : "Internal error";
  return createErrorResult("INTERNAL_ERROR", errorMessage);
}
```

The `createErrorResult` function in `packages/server/src/errors/server-error.ts:88-91`:

```typescript
export function createErrorResult(code: string, message: string): Result<never> {
  const err = createError(code, { message });
  return errFn(err);
}
```

### Analysis

When a `ServerException` is thrown (not returned as a `Result`), the system:

1. Catches it in the catch block
2. Extracts only the `message` string
3. Creates a new error with code `INTERNAL_ERROR` - losing the original exception's code and statusCode!

The `ServerException` at `packages/server/src/errors/server-error.ts:7-19` carries:
```typescript
export class ServerException extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 500) {
    // ...
    this.code = code;
    this.statusCode = statusCode;
  }
}
```

But this rich error information is not propagated - only the message string survives.

### Impact

- A `throw new ForbiddenException("Admin access required")` becomes a generic 500 INTERNAL_ERROR instead of 403 FORBIDDEN
- The original error code and HTTP status are discarded
- This violates the principle of least surprise for developers expecting proper error propagation

---

## 4. Malformed JSON Response Handling

### Finding

In `packages/client/src/createClient.ts:19-20`:

```typescript
async function parseResult(response: Response): Promise<{ ok: boolean; value?: unknown; error?: { message: string; code?: string } }> {
  const data = await response.json();
```

The `response.json()` call is NOT wrapped in a try-catch. If the server returns a non-JSON response (e.g., HTML error page from a proxy, empty response, or malformed JSON), the client will throw a JSON parsing exception.

### Analysis

In typical HTTP error scenarios:

1. Server returns HTTP 500 with HTML body (from a proxy, nginx, etc.)
2. `response.json()` throws `SyntaxError: Unexpected token '<', "<html>..." is not valid JSON`
3. The exception propagates up, crashing the caller's error handling

Even in `packages/server-hono/src/createHonoHandler.ts:38-44`, malformed JSON during parsing is handled:

```typescript
try {
  const body = await c.req.json();
  args = body.args ?? body;
} catch {
  args = {};
}
```

But no equivalent protection exists on the client side for `response.json()`.

### Impact

- Non-JSON error responses (proxy errors, CDN errors, infrastructure-level failures) crash the client
- No graceful degradation when server returns unexpected formats
- Callers cannot distinguish between network errors, JSON parsing errors, and application errors

---

## 5. Edge Case: result.ok === false but result.error is undefined

### Finding

In `packages/client/src/createClient.ts:22-28`:

```typescript
if (data.ok === true) {
  return { ok: true, value: data.value };
}

// Handle error case - ensure error has a message
const error = data.error || { message: `HTTP ${response.status}: ${data.message || 'Unknown error'}` };
return { ok: false, error };
```

### Analysis

The code path where `data.ok === false` but `data.error` is `undefined` or malformed:

1. `data.ok` is explicitly `false` (truthy check fails)
2. `data.error` is `undefined` or `null` or some other falsy value
3. The fallback creates an error with `message: "HTTP ${response.status}: Unknown error"`
4. The `code` is completely absent from this fallback

This handles the case where:
```typescript
// Server sends:
{ "ok": false }
// Without any error object
```

However, consider the reverse scenario: What if the server sends:
```typescript
// Server sends:
{ "ok": true }
// But no "value" field
```

At line 23, this returns `{ ok: true, value: undefined }`, which might be acceptable but is not validated.

### Additional Edge Case: Malformed Error Object

If the server sends:
```typescript
{ "ok": false, "error": { "message": "Validation failed" } }
// Missing "code" field
```

The error is returned with `code: undefined` (line 27 does not extract code explicitly from fallback).

### Impact

- Silent data loss when error structure is incomplete
- `code` field may be `undefined` for fallback errors
- No validation that the response conforms to expected shape

---

## Comparison with tRPC Error Handling

### tRPC's Approach

tRPC provides a `TRPCError` class with explicit error codes:

```typescript
throw new TRPCError({ code: 'UNAUTHORIZED' });
```

The error codes are defined in an enum and fully typed:
```typescript
export const TRPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  BAD_REQUEST: -32600,
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  // ... etc
} as const;
```

### Key Differences

| Aspect | tRPC | @deessejs/server |
|--------|------|-----------------|
| Error codes | Complete set including FORBIDDEN, CONFLICT | Missing FORBIDDEN, CONFLICT from ErrorCodes |
| Exception classes | TRPCError with all codes | ServerException hierarchy incomplete |
| Serialization | Rich error objects with `original` | Limited `ServerError` interface |
| HTTP mapping | Comprehensive in adapters | Partial (errorToStatusMap exists but inconsistent) |
| Client parsing | Validates response shape | Trusts response, no fallback for malformed JSON |

### tRPC Error Format

tRPC error responses include structured data:
```typescript
{
  error: {
    code: "NOT_FOUND",
    message: "User not found",
    data: {
      code: -32004,
      httpStatus: 404,
      stack: "..." // optional
    }
  }
}
```

@deessejs only includes:
```typescript
{
  ok: false,
  error: {
    code: "NOT_FOUND",
    message: "User 123 not found"
    // No additional context!
  }
}
```

---

## Summary of Code References

| File | Lines | Issue |
|------|-------|-------|
| `packages/server/src/errors/server-error.ts` | 47-54 | ErrorCodes missing FORBIDDEN, CONFLICT |
| `packages/server/src/errors/types.ts` | 1-4 | ServerError interface lacks custom data fields |
| `packages/server-hono/src/errors.ts` | 4-13 | errorToStatusMap has codes not in ErrorCodes |
| `packages/server-hono/src/createHonoHandler.ts` | 53-60 | Raw result passed through, custom error data lost |
| `packages/client/src/createClient.ts` | 19-29 | No JSON parse error handling, data loss on fallback |
| `packages/server/src/api/factory.ts` | 146-151 | Thrown ServerException loses code/statusCode |
| `examples/basic-next/server/api.ts` | 16-26 | Custom errors with rich data, fully lost in serialization |

---

## Impact Assessment

| Issue | Severity | User Impact |
|-------|----------|-------------|
| Missing FORBIDDEN/CONFLICT codes | Medium | Compile-time errors if developers try to use ErrorCodes.FORBIDDEN |
| Custom error data loss | High | Clients cannot programmatically handle specific errors |
| ServerException becomes INTERNAL_ERROR | High | Thrown exceptions return wrong HTTP status (500 vs 403/409) |
| Malformed JSON handling | Medium | Client crashes on non-JSON error responses |
| result.ok === false edge case | Low | Potential undefined code in fallback errors |

---

## Conclusion

The error handling system in @deessejs/server has a layered architecture where errors are created on the server, serialized to HTTP responses, and parsed on the client. However, at each layer, critical information is lost:

1. Error codes are inconsistently defined between server and Hono handler
2. Rich custom error data (resource/id) is stripped during serialization
3. Thrown exceptions are flattened to generic INTERNAL_ERROR
4. Client lacks protection against malformed JSON
5. The fallback error path has incomplete data (missing code)

This creates a system where developers can create rich, descriptive errors on the server, but clients receive only sanitized, limited error information - making it difficult to build sophisticated error handling UIs or programmatically respond to specific error conditions.
