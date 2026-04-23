# AsyncResult interface not exported from package

## Problem

The `AsyncResult<T, E>` interface is not exported from `@deessejs/fp` v3.0.0.

Only the inner types are exported:
- `AsyncResultInner`
- `AsyncOk`
- `AsyncErr`
- `AbortError`
- `FromPromiseOptions`

## Location

`packages/fp/src/async-result/types.ts` defines the interface but `packages/fp/src/async-result/index.ts` and `packages/fp/src/index.ts` don't export it.

## Impact

Users cannot properly type `AsyncResult` in their code:

```typescript
// This fails - AsyncResult is not exported
import { type AsyncResult } from '@deessejs/fp';

const fetchUser = (id: number): AsyncResult<User, Error> => { ... };
```

## Suggested Fix

Add to `packages/fp/src/async-result/index.ts`:

```typescript
export type { AsyncResult } from "./types";
```
