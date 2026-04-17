# @deessejs/server - Remaining Issues Report

## Status Overview

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 3 | 3 | 0 |
| High | 6 | 2 | 4 |
| Medium | 13 | 0 | 13 |
| Pre-existing | 1 | 0 | 1 |
| **Total** | **23** | **5** | **18** |

---

## ✅ Fixed Issues (5)

| # | Issue | Fix Date |
|---|-------|----------|
| 1 | Mutation auto-invalidation not working | Fixed |
| 2 | QueryClientProvider missing in example | Fixed |
| 3 | ServerException thrown → INTERNAL_ERROR | Fixed |
| 4 | createAPI returning `any` | Fixed |
| 5 | getNestedProperty using `any` extensively | Fixed |
| 6 | Middleware losing `ctx` typed context | Fixed |
| 7 | Event `payload.data` not typed | Fixed |

---

## ❌ HIGH Priority (4 remaining)

### H1: No Per-Procedure Middleware
**Severity:** HIGH
**File:** `package/server/src/api/factory.ts`
**Description:** Only global middleware exists. Middleware cannot be attached to individual procedures like tRPC's `procedure.use(authMiddleware)`.
**Impact:** Cannot apply authorization/rate-limiting to specific procedures.
**Reference:** `router-middleware-analysis.md`

### H2: No Protected Procedure Pattern
**Severity:** HIGH
**File:** `package/server/src/query/builder.ts`, `package/server/src/types.ts`
**Description:** Cannot create reusable authenticated procedures like tRPC's `protectedProcedure` or `adminProcedure`.
**Impact:** Every protected procedure must repeat middleware logic.
**Reference:** `router-middleware-analysis.md`

### H3: No Input Validation
**Severity:** HIGH
**File:** `package/server/src/api/factory.ts`
**Description:** `argsSchema` is defined on procedures but never validated. `executeProcedure` passes raw args directly to handler without calling `argsSchema.parse(args)`.
**Impact:** Invalid inputs cause runtime errors instead of early validation errors. Zod dependency provides no actual validation benefit.
**Reference:** `router-middleware-analysis.md`

### H4: No Per-Request Context
**Severity:** HIGH
**File:** `package/server/src/api/factory.ts:154-162`
**Description:** Context is provided as a static value at API creation time, not a factory called per-request. Cannot access HTTP headers/cookies for authentication.
**Impact:** Cannot implement real authentication. Context shared across all concurrent requests.
**Reference:** `router-middleware-analysis.md`

---

## ❌ MEDIUM Priority (13 remaining)

### M1: FORBIDDEN/CONFLICT Missing from ErrorCodes
**Severity:** MEDIUM
**File:** `package/server/src/errors/server-error.ts:47-54`
**Description:** `ErrorCodes` constant is missing `FORBIDDEN` and `CONFLICT`, but `errorToStatusMap` in server-hono has them.
**Impact:** Compile error if developers try to use `ErrorCodes.FORBIDDEN`.
**Reference:** `error-handling-analysis.md`

### M2: Custom Error Data Lost in Serialization
**Severity:** MEDIUM
**Files:** `package/server/src/errors/types.ts`, `packages/server-hono/src/createHonoHandler.ts`, `packages/client/src/createClient.ts`
**Description:** `ServerError` interface only has `{ code, message }`. Custom data like `{ resource, id }` from `NotFoundError` is lost during serialization.
**Impact:** Clients cannot programmatically handle specific error scenarios.
**Reference:** `error-handling-analysis.md`

### M3: Client Doesn't Handle Malformed JSON
**Severity:** MEDIUM
**File:** `packages/client/src/createClient.ts:19-20`
**Description:** `response.json()` is not wrapped in try-catch. Non-JSON error responses (proxy errors, HTML) crash the client.
**Impact:** Client crashes on infrastructure-level failures.
**Reference:** `error-handling-analysis.md`

### M4: eventLog Memory Leak
**Severity:** MEDIUM
**File:** `package/server/src/events/emitter.ts:5,73,90-96`
**Description:** `eventLog` array grows indefinitely with no automatic cleanup. No size limit, TTL, or automatic eviction.
**Impact:** Long-running applications accumulate unbounded memory.
**Reference:** `event-system-analysis.md`

### M5: Race Condition - Parallel Handler Execution
**Severity:** MEDIUM
**File:** `package/server/src/events/emitter.ts:78-87`
**Description:** `Promise.all()` runs handlers in parallel with no ordering guarantees.
**Impact:** Audit logs may appear out of order. Callers expecting sequential processing cannot rely on current implementation.
**Reference:** `event-system-analysis.md`

### M6: flush() Mid-Loop Failure
**Severity:** MEDIUM
**File:** `package/server/src/events/queue.ts:28-37`
**Description:** If `emitter.emit()` throws mid-loop, remaining events are lost and `_events = []` is never reached.
**Impact:** Any event emission failure mid-flush results in permanent data loss.
**Reference:** `event-system-analysis.md`

