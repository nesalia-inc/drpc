# Low-Level Abstraction First & Compositional Development

Date: 2026-04-22
Tag: [architecture] [abstraction] [composition] [functional]

## Rule

Every function must follow **lowest-abstraction reasoning** with **compositional development**.

---

## Core Principles

### 1. Lowest Abstraction First

Start reasoning at the **lowest possible abstraction level**. Never introduce high-level concepts before exhausting low-level primitives.

**Reasoning order:**
1. Identify the atomic, deterministic operations
2. Compose them into mid-level abstractions
3. Only then combine into higher-level constructs

### 2. Atomic Deterministic Functions

Each function must be:
- **Atomic**: Performs a single, well-defined operation
- **Deterministic**: Same input → same output, no side effects
- **Autonomous**: No external dependencies (configurable via parameters)
- **Simple input/output**: Takes input, returns output

```typescript
// ❌ HIGH ABSTRACTION - too complex, not decomposed
function processUserData(data: unknown): Promise<User> {
  return validate(data).then(transform).then(save).then(format);
}

// ✅ ABSTRACTION 1 - atomic, deterministic
function validateUserInput(data: unknown): ValidationResult { /* ... */ }

// ✅ ABSTRACTION 2 - composed of abstraction 1 and below
async function processUserData(data: unknown): Promise<User> {
  const validated = validateUserInput(data);
  if (!validated.success) throw new ValidationError(validated.errors);
  return transformToUser(validated.data);
}
```

### 3. Abstraction Levels

Define **abstraction level** by counting composed functions:

| Level | Description | Example |
|-------|-------------|---------|
| **1** | Atomic operations | `parseInt`, `trim`, `isEmail` |
| **2** | Simple compositions | `parseAndValidateEmail`, `extractUsername` |
| **3** | Business logic | `authenticateUser`, `createOrder` |
| **4** | Orchestration | `handleUserRequest`, `processOrderPipeline` |

**Rule:** A function at abstraction level N must only composed of functions at abstraction level N-1 or lower.

```typescript
// ABSTRACTION 3 - composed of abstraction 1 and 2
function authenticateUser(credentials: Credentials): AuthResult {
  const hashedPassword = hashPassword(credentials.password);     // Abstraction 1
  const userRecord = findUserByEmail(credentials.email);            // Abstraction 1
  return compareHashes(hashedPassword, userRecord.hash);           // Abstraction 1
}

// ABSTRACTION 4 - composed of abstraction 3 and below
async function handleLoginRequest(req: Request): Promise<Response> {
  const credentials = parseRequestBody(req);                       // Abstraction 2
  const authResult = authenticateUser(credentials);               // Abstraction 3
  return formatAuthResponse(authResult);                           // Abstraction 1
}
```

### 4. Compositional Development

Build functions by **composing smaller functions**, not by implementing logic inline.

**Pattern:**
```
High-level function = Composition(lower-level functions)
```

```typescript
// Build from bottom up
const normalizeString = (s: string): string => s.trim().toLowerCase(); // L1
const splitByComma = (s: string): string[] => s.split(',');            // L1
const trimEach = (arr: string[]): string[] => arr.map(trim);            // L1

// Compose into higher level
const parseTagList = (input: string): string[] =>     // L2
  trimEach(splitByComma(normalizeString(input)));     // Uses L1
```

---

## Implementation Guidelines

### Identifying Abstraction Level

Ask: **"How many composed functions does this contain?"**

```typescript
// Level 0 - no composed functions, pure implementation
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Level 1 - uses Level 0 functions
function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

// Level 2 - uses Level 1 functions
function isValidTag(value: unknown): value is string {
  return isNonEmptyString(value) && value.length <= 50;
}

// Level 3 - uses Level 2 functions
function parseTagInput(input: unknown): string[] {
  if (!isString(input)) return [];
  return input.split(',').filter(isValidTag);
}
```

### Naming Convention

Functions should reveal their abstraction level through naming:
- **Level 1**: `verbNoun` - `parseString`, `hashPassword`
- **Level 2**: `verbNoun` with qualifiers - `parseAndValidateEmail`
- **Level 3**: `handle[Noun]Request` - `handleUserLoginRequest`
- **Level 4**: `process[Noun]Pipeline` - `processOrderPipeline`

### Refactoring Flow

When a function becomes too complex:
1. Identify the **lowest-level operations** it performs
2. Extract each as a separate function (abstraction 1 or 2)
3. Compose them into mid-level abstractions
4. Reassemble into the original function using composition

---

## Anti-Patterns

### ❌ "God Function" - High abstraction without decomposition

```typescript
// Abstraction 5 - too high, not decomposed
async function handleFullUserFlow(data: unknown): Promise<Result> {
  // 50 lines of inline logic mixing validation, transformation, DB calls, etc.
}
```

### ❌ Skipping Levels

```typescript
// Abstraction 4 directly using Abstraction 1, skipping Abstraction 2-3
// This is fine IF Abstraction 2-3 don't add meaningful composition
// But problematic if business rules are embedded inline
function handleOrder(data: unknown) {
  const validated = validate(data);        // Abstraction 1
  // Inline business logic instead of Abstraction 2-3
  const transformed = { ...validated, processed: true };
  await db.save(transformed);
  return formatResponse(transformed);
}
```

### ❌ Non-Deterministic Operations

```typescript
// ❌ Contains hidden state
function getNextId(): number {
  return ++counter; // Side effect!
}

// ✅ Deterministic
function getNextId(currentMax: number): number {
  return currentMax + 1;
}
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Testability** | Atomic functions are trivially testable |
| **Reusability** | Low-level functions compose in many contexts |
| **Readability** | Function names describe composition intent |
| **Debugging** | Errors isolate to specific abstraction levels |
| **Refactoring** | Change implementation without changing interface |

---

## Enforcement

- Code review should verify **abstraction level coherence**
- Functions should be **no longer than 20 lines** (prefer 10-15)
- Complex functions should be **decomposed before finalizing**
- Use composition over **inline implementation** for shared logic

---

## Related Rules

- [deterministic-functional.md](./deterministic-functional.md) - Deterministic, side-effect-free functions
- [reduce-duplication.md](./reduce-duplication.md) - DRY through composition
- [no-function-declarations.md](./no-function-declarations.md) - Prefer const + arrow functions