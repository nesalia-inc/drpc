# Type Enrichment and Branding Rule

## Rule 1: Type Enrichment

**Types can be enriched with methods to create "monadic" capabilities.** Represent entities and add functionality through method chains when it improves code quality.

## Rule 2: Branded Types

**Use branded types for identity checks instead of structural validation.**

## Why Branded Types

Structural checks like `isRouter(obj)` are fragile:
- Any object with matching structure passes the check
- No guarantee the object is actually a Router
- Logic can be bypassed accidentally

Branded types make identity checks trivial and reliable:
```typescript
// Create unique brand
const RouterBrand = Symbol("Router");

type RouterBrand = typeof RouterBrand;

// Attach brand to type
interface Router<TRoutes, TContext> {
  readonly routes: TRoutes;
  readonly context: TContext;
  readonly [RouterBrand]: unique symbol;
}

// Type guard using brand
const isRouter = (obj: unknown): obj is Router<any, any> =>
  typeof obj === "object" && obj !== null && RouterBrand in obj;
```

## Branded Type Pattern

```typescript
// Define brand symbol (unique per type)
const UserIdBrand = Symbol("UserId");
const PostIdBrand = Symbol("PostId");

// Branded type
type UserId = string & { readonly [UserIdBrand]: unique symbol };
type PostId = string & { readonly [PostIdBrand]: unique symbol };

// Constructor (brands the value)
const createUserId = (id: string): UserId => id as UserId;
const createPostId = (id: string): PostId => id as PostId;

// Type guard (checks the brand)
const isUserId = (value: unknown): value is UserId =>
  typeof value === "string" && UserIdBrand in (value as any);

// Usage
const getUser = (id: UserId) => { /* ... */ };
const getPost = (id: PostId) => { /* ... */ };

// Impossible to mix up - type error!
const userId = createUserId("123");
const postId = createPostId("456");
getUser(postId); // Error: PostId is not assignable to UserId
```

## When Branded Types ARE Appropriate

1. **Type identity checks** - When you need to distinguish between types that have the same underlying representation (e.g., both are `string`)
2. **API boundaries** - When accepting external input that needs validation before use
3. **Preventing mix-ups** - When similar types could be accidentally swapped
4. **Making type guards meaningful** - When `isX` should mean something specific

## Pattern: Enriched Entity with Brand

```typescript
// Unique brand
const QueryBrand = Symbol("Query");

// Base interface with brand
interface Query< TResult> {
  readonly [QueryBrand]: unique symbol;
  readonly result: Maybe<TResult>;
}

// Branded constructor
const createQuery = <TResult>(result: Maybe<TResult>): Query<TResult> => ({
  result,
  [QueryBrand]: Symbol("Query"),
} as Query<TResult>);

// Type guard (simple, reliable)
const isQuery = (obj: unknown): obj is Query<unknown> =>
  typeof obj === "object" && obj !== null && QueryBrand in obj;

// Enrichment (extends with capabilities)
const withRetry = <T>(query: Query<T>): Query<T> & Retryable => ({
  ...query,
  retry: (attempts: number) => /* retry logic */,
  canRetry: () => attempts > 0,
});
```

## Enforcement

- Use branded types instead of structural checks for identity
- Brand creation via unique Symbol, not strings
- Type guards should check the brand, not the structure
- Branded types make the identity check intent clear

---

# Part 2: Type Enrichment

## Rule: Type Enrichment

**Types can be enriched with methods to create "monadic" capabilities.** Represent entities and add functionality through method chains when it improves code quality.

```typescript
// Base type - plain data
interface User {
  id: string;
  name: string;
  email: string;
}

// Enrichment function - adds capabilities
const withValidation = (user: User): User & UserValidation => ({
  ...user,
  isValid: () => user.email.includes("@") && user.name.length > 0,
  validate: () =>
    user.email.includes("@")
      ? { ok: true, value: user }
      : { ok: false, error: new Error("Invalid email") },
});

type UserValidation = {
  isValid: () => boolean;
  validate: () => Result<User, Error>;
};

// Usage
const user = withValidation(rawUser);
if (user.isValid()) {
  const result = user.validate();
}
```

## Pattern: Monad-like Enrichment

