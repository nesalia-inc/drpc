# No Exported Classes Rule

## Rule

**Classes must never be exported as public API for end users.** Internal classes may be used for implementation simplicity, but only within a data-driven architecture—not as Manager, Handler, Builder, or similar patterns.

## Why

Class-based APIs for end users create problems:
- **Tight coupling** - Users inherit implementation details
- **Hard to compose** - Cannot easily transform, combine, or mock
- **State isolation issues** - Classes carry mutable state that leaks
- **Testing difficulty** - Requires instantiation with all dependencies
- **OOP lock-in** - Once you export a class, you cannot change it without breaking users

## Anti-Patterns (Forbidden in Public API)

```typescript
// WRONG - DataProcessor is a "Manager"
export class DataProcessor {
  constructor(private db: Database) {}
  process(data: Input): Output { ... }
}
export const processor = new DataProcessor(db);

// WRONG - QueryBuilder is a "Builder" pattern
export class QueryBuilder<T> {
  where(condition: Condition): this { ... }
  orderBy(field: string): this { ... }
  limit(n: number): this { ... }
  build(): Query<T> { ... }
}

// WRONG - EventHandler is a "Handler"
export class EventHandler {
  on(event: string, callback: () => void): void { ... }
  off(event: string): void { ... }
  emit(event: string): void { ... }
}
```

## Data-Driven Alternative (Correct)

```typescript
// GOOD - Pure function with data
export const processData = (input: Input, db: Database): Output => { ... };

// GOOD - Configuration object (data, not class)
export const createQuery = (config: QueryConfig): Query => { ... };

// GOOD - Event emitter factory (data-driven)
export const createEventEmitter = (events: EventMap): EventEmitter => { ... };
```

## When Internal Classes ARE Allowed

Internal classes may be used **only** for implementation simplicity within a data-driven architecture:

```typescript
// INTERNAL - Not exported, used to implement a data-driven function
class CacheEntry<T> {
  constructor(
    public readonly value: T,
    public readonly expiresAt: number,
  ) {}

  isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }
}

// INTERNAL - Data-driven storage
const createCache = <T>(entries: Map<string, CacheEntry<T>>) => ({
  get: (key: string) => /* ... */,
  set: (key: string, value: T, ttl: number) => /* ... */,
});

// PUBLIC - Data-driven API (function returning data/manipulators)
export const createCache = <T>(ttlMs: number): Cache<T> => {
  const entries = new Map<string, CacheEntry<T>>();
  return createCacheStorage(entries, ttlMs);
};
```

## Key Distinction: Data vs. Process

| Pattern | Data-Driven Alternative |
|---------|------------------------|
| `Manager` | `createManager(config)` returns data/manipulators |
| `Builder` | `buildQuery(config)` returns query data |
| `Handler` | `handle(event, state)` pure function |
| `Processor` | `process(input, ctx)` pure function |
| `Service` | `createService(deps)` returns functional API |

## Rule for Internal Classes (If Used)

1. **Never export the class itself** - Only functions that create/use it
2. **Data-driven internal storage** - Use data structures, not methods
3. **Pure functions manipulate data** - No business logic in classes
4. **Prefer composition** - Small data objects combined by functions

## Enforcement

- Public exports must be functions or interfaces (type aliases), never classes
- Internal classes may exist but must be implementation details
- Code review will flag exported classes

## Example Transformation

```typescript
// BAD - Exported class
export class UserManager {
  constructor(private db: Database) {}
  findById(id: string): Promise<User> { ... }
  create(data: CreateUserInput): Promise<User> { ... }
  update(id: string, data: UpdateUserInput): Promise<User> { ... }
}

// GOOD - Data-driven API
export const findUserById = (id: string, db: Database): Maybe<User> => { ... };
export const createUser = (data: CreateUserInput, db: Database): Result<User> => { ... };
export const updateUser = (id: string, data: UpdateUserInput, db: Database): Result<User> => { ... };

// Or grouped functionally
export const createUserAPI = (db: Database) => ({
  findById: (id: string) => findUserById(id, db),
  create: (data: CreateUserInput) => createUser(data, db),
  update: (id: string, data: UpdateUserInput) => updateUser(id, data, db),
});
```