### M7: O(n) Wildcard Matching Performance
**Severity:** MEDIUM
**File:** `package/server/src/events/emitter.ts:98-114`
**Description:** Every `emit()` iterates ALL registered patterns with O(n) complexity.
**Impact:** High-frequency event emissions with many handlers cause performance degradation.
**Reference:** `event-system-analysis.md`

### M8: SSR/Hydration Not Implemented
**Severity:** MEDIUM
**Files:** `packages/client-react/src/QueryClientProvider.tsx`, `docs/react-hooks/dx/SSR_HYDRATION.md`
**Description:** `SSR_HYDRATION.md` documents a dehydrate/hydrate pattern but `QueryClientProvider` doesn't accept `dehydratedState`.
**Impact:** SSR data transfer pattern cannot be implemented.
**Reference:** `client-react-analysis.md`

### M9: Missing TanStack Query Features
**Severity:** MEDIUM
**File:** `packages/client-react/src/types.ts:3-10`
**Description:** `QueryConfig` and `MutationConfig` omit essential TanStack Query features: `enabled`, `placeholderData`, `refetchOnWindowFocus`, `onMutate`, etc.
**Impact:** Common UX patterns require manual implementation.
**Reference:** `client-react-analysis.md`

### M10: Leading Wildcards Not Supported
**Severity:** MEDIUM
**File:** `package/server/src/events/emitter.ts:116-136`
**Description:** Only suffix wildcards supported (`user.*`). Pattern `*.created` does NOT match `user.created`.
**Impact:** Developers must register separate handlers for each `*.created` event.
**Reference:** `event-system-analysis.md`

### M11: Error Isolation - One Throwing Handler Breaks Others
**Severity:** MEDIUM
**File:** `package/server/src/events/emitter.ts:87`
**Description:** `Promise.all()` has fail-fast semantics. One buggy handler breaks all others.
**Impact:** A failing audit logger prevents email notifications from running.
**Reference:** `event-system-analysis.md`

### M12: Two-Stage Hook Creation
**Severity:** MEDIUM
**File:** `packages/client-react/src/createQuery.ts:11`
**Description:** Pattern `createQuery(client, 'users.list')` returns a function that must be called to get the hook, unlike tRPC's direct `useQuery()`.
**Impact:** More verbose API compared to tRPC.
**Reference:** `client-react-analysis.md`

### M13: No Error Boundaries
**Severity:** MEDIUM
**File:** N/A
**Description:** `@deessejs/client-react` does not export or integrate error boundary functionality.
**Impact:** Less graceful error handling in React components.
**Reference:** `client-react-analysis.md`

---

## ❌ PRE-EXISTING (Not Introduced By Us)

### P1: server-next Type Errors
**Severity:** Pre-existing
**File:** `packages/server-next/src/createNextHandler.ts:25-30`
**Description:** TypeScript error TS2322: Hono type mismatch. The handler returns `(req: Request) => Response` but type expects `(app: Hono) => (req: Request) => Response`.
**Impact:** `packages/server-next` fails typecheck.
**Status:** Pre-existing issue, not introduced by recent fixes.

---

## Priority Matrix

| Priority | Count | Items |
|----------|-------|-------|
| P1 (Must fix before production) | 4 | H1, H2, H3, H4 |
| P2 (Should fix before broader adoption) | 9 | M1, M2, M3, M4, M5, M6, M7, M8, M9 |
| P3 (Feature parity) | 4 | M10, M11, M12, M13 |
| Pre-existing | 1 | P1 |

---

## Quick Wins (High Impact, Low Effort)

1. **M1 (FORBIDDEN/CONFLICT)**: Add two entries to `ErrorCodes` constant - 5 minutes
2. **M3 (Malformed JSON)**: Wrap `response.json()` in try-catch - 10 minutes
3. **M4 (eventLog leak)**: Add automatic size limit with eviction - 30 minutes

---

## Major Architectural Changes Required

These issues require significant refactoring:

1. **H1 (Per-procedure middleware)**: Requires redesign of procedure builder to return new procedure with merged middleware
2. **H2 (Protected procedures)**: Requires `procedure.use()` pattern like tRPC
3. **H3 (Input validation)**: Requires calling `argsSchema.parse()` in `executeProcedure`
4. **H4 (Per-request context)**: Requires `createContext` factory pattern instead of static context

---

## Conclusion

The codebase has **18 remaining issues** across HIGH and MEDIUM priorities. The 4 HIGH priority issues prevent production-ready APIs with proper authentication, authorization, and validation. The MEDIUM issues affect developer experience, performance, and feature completeness.

The most impactful quick wins are M1 (FORBIDDEN/CONFLICT in ErrorCodes) and M3 (malformed JSON handling), which can be fixed in under 30 minutes combined.

The major architectural changes (H1-H4) would require significant refactoring but would bring the framework much closer to tRPC's feature set.
