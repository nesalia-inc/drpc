# Typing Rule - "La Verite des Types"

## Rule

**No `as any` - use generics or unknown with Type Guards.**
**`as T` is allowed only at system boundaries (JSON parsing).**
**Use explicit generics for perfect autocomplete.**

## Why

Type assertions bypass TypeScript's type system and hide bugs:
- `as any` disables ALL type checking
- `as T` without justification indicates a type design problem
- Implicit type flows create invisible dependencies
- Generics provide predictable, self-documenting APIs

## Anti-Patterns (Forbidden)

```typescript
// WRONG - 'as any' escapes all type checking
const result = externalData as any;

// WRONG - 'as unknown' just shifts the problem
const parsed = JSON.parse(input) as unknown;

// WRONG - 'as T' for avoiding proper generics
const process = <T>(data: unknown): T => data as T;

// WRONG - implicit type flow without generics
const parse = (input: string) => JSON.parse(input); // returns unknown
const user = parse(input); // no type info
```

## Correct Patterns

### 1. Generics for Autocomplete

```typescript
// GOOD - explicit generic for autocomplete
const parseJSON = <T>(input: string): T => JSON.parse(input) as T;

const user = parseJSON<User>(rawData);
// TypeScript now knows user is User - full autocomplete!
user.name // autocomplete works
```

### 2. Unknown + Type Guards

```typescript
// GOOD - unknown forces narrowing
const parseInput = (input: string): unknown => JSON.parse(input);

// GOOD - type guard for safety
const isUser = (data: unknown): data is User =>
  typeof data === "object" &&
  data !== null &&
  "id" in data &&
  "name" in data &&
  "email" in data;

const result = parseInput(rawData);
if (isUser(result)) {
  result.name; // TypeScript knows it's User
}
```

### 3. System Boundaries (When `as` IS Allowed)

```typescript
// GOOD - JSON parsing is a system boundary
const parseJSON = <T>(input: string): T => JSON.parse(input) as T;

// GOOD - External API response at boundary
const fetchUser = async (id: string): Promise<User> => {
  const response = await externalAPI.get(`/users/${id}`);
  return response.data as User; // Boundary between external system
};
```

### 4. Explicit Generics for APIs

```typescript
// WRONG - inference works but not explicit
const createPair = (first: string, second: number) => ({ first, second });

// GOOD - explicit generics for consumers
const createPair = <T, U>(first: T, second: U) => ({ first, second });

// Consumer gets perfect autocomplete:
createPair<string, number>("age", 25); // explicit
createPair("name", "value"); // type flows
```

## When `as T` IS Allowed

| Scenario | Example |
|----------|---------|
| JSON parsing | `JSON.parse(input) as T` |
| External API boundaries | `response.data as User` |
| Test mocks | `{ id: "1" } as User` |
| After verified type guard | `data as User` (following guard check) |

## Enforcement

- Enable ESLint: `@typescript-eslint/no-explicit-any`
- Require WHY comment for any `as` usage
- Prefer generics over `as` for API design
- Use type guards to narrow `unknown` before access

## Quick Reference

| Situation | Use |
|-----------|-----|
| I don't know the type | `unknown` + type guard |
| I need flexibility | Generics `<T>` |
| JSON parsing | `JSON.parse(x) as T` |
| Avoiding generics | **Fix the design** |
| Type guard check needed | Type predicate `isX` |
