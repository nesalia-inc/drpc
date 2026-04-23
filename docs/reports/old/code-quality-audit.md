# Code Quality Audit Report

**Date:** 2026-04-21
**Scope:** `packages/server/src`
**Rules Reference:** `docs/rules/`
**Status:** Phase 1 Complete

---

## Executive Summary

Analysis of `packages/server/src` against project rules reveals **significant violations** across all rule categories. The codebase needs substantial refactoring to align with project standards.

| Rule | Violations | Status |
|------|------------|--------|
| No Inline Imports | 11 | **FIXED** |
| Function Declarations | 26 | Pending |
| Type Assertions | 19 `as any` | Pending |
| T \| undefined / null | 30+ | Pending |
| Useless Comments | 16 | **FIXED** |
| Import Organization | 30+ files | **FIXED** |
| Exported Classes | 2 internal classes | Low |
| Type Enrichment | Not implemented | Pending |

---

## Phase 1 Fixes Completed

### Useless Comments - FIXED

All 16 useless comments removed from:
- `context/builder.ts` (4 comments)
- `hooks/executor.ts` (2 comments)
- `events/emitter.ts` (10 comments)

### Import Spacing - FIXED

All `import  {` → `import {` fixed across 25+ files.

### Mixed Type/Value Imports - FIXED

Split into separate lines in:
- `api/factory.ts:1`
- `events/emitter.ts:2`
- `events/queue.ts:3`

### Inline Imports - FIXED

All 11 inline imports replaced with proper `import type` statements:
- `api/types.ts` (4 inline imports)
- `context/types.ts` (1 inline import)
- `hooks/types.ts` (3 inline imports)

---

## 1. Inline Imports (`docs/rules/no-inline-imports.md`)

### Status: FIXED

All 11 inline imports replaced with proper `import type` statements.

---

## 2. Function Declarations (`docs/rules/no-function-declarations.md`)

### Functions Without Valid Reason: 26

| File | Function | Recommendation |
|------|----------|-----------------|
| `router/builder.ts:5` | `flattenRouter` | Use named const arrow (recursive) |
| `router/builder.ts:25` | `getPublicRoutes` | Convert to const arrow |
| `router/builder.ts:33` | `getInternalRoutes` | Convert to const arrow |
| `router/builder.ts:42` | `isRouter` | Convert to const arrow |
| `router/builder.ts:55` | `isProcedure` | Convert to const arrow |
| `router/builder.ts:64` | `resolvePath` | Convert to const arrow |
| `router/builder.ts:83` | `validateRouter` | Convert to const arrow |
| `middleware/helpers.ts` | `withQuery` (3 overloads) | Convert to const arrow |
| `middleware/helpers.ts` | `withMutation` (3 overloads) | Convert to const arrow |
| `events/dsl.ts:24` | `event` | Convert to const arrow |
| `events/dsl.ts:52` | `eventNamespace` | Convert to const arrow |
| `events/emitter.ts:226` | `defineEvents` | Convert to const arrow |
| `errors/server-error.ts:100` | `createErrorResult` | Convert to const arrow |
| `types.ts:74` | `plugin` | Convert to const arrow |
| `procedure/types.ts:10` | `withMetadata` | Convert to const arrow |
| `middleware/builder.ts:3` | `createMiddleware` | Convert to const arrow |

### Functions With Valid Reason (Keep as `function`): 7

- `api/factory.ts:32` - `createRouterProxy` (Proxy getter needs `this`)
- `api/factory.ts:327` - `filterPublicRouter` (recursive)
- `api/factory.ts:192` - `executeProcedure` (recursive middleware chain)
- `mutation/builder.ts:50` - `createHookedProcedure` (self-referencing closure)
- `query/builder.ts:130` - `createHookedProcedure` (self-referencing closure)
- `internal-mutation/builder.ts:50` - `createHookedProcedure` (self-referencing closure)
- `internal-query/builder.ts:46` - `createHookedProcedure` (self-referencing closure)

---

## 3. Type Assertions (`docs/rules/no-type-assertions.md`)

### High-Priority `as any` Usage: 19

**`packages/server/src/api/factory.ts`** (13 instances)
| Line | Code | Issue |
|------|------|-------|
| 60 | `value as any` | Access dynamic property |
| 85 | `router as any` | Dangerous bypass |
| 88 | `current[parts[i]] as any` | Access pattern |
| 276 | `state.router as any` | Proxy pattern |
| 278 | `state as any` | Proxy target |
| 287 | `(routerProxy as any)[prop]` | Property access |
| 299 | `(api as any).createContext` | Extension point |
| 305 | `publicRouter as any` | Narrowing |
| 311 | `} as any` | Return type |
| 332 | `(router as any)[key]` | Index access |
| 337 | `(value as any).type === "query"` | Discriminant check |

