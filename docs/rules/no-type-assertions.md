# Avoid Type Assertions (`as`) Rule

## Rule

**Avoid `x as T` type assertions.** Write code so TypeScript naturally infers types. Use `as` only as a last resort when TypeScript cannot infer the type despite correct typing.

## Why

Type assertions (`as`) bypass TypeScript's type system:
- Hide potential bugs at compile time
- Indicate a type design problem upstream
- Create hidden fragility in refactoring
- Make code harder to reason about

## Anti-Patterns (Forbidden)

```typescript
// WRONG - 'as any' escapes all type checking
const result = externalData as any;

// WRONG - 'as unknown' just shifts the problem
const parsed = JSON.parse(input) as unknown;

// WRONG - 'as' on function return when inference fails
const handler = (req: Request) => {
  return { body: req.body } as ResponseBody; // Type should be inferred
};

// WRONG - assertion when handling union types
const value = data.variant as "success";
```

## How to Enable Natural Type Inference

### 1. Use Generic Parameters

```typescript
// WRONG - requires assertion
const parse = <T>(input: string): T => JSON.parse(input);
const data = parse(input) as User;

// GOOD - Type flows naturally
const parse = <T>(input: string): T => JSON.parse(input);
const data: User = parse(input); // TypeScript infers T = User
```

### 2. Define Proper Return Types

```typescript
// WRONG - implicit any, needs assertion
const process = (items: Item[]) => {
  return items.filter(i => i.active).map(i => i.value);
};
const values = process(items) as string[];

// GOOD - Return type explicit, inference flows
const process = (items: Item[]): string[] => {
  return items.filter(i => i.active).map(i => i.value);
};
const values = process(items); // string[] inferred
```

### 3. Type Predicates Instead of Assertions

```typescript
// WRONG - manual assertion
const user = data as User;

// GOOD - Type guard enables proper inference
const isUser = (data: unknown): data is User =>
  typeof data === "object" &&
  data !== null &&
  "id" in data &&
  "name" in data;

const user = isUser(data) ? data : fallback;
```

### 4. Discriminated Unions

```typescript
// WRONG - assertion needed
const result = (await fetchData()) as { type: "user"; data: User };
if (result.type === "user") {
  console.log(result.data.name);
}

// GOOD - discriminated union, no assertion
type Result = SuccessResult | ErrorResult;

const result = await fetchData();
if (result.type === "success") {
  console.log(result.data.name); // TypeScript knows data is User
}
```

### 5. Branded Types for Special Cases

```typescript
// WRONG - using string directly leads to assertions
const userId = getUserId() as string;
const postId = getPostId() as string;
const concatenated = userId + postId; // Accidental concatenation!

// GOOD - branded types prevent mix-ups
type UserId = string & { readonly brand: unique symbol };
type PostId = string & { readonly brand: unique symbol };

const createUserId = (id: string): UserId => id as UserId;
const createPostId = (id: string): PostId => id as PostId;

const userId = createUserId(getUserId());
const postId = createPostId(getPostId());
// userId + postId now fails - incompatible types!
```

## When `as` IS Allowed

### 1. Bridging External/Untyped Code

```typescript
// MARKED for later refinement
const rawData: unknown = thirdPartyAPI.getData();
const user = rawData as User; // Document why assertion is safe
```

### 2. Test Mocks

```typescript
// In test files only
const mockUser = { name: "Test" } as User;
```

### 3. After Type Guard Check

```typescript
// Following a type guard that TypeScript doesn't narrow perfectly
if (isValid(data)) {
  // data is User here, but TypeScript needs help
  const user = data as User;
}
```

## Enforcement

- Enable ESLint: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/consistent-type-assertions`
- Mark any `as` with WHY comment if genuinely needed
- Prefer type inference, generics, type guards, and discriminated unions

## Quick Checklist

Before using `as`, ask:
1. Can I use a generic parameter instead?
2. Can I define the return type explicitly?
3. Can I use a type predicate?
4. Can I use a discriminated union?
5. Is this bridging untyped external code?

Only if all fail → use `as` with documented reason.
