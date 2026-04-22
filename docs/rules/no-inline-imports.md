# No Inline Imports Rule

## Rule

**Inline imports are strictly prohibited** anywhere in the codebase, including but not limited to:
- Type definitions
- Interface declarations
- Type aliases
- Generic type parameters

## Why

Inline imports like `import("../types.js").Plugin<unknown>[]` reduce code readability, make refactoring difficult, and complicate import organization. They also make it harder to:
- Track what modules are being used
- Perform accurate dependency analysis
- Maintain clean import statements at the top of files

## Correct Pattern

**BAD (inline import):**
```typescript
export interface APIConfig<TRoutes extends Router<unknown, any>> {
  router: TRoutes;
  plugins: import("../types.js").Plugin<unknown>[];
  middleware: import("../types.js").Middleware<unknown>[];
}
```

**GOOD (explicit import):**
```typescript
import type { Plugin, Middleware } from "../types.js";

export interface APIConfig<TRoutes extends Router<unknown, any>> {
  router: TRoutes;
  plugins: Plugin<unknown>[];
  middleware: Middleware<unknown>[];
}
```

## Enforcement

This rule is checked during code reviews. Always use explicit imports at the top of the file instead of inline imports in type positions.
