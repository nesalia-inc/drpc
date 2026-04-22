# Reduce Duplication Rule

## Rule

**Regroup duplicated logic into shared modules.** Common patterns should be extracted into internal modules within a package or split into separate packages.

## Why

- **DRY (Don't Repeat Yourself)** - One change, one place
- **Consistency** - Same behavior everywhere
- **Maintainability** - Fix once, works everywhere
- **Readability** - Smaller, focused modules
- **Testability** - Test shared logic once

## Anti-Patterns (Forbidden)

### Duplicated Logic Across Files

```typescript
// WRONG - Same validation in multiple places
// file1.ts
const validateUserId = (id: unknown): boolean =>
  typeof id === "string" && id.length > 0;

// file2.ts
const validateUserId = (id: unknown): boolean =>
  typeof id === "string" && id.length > 0;

// file3.ts
const validateUserId = (id: unknown): boolean =>
  typeof id === "string" && id.length > 0;
```

### Similar But Slightly Different Functions

```typescript
// WRONG - Three nearly identical functions
const getUserById = (id: string, db: Database): Maybe<User> => { /* ... */ };
const getPostById = (id: string, db: Database): Maybe<Post> => { /* ... */ };
const getCommentById = (id: string, db: Database): Maybe<Comment> => { /* ... */ };
```

## Correct Patterns

### 1. Extract to Shared Module

```typescript
// shared/validation.ts
const validateId = (id: unknown): boolean =>
  typeof id === "string" && id.length > 0;

export { validateId };

// file1.ts, file2.ts, file3.ts - all import from shared
import { validateId } from "../shared/validation.ts";
```

### 2. Generic Functions for Similar Logic

```typescript
// shared/get-by-id.ts
const getById = <T>(
  id: string,
  db: Database,
  table: string,
  mapper: (row: Row) => T
): Maybe<T> => {
  const row = db.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  return row ? some(mapper(row)) : none();
};

// usage
const getUserById = (id: string) => getById(id, db, "users", mapUser);
const getPostById = (id: string) => getById(id, db, "posts", mapPost);
```

### 3. Create Internal Package for Cross-Cutting Concerns

```
packages/
├── shared/
│   └── src/
│       ├── validation.ts
│       ├── errors.ts
│       └── result.ts
└── server/
    └── src/
        └── (imports from @deessejs/shared)
```

## When to Create a Separate Package

Consider extracting to a new package when:
- Logic is used across **multiple packages** in the monorepo
- Logic is **stable** and unlikely to change often
- Logic has **no package-specific dependencies**
- The module makes sense as a standalone library

## Package Structure for Shared Logic

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Public exports
    ├── validation.ts     # Validation utilities
    ├── types.ts          # Shared types
    └── internal/         # Internal implementation
```

## Enforcement

- During code review, flag any duplicated logic
- Before adding similar code, check if existing shared module exists
- Extract to shared module when duplication is found
- Create new package when logic is used across multiple packages

## Quick Reference

| Scenario | Action |
|----------|--------|
| Same code in 2+ files | Extract to shared module |
| Similar functions with same pattern | Create generic function |
| Shared across packages | Create internal package |
| Validation logic | Create `validation.ts` module |
| Error handling | Create `errors.ts` module |
| Type utilities | Create `types.ts` module |

## Checklist

Before adding new logic, ask:
1. Does similar logic exist elsewhere?
2. Could this be generalized with generics?
3. Is this used by multiple packages?
4. Should this be a separate package?

If yes to any, extract first.
