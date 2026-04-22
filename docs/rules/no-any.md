# No `any` Type Rule

## Rule

**`any` is strictly prohibited** except when it serves a specific purpose for advanced generic patterns. Never use `any` as a shortcut to avoid thinking about types.

## Why

- `any` disables TypeScript's type checking entirely
- Creates hidden bugs that surface only at runtime
- Makes refactoring dangerous and error-prone
- defeats the purpose of using TypeScript

## Anti-Patterns (Forbidden)

```typescript
// WRONG - using any to "simplify"
const processData = (data: any): any => { ... };

// WRONG - any in object
const config: Record<string, any> = { ... };

// WRONG - any in arrays
const items: any[] = [1, "a", true];

// WRONG - any for "flexibility"
function parse(input: any): any { ... }

// WRONG - escaping strict typing
const user = getData() as any;
```

## When `any` IS Allowed

### 1. Genuine Generic Purpose

```typescript
// Type-safe dictionary with flexible value types
type Dictionary<T = unknown> = Record<string, T>;

// Generic builder pattern requiring structural flexibility
function build<T extends object>(defaults: T): Partial<T> { ... }
```

### 2. Bridging Untyped External Code

```typescript
// Properly marked for later refinement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rawResponse: any = externalLibrary.getData();

// Or isolated to boundary layer
const untypedData: any = JSON.parse(userInput);
```

### 3. Deliberate Escape Hatch (With JSDoc)

```typescript
/**
 * @internal
 * Used only for performance-critical numerical loops where
 * the overhead of strict typing in hot paths is measurable.
 * Document why the safety compromise is acceptable.
 */
const result = criticalLoop(input as any);
```

## Correct Alternatives

### Use Generics Instead of `any`

```typescript
// WRONG
const identity = (value: any): any => value;

// GOOD
const identity = <T>(value: T): T => value;

// WRONG
const processItems = (items: any[]): any[] => items.map(/** no type safety **/);

// GOOD
const processItems = <T>(items: T[]): T[] => items.map(item => transform(item));
```

### Use `unknown` for Truly Unknown Data

```typescript
// WRONG - any hides the "unknown" nature
const parse = (input: any): any => JSON.parse(input);

// GOOD - unknown forces type narrowing
const parse = (input: string): unknown => JSON.parse(input);
```

### Use `never` for Impossible Cases

```typescript
// WRONG
const assertNever = (value: never): never => value;

// GOOD
const assertNever = (value: never): asserts value is never => {
  throw new Error(`Unexpected value: ${value}`);
};
```

### Use Type Predicates for Filtering

```typescript
// WRONG
const filterValid = (items: any[]): any[] => items.filter(/* no type guard */);

// GOOD
const isValid = (item: unknown): item is User =>
  typeof item === "object" && item !== null && "id" in item;

const filterValid = (items: unknown[]): User[] => items.filter(isValid);
```

## Enforcement

- Enable ESLint rule `@typescript-eslint/no-explicit-any`
- Ban `any` in code reviews unless accompanied by explanation
- Prefer `unknown` for truly unknown data
- Document any legitimate use of `any` with WHY comment

## Quick Reference

| Situation | Use Instead |
|-----------|-------------|
| I don't know the type | `unknown` |
| I need flexibility | Generics `<T>` |
| I need escape hatch | Documented `any` with JSDoc |
| I'm too lazy to type | **FIX YOUR ATTITUDE** |
