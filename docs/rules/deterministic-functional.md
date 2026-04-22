# Deterministic Functional Approach Rule

## Rule

**Write code that is deterministic and maximizes functional programming principles.** Prefer pure functions, immutability, and predictable behavior.

## Core Principles

### 1. Determinism

Code produces the same output for the same input, always.

```typescript
// WRONG - Non-deterministic (depends on external state)
let counter = 0;
const increment = () => counter++;

// GOOD - Deterministic
const increment = (n: number) => n + 1;
```

### 2. Pure Functions (with Controlled Side Effects)

Pure functions are preferred, but side effects are **mandatory** at some point (DB access, HTTP requests, file I/O, etc.). The key is to **control and isolate** them.

```typescript
// WRONG - Uncontrolled side effects, no isolation
const getUser = (id: string) => {
  const db = openDatabase(); // Side effect embedded in function
  return db.query(`SELECT * FROM users WHERE id = ${id}`);
};

// GOOD - Controlled side effects through dependency injection
const getUser = (id: string, db: Database): Maybe<User> =>
  db.query("SELECT * FROM users WHERE id = ?", [id]);

// GOOD - Side effects isolated at the boundary
const queryUser = (id: string): Maybe<User> => {
  const db = createDatabaseConnection(); // Controlled, explicit
  return getUser(id, db);
};
```

### 3. Immutability

Never mutate existing data; create new data instead.

```typescript
// WRONG - Mutation
const updateUser = (user: User) => {
  user.name = newName;
  return user;
};

// GOOD - Immutable
const updateUser = (user: User, newName: string): User => ({
  ...user,
  name: newName
});
```

### 4. Avoid Non-Deterministic Behavior

```typescript
// WRONG - Random behavior
const shuffle = (items: Item[]) => items.sort(() => Math.random() - 0.5);

// GOOD - Deterministic shuffle (with seed)
const shuffle = (items: Item[], seed: number): Item[] => {
  const random = createSeededRandom(seed);
  return [...items].sort(() => random() - 0.5);
};

// WRONG - Date-based (non-deterministic)
const getSessionId = () => `${userId}-${Date.now()}`;

// GOOD - Deterministic unique ID
const getSessionId = (userId: string, counter: number) => `${userId}-${counter}`;
```

## Functional Patterns to Prefer

### Composition over Mutation

```typescript
// WRONG - Step-by-step mutation
const process = (data: Data) => {
  let result = transform(data);
  result = filter(result);
  result = sort(result);
  return result;
};

// GOOD - Composition
const process = pipe(transform, filter, sort);
```

### Declarative over Imperative

```typescript
// WRONG - Imperative
const findUser = (users: User[], id: string): User | null => {
  for (const user of users) {
    if (user.id === id) return user;
  }
  return null;
};

// GOOD - Declarative
const findUser = (users: User[], id: string): Maybe<User> =>
  users.find(user => user.id === id) ?? null;
```

### Map/Filter/Reduce over Loops

```typescript
// WRONG - Imperative loop
const getActiveUserNames = (users: User[]): string[] => {
  const names: string[] = [];
  for (const user of users) {
    if (user.active) names.push(user.name);
  }
  return names;
};

// GOOD - Functional
const getActiveUserNames = (users: User[]): string[] =>
  users.filter(u => u.active).map(u => u.name);
```

### Value Objects over Classes

```typescript
// WRONG - Class with mutable state
class Money {
  constructor(public amount: number, public currency: string) {}
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error();
    return new Money(this.amount + other.amount, this.currency);
  }
}

// GOOD - Immutable data structure
const money = (amount: number, currency: string): Money => ({ amount, currency });
const addMoney = (a: Money, b: Money): Money =>
  a.currency === b.currency
    ? money(a.amount + b.amount, a.currency)
    : throwCurrencyMismatch();
```

## Determinism in Testing

Tests must be deterministic - they should pass every time:

```typescript
// WRONG - Flaky test (random data, time-dependent)
test("generates unique IDs", () => {
  const ids = new Set(generateIds(100));
  expect(ids.size).toBe(100); // Could fail due to collision
});

// GOOD - Deterministic test
test("generates sequential IDs", () => {
  const ids = generateIds(3, { start: 0, seed: 42 });
  expect(ids).toEqual(["id-0", "id-1", "id-2"]);
});
```

## Enforcement

- Prefer pure functions that return new data
- No mutation of parameters
- Deterministic behavior (same input → same output)
- Use composition and declarative patterns
- Immutable data structures

## Quick Reference

| Anti-Pattern | Functional Alternative |
|--------------|------------------------|
| Mutable variables | Constant values + new objects |
| for/while loops | map/filter/reduce/find |
| null returns | Maybe/Result types |
| Uncontrolled side effects | Controlled side effects (DI, explicit) |
| Mutable global state | Context passed explicitly |
| Random behavior | Seeded deterministic functions |
