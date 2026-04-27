# URL Format Standardization to Dot Notation

Date: 2026-04-27
Status: Pending
Priority: High

## Objective

Standardize URL format to use **dot notation** (`/users.get`) consistently across all HTTP-facing interfaces, matching tRPC conventions and ensuring internal procedure lookup uses the same format as direct proxy calls.

## Rationale

This project is an RPC-style API framework similar to tRPC. Using dot notation in URLs is:
- **Consistent with tRPC** (the reference implementation for TypeScript RPC)
- **Consistent with direct proxy calls** (`client.users.get()` uses dot internally)
- **Industry standard** for TypeScript RPC APIs (Slack, tRPC, etc.)

Reference: [tRPC HTTP RPC Specification](https://trpc.io/docs/rpc)

## Problem Statement

The project has an inconsistency where the official HTTP client uses **slash notation** (`users/get`) while tRPC conventions and direct proxy calls use **dot notation** (`users.get`):

| Component | Current Format | Expected Format | Status |
|-----------|---------------|-----------------|--------|
| Client (`createClient.ts`) | Slash (`users/get`) | Dot (`users.get`) | **Needs change** |
| Hono Adapter | Slash→Dot conversion | Accepts slash, outputs dot | Acceptable |
| Next.js Adapter | Slash→Dot conversion | Accepts slash, outputs dot | Acceptable |
| Electron Handler | Dot only (`users.get`) | Dot (`users.get`) | Correct |
| Electron Client | Dot only | Dot (`users.get`) | Correct |
| Documentation (`docs/features/CLIENT.md`) | Dot (`/api/users.get`) | Dot (`/api/users.get`) | Correct |

## Scope

**Packages to modify:**
1. `packages/client` - Change `pathParts.join('/')` to `pathParts.join('.')`

**Packages to verify (accept slash input for backward compatibility):**
1. `packages/server-hono` - Update `normalizePath()` to also accept dot (already outputs dot)
2. `packages/server-next` - Delegate to Hono, no change needed
3. `packages/electron-client` - Already correct

## Implementation Steps

### Step 1: Update Client to Use Dot Notation

**File:** `packages/client/src/createClient.ts`

```typescript
// BEFORE (line ~36)
const response = await transport.request(pathParts.join('/'), args);

// AFTER
const response = await transport.request(pathParts.join('.'), args);
```

### Step 2: Update Hono Adapter to Accept Slash Input (Backward Compatibility)

**File:** `packages/server-hono/src/createHonoHandler.ts`

Update `normalizePath()` to accept both formats and normalize to dot:

```typescript
// BEFORE
function normalizePath(path: string): string {
  return path.replace(/\//g, ".");
}

// AFTER
function normalizePath(path: string): string {
  // Accept both slash and dot input, normalize to dot
  return path.replace(/\//g, ".");
}
```

This is already the behavior, but explicit is better than implicit.

### Step 3: Update Tests

**File:** `packages/client/tests/createClient.test.ts`

Update expected calls:
```typescript
// BEFORE
expect(mockTransport.request).toHaveBeenCalledWith('users/get', { id: 1 });

// AFTER
expect(mockTransport.request).toHaveBeenCalledWith('users.get', { id: 1 });
```

### Step 4: Verify Documentation Examples

**File:** `docs/features/CLIENT.md`

Verify all examples use dot notation (`/api/users.get`). If any show slash, update to dot.

## Tasks

- [ ] Update `packages/client/src/createClient.ts` - Change `join('/')` to `join('.')`
- [ ] Update `packages/client/tests/createClient.test.ts` - Update expected paths to dot notation
- [ ] Verify `packages/server-hono/src/createHonoHandler.ts` - Confirm slash→dot normalization
- [ ] Verify `docs/features/CLIENT.md` - All examples use dot notation
- [ ] Verify all examples use dot notation
- [ ] Run tests to verify changes
- [ ] Verify typecheck passes

## Files Modified

### packages/client/src/createClient.ts
- Change path construction from slash-separated to dot-separated

### packages/client/tests/createClient.test.ts
- Update expected paths from `users/get` to `users.get`

## Verification

1. **Unit tests:**
   - `packages/client` tests pass with new dot notation

2. **Typecheck:**
   - All packages typecheck without errors

3. **Integration:**
   - HTTP requests to `/api/users.get` resolve correctly
   - All adapters handle dot notation URLs

## Notes

- tRPC uses `/api/trpc/post.byId` format (dot notation for nested procedures)
- Direct proxy calls (`client.users.get()`) already use dot internally
- The client sending `users.get` matches the internal lookup format
- This change makes URL format consistent with tRPC conventions
