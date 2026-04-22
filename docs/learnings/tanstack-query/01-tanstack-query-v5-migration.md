# TanStack Query v5 Migration Guide

**Date:** 2026-04-22
**Risk:** Medium-High
**From:** v4.x to v5.x (Current project: v5.0.0, Latest: v5.99.2)

## Important Note

The current project is on @tanstack/react-query at v5.0.0. The update from v5.0.0 to v5.99.2 is within v5 and contains **no breaking changes** - only patch fixes and minor features.

The breaking changes documented here are from **v4 to v5** migration. If your project was already on v5.0.0, you can safely update to v5.99.2 without any code changes.

---

## Summary of Breaking Changes

| Category | Change | Impact |
|----------|--------|--------|
| API Signature | Object-only format required | High |
| TypeScript | Minimum version 4.7 | Low |
| React | Minimum version 18.0 | Medium |
| Callbacks | Removed from useQuery | Medium |
| Status | loading to pending | Medium |
| Hydration | Hydrate to HydrationBoundary | Medium |
| Options | cacheTime to gcTime | Low |

---

## 1. API Signature Changes - Object Format Only

All hooks now require object format only - positional arguments are no longer supported.

### Before (v4 - Multiple Overloads)

useQuery(key, fn, options)
useQuery({ queryKey, queryFn, ...options })
useInfiniteQuery(key, fn, options)
useInfiniteQuery({ queryKey, queryFn, ...options })
useMutation(fn, options)
useMutation({ mutationFn, ...options })

### After (v5 - Object Only)

useQuery({ queryKey, queryFn, ...options })
useInfiniteQuery({ queryKey, queryFn, ...options })
useMutation({ mutationFn, ...options })
useIsFetching({ queryKey, ...filters })
useIsMutating({ mutationKey, ...filters })

### Codemod Available

For JS/JSX files:
npx jscodeshift@latest ./path/to/src/ --extensions=js,jsx --transform=./node_modules/@tanstack/react-query/build/codemods/src/v5/remove-overloads/remove-overloads.cjs

For TS/TSX files:
npx jscodeshift@latest ./path/to/src/ --extensions=ts,tsx --parser=tsx --transform=./node_modules/@tanstack/react-query/build/codemods/src/v5/remove-overloads/remove-overloads.cjs

---

## 2. Callbacks Removed from useQuery

onSuccess, onError, and onSettled callbacks have been removed from queries (still work on useMutation).

---

## 3. refetchInterval Callback Change

The refetchInterval callback now only receives query parameter, not data.

---

## 4. Removed remove Method from useQuery

Use queryClient.removeQueries({ queryKey }) instead.

---

## 5. TypeScript Version Requirement

Minimum TypeScript version is now 4.7

---

## 6. Removed isDataEqual Option

Use structuralSharing instead with replaceEqualDeep.

---

## 7. Renamed Options

- cacheTime -> gcTime
- useErrorBoundary -> throwOnError
- hashQueryKey -> hashKey

---

## 8. Status Renames

Query Status:
- status: loading -> status: pending
- isLoading: true -> isPending: true
- isInitialLoading -> deprecated, use isLoading

Mutation Status:
- status: loading -> status: pending
- isLoading: true -> isPending: true

New isLoading for Queries = isPending && isFetching

---

## 9. keepPreviousData -> placeholderData

Use placeholderData: keepPreviousData instead of keepPreviousData: true.

---

## 10. Infinite Query Changes

- Required initialPageParam
- refetchPage -> maxPages
- Manual mode removed
- null now indicates no more pages

---

## 11. React 18 Required

Minimum React version is now 18.0 due to useSyncExternalStore requirement.

---

## 12. Hydration API Changes

- Hydrate component renamed to HydrationBoundary
- useHydrate hook removed

---

## 13. Removed context Prop

Pass queryClient directly as second argument instead of context prop.

---

## 14. Removed contextSharing Prop

Use shared queryClient instance instead.

---

## 15. Removed unstable_batchedUpdates

No longer needed in React 18.

---

## 16. Dehydration API Changes

dehydrateMutations/dehydrateQueries booleans replaced with shouldDehydrateQuery/shouldDehydrateMutation functions.

---

## 17. Query Defaults Merge Behavior

queryClient.setQueryDefaults now merges all matching registrations from most generic to most specific.

---

## 18. Network Status Detection

No longer relies on navigator.onLine. Uses online/offline events exclusively.

---

## 19. Server Retry Behavior

On server: retry defaults to 0 (was 3).

---

## Migration Effort Estimate

| Change Type | Effort |
|-------------|--------|
| API signature changes | 2-4 hours with codemod |
| Status renames | 1-2 hours |
| Hydration API | 30 minutes |
| Infinite query changes | 1-2 hours |
| Other changes | 1-2 hours |

**Total: 4-8 hours depending on codebase size**

---

## References

- Official Migration Guide: https://tanstack.com/query/v5/docs/react/guides/migrating-to-v5
- Announcement Post: https://tanstack.com/blog/announcing-tanstack-query-v5
- v5.0.0 Release: https://github.com/TanStack/query/releases/tag/v5.0.0