```typescript
// Base Maybe type from @deessejs/fp
type Maybe<T> = { type: "some"; value: T } | { type: "none" };

// Enrich with additional methods
const withLogging = <T>(maybe: Maybe<T>): Maybe<T> & WithLogging<T> => ({
  ...maybe,
  log: () => {
    if (maybe.type === "none") {
      console.log("Nothing to log");
    } else {
      console.log("Value:", maybe.value);
    }
    return maybe;
  },
});

type WithLogging<T> = {
  log: () => Maybe<T>;
};
```

## Pattern: Entity with Capabilities

```typescript
// Core entity - just data
interface Query {
  name: string;
  params: Record<string, unknown>;
}

// Enrichment - adds query capabilities
const withCaching = (query: Query): Query & QueryCaching => ({
  ...query,
  cacheKey: () => `${query.name}:${JSON.stringify(query.params)}`,
  shouldCache: (ttlMs: number) => Date.now() - query.createdAt < ttlMs,
});

type QueryCaching = {
  cacheKey: () => string;
  shouldCache: (ttlMs: number) => boolean;
};

// Composition
const withPagination = (query: Query & QueryCaching): Query & QueryCaching & QueryPagination => ({
  ...query,
  offset: 0,
  limit: 100,
  page: (n: number) => ({ ...query, offset: n * query.limit }),
});

type QueryPagination = {
  offset: number;
  limit: number;
  page: (n: number) => Query & QueryCaching;
};
```

## When Enrichment IS Appropriate

1. **Behavior is tightly coupled to data** - e.g., validation, formatting
2. **Chaining improves readability** - e.g., query builders
3. **Multiple enrichment layers** - composing capabilities like a monad
4. **Type-safe operations** - methods are guaranteed to exist on the type

## When NOT to Use

1. **Standalone utilities** - Use pure functions instead
2. **Cross-cutting concerns** - Use middleware or decorators
3. **Single use** - If used once, a function is simpler

## Enforcement (Enrichment)

- Enrichment is optional but encouraged when it improves composability
- Each enrichment should add a single capability
- Use TypeScript intersection types (`&`) to compose enrichments
- Document what each enrichment adds to the base type

## Example: Enrich Router with Methods

**Instead of standalone functions, add methods to Router type:**

```typescript
// WRONG - Scattered standalone functions
const routes = flattenRouter(router);
const publicRoutes = getPublicRoutes(router);
const internalRoutes = getInternalRoutes(router);
const resolved = resolvePath(router, "users.list");
const validation = validateRouter(router);

// GOOD - Methods on enriched Router
const routes = router.flatten();
const publicRoutes = router.getPublicRoutes();
const internalRoutes = router.getInternalRoutes();
const resolved = router.resolvePath("users.list");
const validation = router.validate();
```

## Implementation Pattern

```typescript
// Core Router type with brand
const RouterBrand = Symbol("Router");

interface Router<TCtx, TRoutes> {
  readonly routes: TRoutes;
  readonly context: TCtx;
  readonly [RouterBrand]: unique symbol;
}

// Enrichment type (what methods to add)
type RouterEnrichment = {
  flatten: () => Array<{ path: string; procedure: Procedure<any, any, any> }>;
  getPublicRoutes: () => Array<{ path: string; procedure: Procedure<any, any, any> }>;
  getInternalRoutes: () => Array<{ path: string; procedure: Procedure<any, any, any> }>;
  resolvePath: (path: string) => Maybe<Procedure<any, any, any> | Router<any, any>>;
  validate: () => ValidationResult;
};

// Enrichment function
const enrichRouter = <TCtx, TRoutes>(
  router: Router<TCtx, TRoutes>
): Router<TCtx, TRoutes> & RouterEnrichment => ({
  ...router,
  flatten: () => flattenRouter(router),
  getPublicRoutes: () => getPublicRoutes(router),
  getInternalRoutes: () => getInternalRoutes(router),
  resolvePath: (path: string) => resolvePath(router, path),
  validate: () => validateRouter(router),
});
```

## Branding over Type Guards

For `isRouter()` and `isProcedure()` - use brand checking instead:

```typescript
// Instead of fragile structural check
export function isRouter(obj: any): obj is Router<any, any> {
  if (!obj || typeof obj !== "object") return false;
  for (const key of Object.keys(obj)) {
    if (isProcedure(obj[key])) return false;
  }
  return true;
}

// Use brand check - reliable and meaningfull
const isRouter = (obj: unknown): obj is Router<any, any> =>
  typeof obj === "object" && obj !== null && RouterBrand in obj;
```