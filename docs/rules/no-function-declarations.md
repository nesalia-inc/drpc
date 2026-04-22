# Prefer `const` Over `function` Rule

## Rule

**Use `const` with arrow functions instead of `function` declarations**, unless you specifically need features that only `function` provides.

## Why

Arrow functions and `const` provide:
- **Consistent syntax** - Everything is a variable declaration
- **Shorthand notation** - Less boilerplate
- **Lexical `this`** - No accidental `this` binding issues
- **Better inference** - TypeScript infers types more predictively

## Anti-Patterns (Forbidden)

```typescript
// WRONG - function declaration
function processData(input: string): Promise<Result> {
  return fetchData(input).then(transform);
}

// WRONG - function in object
const utils = {
  parse: function parse(data: string) { ... },
  format: function format(data: string) { ... }
};

// WRONG - method shorthand with function
const handler = {
  process: function(data: string) { ... }
};
```

## Correct Pattern (Prefer const)

```typescript
// GOOD - const with arrow function
const processData = async (input: string): Promise<Result> => {
  const data = await fetchData(input);
  return transform(data);
};

// GOOD - const in object
const utils = {
  parse: (data: string) => { ... },
  format: (data: string) => { ... }
};

// GOOD - method shorthand
const handler = {
  process: (data: string) => { ... }
};
```

## When `function` IS Allowed

### 1. Recursive Functions (Named Self-Reference)

```typescript
// Arrow functions cannot reference themselves by name
const factorial = function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
};
```

### 2. Arguments `callee` (Rare)

```typescript
// Only available on function declarations
const repeat = function(count: number, fn: () => void) {
  if (count > 0) {
    fn();
    arguments.callee(count - 1, fn); // Only works with function
  }
};
```

### 3. Specific `this` Binding Requirements

```typescript
// Arrow functions lexically bind 'this', so use function when you need
// the calling object to determine 'this'
class EventEmitter {
  on(event: string, handler: () => void) { ... }

  // When you need dynamic 'this' based on invocation
  bindHandler = function(this: EventEmitter, handler: () => void) {
    return () => handler.call(this);
  };
}
```

### 4. Hoisting Needs (Generally Avoid This)

```typescript
// function declarations are hoisted - useful in rare callback scenarios
// where the callback is called before its definition appears in file
export const initialize = () => {
  // Some library calls cb before we define it below
  library.register(callback); // callback used here

  function callback(data: Data) { // hoisted
    process(data);
  }
};
```

## Quick Reference

| Use Case | Use |
|----------|-----|
| Regular function | `const fn = () => {}` |
| Async function | `const fn = async () => {}` |
| Method | `const method = () => {}` |
| Recursive function | `const fn = function fn() {}` |
| Needs `arguments.callee` | `function` |
| Needs dynamic `this` | `function` |
| Hoisting (avoid) | `function` |

## Enforcement

- Prefer `const` + arrow functions by default
- Use `function` only when documented reason applies
- Code review will flag unnecessary `function` declarations

## Note on Object Methods

For object methods, use concise method syntax:

```typescript
// GOOD - concise method
const handler = {
  process(data: string) { ... }
};

// ACCEPTABLE - arrow property (if you need lexical this)
const handler = {
  process: (data: string) => { ... }
};
```
