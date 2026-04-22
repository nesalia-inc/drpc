# Separate Types from Functions Rule

## Rule

**Types and interfaces must not be defined inside files that contain function implementations.**

Functions (implementations) and type definitions must be kept in separate files.

## Why

Separating types from implementations improves:
- **Code organization** - Clear distinction between "what is" (types) and "what does" (functions)
- **Maintainability** - Types can be imported independently without pulling in implementation logic
- **Readability** - Implementation files remain focused on logic, not type scaffolding
- **Partial imports** - Consumers can import only what they need

## Correct Pattern

**BAD (mixed file):**
```typescript
// utils.ts - MIXING TYPES AND FUNCTIONS
export interface UserMetadata {
  id: string;
  role: "admin" | "user";
}

export function getUserId(user: UserMetadata): string {
  return user.id;
}

export function isAdmin(user: UserMetadata): boolean {
  return user.role === "admin";
}
```

**GOOD (separated):**
```
// types/user.ts
export interface UserMetadata {
  id: string;
  role: "admin" | "user";
}

// utils/user.ts
import type { UserMetadata } from "../types/user.ts";

export function getUserId(user: UserMetadata): string {
  return user.id;
}

export function isAdmin(user: UserMetadata): boolean {
  return user.role === "admin";
}
```

## Directory Structure Recommendation

```
src/
├── types/           # All type definitions (.ts files with types only)
│   ├── user.ts
│   ├── api.ts
│   └── index.ts
└── utils/            # All function implementations
    ├── user.ts
    ├── api.ts
    └── index.ts
```

## Enforcement

This rule is checked during code reviews. If you find yourself adding `interface` or `type` declarations inside a function/implementation file, create a separate types file and move the type definitions there.
