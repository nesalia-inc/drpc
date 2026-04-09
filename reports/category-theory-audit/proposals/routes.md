# Compile-time Routes

## Principle

Route existence can be verified at compile time using TypeScript's type system.

## Type-level Routes

```typescript
type Route = [string, ...Route[]]

type HasRoute<Routes extends Route, Path extends Route> =
  Path extends Routes ? true
  : Path extends [infer First, ...infer Rest]
    ? First extends Routes[number]
      ? HasRoute<Routes, Rest>
      : false
    : false

type SafeRouter<Routes extends Record<string, Route>> = {
  [K in keyof Routes & string]: HasRoute<Routes, [K]> extends true
    ? RouterNode<Routes[K]>
    : never
}
```

## Usage

```typescript
type AppRoutes = {
  'users.get': ['users', 'get']
  'users.create': ['users', 'create']
  'posts.get': ['posts', 'get']
}

type UsersGetPath = AppRoutes['users.get']  // ['users', 'get']

const getRoute = <
  Routes extends Record<string, Route>,
  Path extends Route
>(
  router: SafeRouter<Routes>,
  path: Path & HasRoute<Routes, Path> extends true ? Path : never
): Procedure => { ... }

getRoute(router, ['users', 'get'])  // ✅ Valid
getRoute(router, ['users', 'delete'])  // ❌ Type error!
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Compile-time checks** | Missing routes caught before runtime |
| **Refactoring safety** | Rename routes with IDE support |
| **Self-documenting** | Route structure explicit in types |
