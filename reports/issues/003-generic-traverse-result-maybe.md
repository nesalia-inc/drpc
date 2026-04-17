# Generic traverse for Result and Maybe types

## Problem

`traverse` only exists for `AsyncResult`, but users need it for `Result` and `Maybe` as well.

## Current State

```typescript
// AsyncResult.traverse exists
const results = await traverse(ids, id => fromPromise(fetchUser(id)));

// Result.traverse does not exist
```

## Use Case

Processing an array of items where each transformation can fail:

```typescript
// Current workaround - manual loop
const processItems = (items: string[]): Result<Item[], Error> => {
  const results: Item[] = [];
  for (const item of items) {
    const r = parseItem(item);
    if (!r.ok) return err(r.error);
    results.push(r.value);
  }
  return ok(results);
};

// Desired - traverse pattern
const processItems = (items: string[]) =>
  traverse(items, parseItem); // Result<Item[], Error>
```

## Suggested Solution

Add traverse for Result and Maybe:

```typescript
export const traverseResult = <T, U, E>(
  array: T[],
  fn: (item: T) => Result<U, E>
): Result<U[], E> => {
  const results: U[] = [];
  for (const item of array) {
    const result = fn(item);
    if (!result.ok) return result;
    results.push(result.value);
  }
  return ok(results);
};

export const traverseMaybe = <T, U>(
  array: T[],
  fn: (item: T) => Maybe<U>
): Maybe<U[]> => { ... };
```

## Why This Matters

- Consistent API across all container types
- Enables declarative array processing with fallibility
- Matches patterns available in other fp libraries (fp-ts, neverthrow)
