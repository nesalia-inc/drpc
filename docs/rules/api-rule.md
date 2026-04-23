# API Rule - "L'Explicite plutot que l'Implicite"

## Rule

**No magic strings - use typed constants.**
**Result contracts - no throws for business logic.**

## Why

Magic strings create invisible dependencies:
- Typos compile fine, fail at runtime
- No autocomplete for string values
- Refactoring requires finding all usages
- Tests must match against undocumented values

Throwing exceptions for business logic breaks Result-based error handling.

## Anti-Patterns (Forbidden)

```typescript
// WRONG - magic strings
const handleEvent = (event: string) => {
  if (event === "user:created") { /* ... */ }
  if (event === "user:updated") { /* ... */ }
};

// WRONG - magic string in API
fetch("/api/users")
fetch("/api/orders")
// Typo compiles: "/api/user" silently fails!

// WRONG - throwing for business logic
const createUser = (input: UserInput): User => {
  if (!isValid(input)) {
    throw new ValidationError("Invalid input"); // Should return Result!
  }
  return db.save(input);
};

// WRONG - error codes as strings
const process = (code: string) => {
  if (code === "ERR_NOTALLOWED") { /* ... */ }
  if (code === "ERR_NOTFOUND") { /* ... */ }
};

// WRONG - magic numbers
if (status === 1) { /* active */ }
if (status === 2) { /* pending */ }
```

## Correct Patterns

### 1. Typed Constants

```typescript
// GOOD - typed constants
const Event = {
  USER_CREATED: "user:created",
  USER_UPDATED: "user:updated",
  ORDER_PLACED: "order:placed",
} as const;

type EventType = typeof Event[keyof typeof Event];

// GOOD - enum alternative (when appropriate)
enum EventType {
  UserCreated = "user:created",
  UserUpdated = "user:updated",
  OrderPlaced = "order:placed",
}

// GOOD - route constants
const Route = {
  USERS: "/api/users",
  ORDERS: "/api/orders",
  HEALTH: "/api/health",
} as const;

fetch(Route.USERS); // Autocomplete works!

// GOOD - status constants
const Status = {
  ACTIVE: 1,
  PENDING: 2,
  INACTIVE: 0,
} as const;

// GOOD - error constants
const ErrorCode = {
  NOT_FOUND: "ERR_NOT_FOUND",
  NOT_ALLOWED: "ERR_NOT_ALLOWED",
  VALIDATION_FAILED: "ERR_VALIDATION_FAILED",
} as const;
```

### 2. Result for Business Logic (No Throws)

```typescript
// WRONG - throwing for expected failures
const findUser = (id: string): User => {
  const user = db.find(id);
  if (!user) throw new NotFoundError(`User ${id} not found`);
  return user;
};

// GOOD - Result for expected failures
const findUser = (id: string): Maybe<User> =>
  fromNullable(db.find(id));

// WRONG - throwing for validation
const createUser = (input: Input): User => {
  if (!isValid(input)) throw new ValidationError("Invalid");
  return db.create(input);
};

// GOOD - Result for operations that can fail
const createUser = (input: Input): Result<User> => {
  const validation = validate(input);
  if (!validation.ok) return err(validation.error);
  return ok(db.create(validation.value));
};

// GOOD - typed error contracts
const UserError = {
  NotFound: (id: string) => ({ code: "USER_NOT_FOUND", id }),
  AlreadyExists: (email: string) => ({ code: "USER_EXISTS", email }),
  InvalidInput: (fields: string[]) => ({ code: "INVALID_INPUT", fields }),
} as const;

type UserError = ReturnType<typeof UserError[keyof typeof UserError]>;

const findUser = (id: string): Result<User, UserError> => {
  const user = db.find(id);
  return user ? ok(user) : err(UserError.NotFound(id));
};
```

### 3. Typed API Clients

```typescript
// GOOD - typed route object
const API = {
  users: {
    list: () => fetch(Route.USERS),
    get: (id: string) => fetch(`${Route.USERS}/${id}`),
    create: (data: UserInput) => fetch(Route.USERS, { method: "POST", body: JSON.stringify(data) }),
  },
  orders: {
    list: () => fetch(Route.ORDERS),
    get: (id: string) => fetch(`${Route.ORDERS}/${id}`),
  },
} as const;

// GOOD - request builder with typed methods
const request = <T>(config: RequestConfig): Promise<Result<T>> =>
  fetch(config.url, config)
    .then(response => ok(response.json() as T))
    .catch(error => err(error));

// GOOD - API with full type safety
const createAPIClient = (baseUrl: string) => ({
  get: <T>(path: string) => request<T>({ url: baseUrl + path, method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>({ url: baseUrl + path, method: "POST", body: JSON.stringify(body) }),
});
```

## Constants Structure

```typescript
// GOOD - organized constants by domain
export const UserEvent = {
  CREATED: "user:created",
  UPDATED: "user:updated",
  DELETED: "user:deleted",
} as const;

export const UserStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
} as const;

export const UserError = {
  NOT_FOUND: "USER_NOT_FOUND",
  ALREADY_EXISTS: "USER_ALREADY_EXISTS",
} as const;

// GOOD - use in code
const handleUserEvent = (event: typeof UserEvent[keyof typeof UserEvent]) => {
  switch (event) {
    case UserEvent.CREATED:
      return handleUserCreated();
    case UserEvent.UPDATED:
      return handleUserUpdated();
    case UserEvent.DELETED:
      return handleUserDeleted();
  }
};
```

## Enforcement

- No magic strings in production code
- All string constants must have typed definitions
- Business logic must return `Result` or `Maybe`, not throw
- ESLint: ban magic strings via `no-magic-literals` rule
- Code review: flag untyped string constants

## Quick Reference

| Anti-Pattern | Solution |
|-------------|----------|
| Magic string `"user:created"` | `const Event = { USER_CREATED: "user:created" }` |
| Magic number `status === 1` | `const Status = { ACTIVE: 1 }` |
| Throwing on validation | Return `Result.err()` |
| Untyped API paths | `const Route = { USERS: "/api/users" }` |
