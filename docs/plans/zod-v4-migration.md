# Zod v4 Migration Plan

Date: 2026-04-22
Status: Complete

## Objective

Migrate all packages from Zod v3 to Zod v4, updating package.json dependencies and fixing breaking changes in TypeScript source files.

## Scope

**Packages updated:**
1. `packages/server` - Core package (most dependents)
2. `packages/server-hono` - Hono adapter
3. `packages/server-next` - Next.js adapter
4. `examples/basic` - Basic example
5. `examples/basic-next` - Next.js example
6. `examples/events-example` - Events example
7. `examples/middleware-example` - Middleware example
8. `examples/electron` - Electron example
9. `examples/plugin-example` - Plugin example
10. `examples/plugin-example-server` - Plugin server example

## Analysis Summary

| Category | Finding | Impact |
|----------|---------|--------|
| `message:` / `invalid_type_error:` / `required_error:` | NOT USED in any source file | None |
| `z.string().email()` etc. | FOUND in examples, tests, skills | Medium - needs migration |
| `z.nativeEnum()` | NOT USED | None |
| `._def` | NOT USED in source files | None |
| `.strict()` / `.passthrough()` | NOT USED | None |
| `ZodType` import | USED as type-only import | Likely compatible |

## Breaking Changes Addressed

### 1. String Format Methods (Most Impactful)
```typescript
// v3 (deprecated)
z.string().email()
z.string().url()
z.string().uuid()

// v4 (new)
z.email()
z.url()
z.uuid()
```

### 2. Package Version Update
```json
// All package.json files
"zod": "^3.0.0" -> "zod": "^4.0.0"
```

### 3. ZodError.errors -> ZodError.issues
In Zod v4, `ZodError.errors` was renamed to `ZodError.issues`.

## Implementation Steps Completed

### Step 1: Updated package.json files
All 10 package.json files updated with `"zod": "^4.0.0"`:
- packages/server/package.json (peerDependencies and devDependencies)
- packages/server-hono/package.json
- packages/server-next/package.json
- examples/basic/package.json
- examples/basic-next/package.json
- examples/events-example/package.json
- examples/middleware-example/package.json
- examples/electron/package.json
- examples/plugin-example/package.json
- examples/plugin-example-server/package.json

### Step 2: Fixed z.string().email() in TypeScript files
All source files updated with `z.email()`:
- examples/basic/src/index.ts
- examples/basic-next/server/api.ts
- examples/events-example/src/server/routers/users.ts
- examples/events-example/tests/events.test.ts
- examples/middleware-example/src/server/procedures.ts
- examples/plugin-example/src/api/index.ts
- examples/plugin-example-server/src/api/index.ts
- examples/electron/src/main.ts

### Step 3: Fixed ZodError.errors -> issues in core package
- packages/server/src/api/factory.ts: `parseResult.error.errors` -> `parseResult.error.issues`

### Step 4: Added missing imports in query/builder.ts
- Added missing imports for EventEmitter, QueryConfig, MutationConfig, Router, EventPayload, and types from index modules

## Verification

1. pnpm install - completed successfully
2. Core packages typecheck and tests pass:
   - packages/server: typecheck passes, 33 tests pass
   - packages/server-hono: typecheck passes, 2 tests pass
   - packages/server-next: typecheck passes, 1 test passes
3. Examples typecheck (some type errors in examples are pre-existing, not zod related):
   - events-example tests pass (22 tests)
4. Examples tests all pass

## Files Modified

### package.json files (10):
- `C:\Users\dpereira\Documents\github\server\packages\server\package.json`
- `C:\Users\dpereira\Documents\github\server\packages\server-hono\package.json`
- `C:\Users\dpereira\Documents\github\server\packages\server-next\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\basic\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\basic-next\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\events-example\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\middleware-example\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\electron\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\plugin-example\package.json`
- `C:\Users\dpereira\Documents\github\server\examples\plugin-example-server\package.json`

### TypeScript source files (8):
- `C:\Users\dpereira\Documents\github\server\packages\server\src\api\factory.ts`
- `C:\Users\dpereira\Documents\github\server\packages\server\src\query\builder.ts`
- `C:\Users\dpereira\Documents\github\server\examples\basic\src\index.ts`
- `C:\Users\dpereira\Documents\github\server\examples\basic-next\server\api.ts`
- `C:\Users\dpereira\Documents\github\server\examples\events-example\src\server\routers\users.ts`
- `C:\Users\dpereira\Documents\github\server\examples\events-example\tests\events.test.ts`
- `C:\Users\dpereira\Documents\github\server\examples\middleware-example\src\server\procedures.ts`
- `C:\Users\dpereira\Documents\github\server\examples\plugin-example\src\api\index.ts`
- `C:\Users\dpereira\Documents\github\server\examples\plugin-example-server\src\api\index.ts`
- `C:\Users\dpereira\Documents\github\server\examples\electron\src\main.ts`

## Notes

- Skills documentation (`.claude/skills/` and `skills/`) contains zod v3 syntax but was not updated as it's documentation rather than code
- The typecheck errors in examples/events-example are pre-existing issues with Router type inference, not related to the zod v4 migration
- All core package tests pass successfully with zod v4