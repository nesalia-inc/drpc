# Add generic reduce function for functional array accumulation

## Problem

There is no generic `reduce` function in `@deessejs/fp` v3.0.0, which limits functional composition patterns.

## Use Case

When traversing a path (like `resolvePath` in a router), users need to accumulate over an array of parts:

```typescript
// Current workaround - imperative
const resolvePath = (router, path) => {
  let current = router;
  for (const part of path.split('.')) {
    if (current == null) return none();
    current = current[part];
  }
  return fromNullable(current);
};

// Desired - functional with reduce
const resolvePath = (router, path) =>
  pipe(
    path.split('.'),
    reduce(router, (current, part) => flatMap(fromNullable(current), c => fromNullable(c[part])))
  );
```

## Suggested Solution

Add a curried `reduce` function for better pipe composition:

```typescript
export const reduce = <T, U>(
  initial: U,
  fn: (acc: U, item: T, index: number) => U
) => (array: T[]): U => array.reduce(fn, initial);
```

## Why This Matters

- Enables functional path traversal patterns
- Allows accumulating over arrays with proper type safety
- Complements existing `pipe`, `flow`, `traverse` for array operations