**Other files:**
| File | Line | Issue |
|------|------|-------|
| `context/builder.ts` | 27 | `eventEmitter as any` |
| `events/emitter.ts` | 35, 52 | `handler as any` |
| `events/emitter.ts` | 228 | `events as any` |
| `router/builder.ts` | 12 | `router as any` |
| `query/builder.ts` | 35, 45, 54, 66 | `config.handler as any` |
| `internal-query/builder.ts` | 20 | `config.handler as any` |
| `internal-mutation/builder.ts` | 22 | `config.handler as any` |

### Double Assertions (Signal Type Design Issue)
- `factory.ts:203` - `procedure as unknown as ProcedureWithHooks<...>`
- `factory.ts:229` - `as unknown as Result<Output>`

---

## 4. T | undefined / null (`docs/rules/no-t-null-or-undefined.md`)

### `| undefined` Patterns: 7

| File | Line | Pattern |
|------|------|---------|
| `events/queue.ts` | 7, 29 | `EventEmitter \| undefined` |
| `hooks/executor.ts` | 29 | `BeforeInvokeHook \| undefined` |
| `api/factory.ts` | 37, 79, 140, 197 | `EventEmitterAny \| undefined` |

### Optional Parameters (`?:`): 40+

These should use `Maybe<T>` from `@deessejs/fp`:

```typescript
// Current (violation)
eventEmitter?: EventEmitterAny

// Should be
eventEmitter: Maybe<EventEmitterAny>
```

Files affected:
- `events/emitter.ts:13` - `_events?: Events`
- `errors/types.ts:4` - `data?: Record<string, unknown>`
- `errors/server-error.ts` - Multiple `data?:` usages
- `hooks/types.ts:4` - `beforeInvoke?: BeforeInvokeHook`
- `types.ts` - `argsSchema?:`, `args?:`, `next?:`, `options?:`
- `query/types.ts` - `args?`, `beforeInvoke?`, `afterInvoke?`, `onSuccess?`, `onError?`
- `mutation/types.ts` - `args?: ZodType<Args>`
- `api/factory.ts` - Multiple optional params
- `api/types.ts` - `headers?`, `eventEmitter?`, `createContext?`
- `context/types.ts` - `context?`, `createContext?`, `events?`
- `router/types.ts` - `argsSchema?`, `args?`, `next?`, `options?`

---

## 5. Useless Comments (`docs/rules/comments.md`)

### Status: FIXED

All 16 useless comments removed.

---

## 6. Import Organization (`docs/rules/import-organization.md`)

### Status: FIXED

- Extra space issue (`import  {` → `import {`) resolved across all files
- Mixed type/value imports split into separate lines
- `router/builder.ts` mid-file import still needs relocation (see pending)

### Issue 3: Mid-File Import (PENDING)

`router/builder.ts` has an import at line 80 (mid-file).

---

## 7. Exported Classes (`docs/rules/no-exported-classes.md`)

### Assessment: Acceptable (Internal Use)

| Class | File | Status |
|-------|------|--------|
| `QueryBuilder` | `query/builder.ts` | Internal - used via `createAPI` factory |
| `EventEmitter` | `events/emitter.ts` | Internal - users use `defineEvents` factory |

**Note:** Exception classes (`ServerException`, `UnauthorizedException`, etc.) are legitimate public API.

---

## 8. Type Enrichment (`docs/rules/type-enrichment.md`)

### Not Implemented - Opportunity Identified

Current standalone functions in `router/builder.ts`:
- `flattenRouter(router)` - should be `router.flatten()`
- `getPublicRoutes(router)` - should be `router.getPublicRoutes()`
- `getInternalRoutes(router)` - should be `router.getInternalRoutes()`
- `resolvePath(router, path)` - should be `router.resolvePath(path)`
- `validateRouter(router)` - should be `router.validate()`
- `isRouter(obj)` / `isProcedure(obj)` - should use brand checking

### Structural Checks (Should Use Branded Types)

```typescript
// Current (fragile)
export function isRouter(obj: any): obj is Router<any, any> {
  if (!obj || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) {
    if (isProcedure(obj[key])) return false;
  }
  return true;
}

// Should be (brand-based)
const isRouter = (obj: unknown): obj is Router<any, any> =>
  typeof obj === "object" && obj !== null && RouterBrand in obj;
```

---

## Recommendations Priority

### Phase 1: Quick Wins - COMPLETE
1. ~~Remove 16 useless comments~~ ✅
2. ~~Fix `import  {` spacing across all files~~ ✅
3. ~~Separate mixed type/value imports~~ ✅
4. ~~Replace inline imports with `import type`~~ ✅

### Phase 2: Type Safety
5. Replace `| undefined` with `Maybe<T>`
6. Eliminate `as any` - use proper type guards/accessors

### Phase 3: Modernization
7. Convert functions to const arrows (where valid)
8. Implement type enrichment for Router
9. Implement branded types for `isRouter`/`isProcedure`

---

## Remaining Files Requiring Attention

1. **`api/factory.ts`** - 13 `as any` (high priority)
2. **`router/builder.ts`** - mid-file import, 5 `as any`, 5 functions to convert
3. **`query/builder.ts`** - 4 `as any`
4. **`context/builder.ts`** - 1 `as any`
5. **`events/emitter.ts`** - 3 `as any`
