# No T | undefined or T | null Rule

## Rule

**`T | undefined` and `T | null` are strictly prohibited.** Always use `Maybe<T>` from `@deessejs/fp` instead.

## Why

Using `T | undefined` or `T | null` scattered throughout code:
- Creates inconsistent handling of absence
- Leads to runtime errors from unchecked null/undefined
- Makes the codebase harder to reason about
- Results in verbose null checks scattered everywhere

`Maybe<T>` makes absence **explicit and safe** by design.

## Anti-Patterns (Forbidden)

```typescript
// WRONG - T | undefined
const getUser = (id: string): User | undefined => { /* ... */ };

// WRONG - T | null
const getConfig = (): Config | null => { /* ... */ };

// WRONG - optional parameter
function greet(name?: string): void { /* ... */ }

// WRONG - nullable field
interface User {
  email: string | null;
  phone: string | undefined;
}
```

## Correct Pattern (Use Maybe)

```typescript
import type { Maybe } from '@deessejs/fp';
import { some, none, fromNullable } from '@deessejs/fp';

// GOOD - Maybe for optional return
const getUser = (id: string): Maybe<User> => { /* ... */ };

// GOOD - Maybe for nullable config
const getConfig = (): Maybe<Config> => { /* ... */ };

// GOOD - Maybe for optional parameter
function greet(name: Maybe<string>): void { /* ... */ }

// GOOD - Maybe for nullable fields
interface User {
  email: Maybe<string>;
  phone: Maybe<string>;
}
```

## When Absence is Known at Creation

If absence is known at creation time, use `some()` or `none()` explicitly:

```typescript
import { some, none } from '@deessejs/fp';

const present: Maybe<number> = some(42);
const absent: Maybe<number> = none();
```

## When Converting from Legacy Code

Use `fromNullable()` to bridge legacy `null`/`undefined` APIs:

```typescript
import { fromNullable } from '@deessejs/fp';

// Wraps null/undefined in Maybe
const maybeUser = fromNullable(legacyGetUser(id));
```

## Enforcement

This rule is checked during code reviews. Search for `| undefined`, `| null`, `?:` patterns and replace with `Maybe<T>`.

## See Also

- [Maybe Type](.claude/skills/deesse-fp/rules/maybe.md) - Complete Maybe documentation
- [Result](./result.md) - For operations that can fail with error context
- [Try](./try.md) - For wrapping synchronous functions that might throw
