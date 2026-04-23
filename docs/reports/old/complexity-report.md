# Complexity Report

Generated: 2026-04-15

## ESLint Complexity Rule

**Rule:** `complexity: ["error", 5]`

The complexity metric measures cyclomatic complexity - the number of linear independent paths through a function. Each function starts at 1, and +1 is added for each: `if`, `else if`, `switch case`, `for`, `while`, `do while`, `&&`, `||`, `catch`, ternary operator `? :`.

## Complexity Thresholds

| Score | Level |
|-------|-------|
| 1-5   | Clear, easy to maintain |
| 6-10  | Reasonable limit |
| 11-20 | Complex, refactoring advised |
| 21+   | High risk, refactoring mandatory |

## Violations

### Critical (> 10)

| File | Function | Complexity |
|------|----------|------------|
| `src/events/emitter.ts` | `isWildcardMatch` | 11 |
| `src/events/emitter.ts` | `emit` | 10 |
| `src/api/factory.ts` | line 130 (async arrow) | 19 |

### High (8-10)

| File | Function | Complexity |
|------|----------|------------|
| `src/api/factory.ts` | `get` | 10 |
| `src/events/emitter.ts` | `flattenEvents` | 10 |
| `src/events/emitter.ts` | `getWildcardHandlers` | 9 |
| `src/api/factory.ts` | `get` (line 224) | 9 |
| `src/events/emitter.ts` | `off` | 8 |
| `src/api/factory.ts` | `executeProcedure` | 8 |

### Moderate (6-7)

| File | Function | Complexity |
|------|----------|------------|
| `src/events/emitter.ts` | `on` | 6 |
| `src/events/queue.ts` | `flush` | 6 |
| `src/router/builder.ts` | `resolvePath` | 6 |
| `src/api/factory.ts` | `filterPublicRouter` | 6 |
| `src/router/builder.ts` | line 92 (arrow fn) | 7 |

## Other ESLint Errors

### `@typescript-eslint/no-unused-vars`

| File | Line | Description |
|------|------|-------------|
| `src/api/factory.ts` | 1 | `'ok' is defined but never used` |

### `@typescript-eslint/no-explicit-any`

| File | Lines | Count |
|------|-------|-------|
| `src/middleware/helpers.ts` | 24, 25, 67, 68 | 16 |
| `src/router/types.ts` | 3 | 1 |
| `src/types.ts` | 63, 65 | 4 |

**Total: 21 `any` occurrences**

## Summary

| Category | Count |
|----------|-------|
| Complexity violations | 18 |
| `no-unused-vars` | 1 |
| `no-explicit-any` | 21 |
| **Total errors** | **40** |

## Files to Refactor

1. **`src/events/emitter.ts`** - 6 complexity violations, highest score (11)
2. **`src/api/factory.ts`** - 5 complexity violations, includes worst offender (19)
3. **`src/middleware/helpers.ts`** - 16 `any` type violations
4. **`src/router/builder.ts`** - 2 complexity violations
5. **`src/events/queue.ts`** - 1 complexity violation