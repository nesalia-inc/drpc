# No Generic Suffixes Rule

## Rule

**Do not use generic suffixes or prefixes in naming: `Handler`, `Manager`, `Executor`, `Service`, `Processor`, `Controller`, `Provider`, `Helper`, `Util`, `Wrapper`, `Adapter`, `Facade`, `Builder`.**

These names describe what something is (a category) rather than what it does. They are meaningless without context and indicate a missing abstraction.

## Why

Generic suffixes are signs of **missing abstraction**:

| Generic Name | Problem |
|--------------|---------|
| `UserHandler` | "Handles user" — handles what, exactly? |
| `DataManager` | "Manages data" — manages how? |
| `EventExecutor` | "Executes events" — this is tautological |
| `Service` | Everything is a "service" — means nothing |
| `Helper` | Helper for what? Helper to whom? |
| `Utils` | Collection of unrelated things |
| `Processor` | Processes what? |

These names force readers to **read the implementation** to understand what a thing does.

## Anti-Patterns

```typescript
// WRONG - Generic suffixes
export class UserHandler { }
export const EventExecutor = { };
export const DataManager = { };
export const ServiceLocator = { };
export const HelperUtils = { };
export const QueryProcessor = { };
export const CacheProvider = { };
export const ResponseFacade = { };

// WRONG - Generic prefixes
export const handleUser = { };
export const manageData = { };
export const processEvent = { };
```

## Correct Patterns

Name things by **entity** (what it operates on) and group behavior by domain object:

| Instead of | Use |
|------------|-----|
| `createUser`, `findUser`, `updateUser`, `deleteUser` | `User.create`, `User.find`, `User.update`, `User.delete` |
| `validateEmail`, `validatePassword`, `validateInput` | `EmailValidator.validate`, `PasswordValidator.validate` |
| `sendInvoice`, `sendReminder`, `sendNotification` | `InvoiceNotifier.send`, `ReminderNotifier.send` |
| `formatDate`, `formatCurrency`, `formatAddress` | `DateFormatter.format`, `CurrencyFormatter.format` |

## Entity-Oriented Naming

Group functions by the **entity** they operate on, not by the action performed:

```typescript
// WRONG - Action-oriented, flat namespace
export const createUser = (input: UserInput): Result<User> => { };
export const findUser = (id: string): Maybe<User> => { };
export const updateUser = (id: string, input: UserInput): Result<User> => { };
export const deleteUser = (id: string): Result<void> => { };

// GOOD - Entity-oriented, grouped by domain object
export const User = {
  create: (input: UserInput): Result<User> => { },
  find: (id: string): Maybe<User> => { },
  update: (id: string, input: UserInput): Result<User> => { },
  delete: (id: string): Result<void> => { },
} as const;
```

This creates a **naming hierarchy** where related operations are grouped under a common entity name:

```typescript
// Entity groups related behavior
User.create(input)
User.find(id)
User.update(id, input)
User.delete(id)

// Works for complex domains too
const Query = {
  select: (fields: string[]) => ({ /* ... */ }),
  where: (conditions: Condition[]) => ({ /* ... */ }),
  orderBy: (fields: string[]) => ({ /* ... */ }),
  limit: (n: number) => ({ /* ... */ }),
};

const Cache = {
  get: <T>(key: string) => Maybe<T>,
  set: <T>(key: string, value: T, ttl: number) => void,
  invalidate: (key: string) => void,
};
```

## Why Entity-Oriented

1. **Discoverability** - `User.` shows all user operations at once
2. **Collision avoidance** - `User.find` vs `Order.find` don't conflict
3. **Mental model** - Codebase organized by domain concepts, not verbs
4. **Consistency** - If you know one operation, you can guess others

## Relationship with No-Class Rule

Entity objects are **data-driven**, not class-based:

```typescript
// WRONG - Class-based (forbidden by no-exported-classes rule)
export class User {
  create(input: UserInput) { }
  find(id: string) { }
}

// GOOD - Object constant (data-driven, allowed)
export const User = {
  create: (input: UserInput): Result<User> => { },
  find: (id: string): Maybe<User> => { },
} as const;

// GOOD - Factory function returning entity object
export const createUserAPI = (db: Database) => ({
  create: (input: UserInput): Result<User> => { },
  find: (id: string): Maybe<User> => { },
});
```

## Generic Suffixes Still Forbidden

Even with entity-oriented naming, **generic suffixes are still bad**:

```typescript
// WRONG - Generic suffix even with entity grouping
export const UserManager = { };       // "Manager" is meaningless
export const UserService = { };       // "Service" is meaningless
export const UserRepository = { };    // "Repository" is generic

// GOOD - Entity name without generic suffix
export const User = { };
export const Order = { };
export const Product = { };
```

## Naming Hierarchy

| Level | Example | Purpose |
|-------|---------|---------|
| Entity | `User`, `Order`, `Product` | Domain object |
| Operation | `create`, `find`, `update`, `delete` | Action on entity |
| Implementation | `withCache`, `withRetry`, `withAuth` | Cross-cutting concerns |

## Name by Behavior, Not Role

```typescript
// WRONG
export class UserHandler {
  createUser() { }
  updateUser() { }
  deleteUser() { }
}

// GOOD - Name reveals behavior
export const createUser = (input: UserInput): Result<User> => { };
export const updateUser = (id: string, input: UserInput): Result<User> => { };
export const deleteUser = (id: string): Result<void> => { };

// OR - Group by purpose
export const userCommands = {
  create: (input: UserInput): Result<User> => { },
  update: (id: string, input: UserInput): Result<User> => { },
  delete: (id: string): Result<void> => { },
};
```

## When a Suffix Might Be Acceptable

In **internal implementation** only, and only if it adds meaningful distinction:

```typescript
// ACCEPTABLE - Internal implementation detail
class QueryBuilderImpl implements QueryBuilder {
  // ...
}

// ACCEPTABLE - When the suffix describes a well-known pattern
// (and the name still describes what it does)
export const createStore = () => { };  // "store" is descriptive here
export const useQuery = () => { };      // React hook convention
```

But prefer naming by **purpose over role**:

```typescript
// BETTER - Name by purpose
export const createInMemoryStore = () => { };
export const useUserQuery = () => { };
```

## When You Are Tempted to Use These Suffixes

| Temptation | Question to Ask |
|------------|-----------------|
| `*Handler` | "What action does this perform? Name that." |
| `*Manager` | "What specific resource does it manage? Name that." |
| `*Service` | "What specific service does it provide? Name that." |
| `*Processor` | "What transformation does it do? Name that." |
| `*Util` / `*Helper` | "Can this be named after what it actually does?" |

## Enforcement

- **Code review** should flag generic suffixes
- **ast-grep pattern** for detection:

```bash
# Detect common suffixes in exported names
ast-grep --lang ts --pattern 'export const $NAME = ...' .
# Where $NAME matches (Handler|Manager|Executor|Service|Processor|...)$
```

- **Renaming**: If you have `UserManager`, rename to `createUser`, `findUser`, etc.
- **Grouping**: If you have many `*Handler` functions, group them by purpose: `userHandlers.ts` (file) with named exports like `createUserHandler`.

## Rule

**Name by behavior, not by category. If you reach for "Manager", "Handler", "Service" — you're missing an abstraction that describes what the code actually does.**