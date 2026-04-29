# TypeScript Conditional Types & Intersection Distribution

## The Problem

When we have an intersection type like `QueryWithHooks = Query & HookedProcedureMixin` and we want to check if it's a procedure via a conditional type:

```typescript
type Router<Ctx, Routes> = {
  [K in keyof Routes]: Routes[K] extends Procedure<Ctx, any, any>
    ? Routes[K]  // ← here Routes[K] = QueryWithHooks = Query & HookedProcedureMixin
    : never;
};
```

TypeScript infers `never` for `Routes[K]` in some cases.

## Why?

### Conditional Distribution

Conditional types of the form `T extends U ? A : B` **distribute** over unions when `T` is a naked type parameter.

But the problem here is more subtle with **intersections**.

When TypeScript evaluates:
```
QueryWithHooks extends Procedure<Ctx, infer Args, infer Output>
```

It sees that `QueryWithHooks = Query & HookedProcedureMixin`.

For an intersection `A & B`, when checking `A & B extends X`:
- TypeScript separates the members
- Each member is checked separately against the `Procedure` union
- Branches that fail can produce `never`

### Minimal Example

```typescript
interface Query { type: 'query'; }
interface HookedMixin { beforeInvoke(): void; }

type QueryWithHooks = Query & HookedMixin;
type Procedure = { type: 'query' } | { type: 'mutation' };

// What happens:
// QueryWithHooks extends Query          → true
// QueryWithHooks extends Mutation        → false → sometimes infers never
```

## Solutions

### 1. Tuple Brackets `[X] extends [Y]` (Recommended by TypeScript)

Surround both sides of `extends` with tuples to prevent distribution:

```typescript
// ❌ Problem - distribution
Routes[K] extends Procedure<Ctx, any, any>

// ✅ Solution - no distribution
[Routes[K]] extends [Procedure<Ctx, any, any>]
```

TypeScript considers `[X]` is not a naked type parameter, so no distributivity. And `([X] extends [Y])` is equivalent to `(X extends Y)` in terms of logic.

### 2. Check Object Shape Directly

Instead of checking `extends Procedure`, check properties directly:

```typescript
type IsProcedure<T> = T extends { type: 'query' | 'mutation' | 'internalQuery' | 'internalMutation'; handler: Function }
  ? T
  : never;

type Router<Ctx, Routes> = {
  [K in keyof Routes]: Routes[K] extends { type: string; handler: Function }
    ? Routes[K]
    : Routes[K] extends Record<string, unknown>
      ? Router<Ctx, Routes[K]>
      : never;
};
```

**Advantage**: More explicit, no dependency on `Procedure` type.
**Disadvantage**: More permissive (any object with `type` and `handler` passes).

### 3. ORPC Pattern - Procedure First

ORPC uses a different approach: a procedure **is** a router:

```typescript
export type Router<T> =
  T extends { input: infer I; output: infer O }
    ? Procedure<T>  // It's a procedure
    : { [K in keyof T]: Router<T[K]> };  // It's a nested router
```

This pattern avoids the problem because it checks for specific properties.

## Sources

- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [How to avoid distributive conditional types](https://stackoverflow.com/questions/70789029/how-to-avoid-distributive-conditional-types/70792483)
- [ORPC Router Type](https://github.com/middleapi/orpc/blob/f4868a14/packages/server/src/router.ts)
- [tRPC Issue #4709 - simplify Router and Procedure types](https://github.com/trpc/trpc/issues/4709)

## Pattern to Follow for @deessejs/server

Use `[X] extends [Y]` for the `Router` and `PublicRouter` types. The `any` in `Procedure<any, any, any>` and `Router<Ctx, any>` are acceptable because:
- We're just checking the **shape**, not the complete structure
- `any` means "any routes type" in this context

If more type safety is needed, we could explore the ORPC pattern or shape-based verification instead of `extends`.
