# Parallel Validation

## Principle

Independent validation checks can run in parallel and report all errors at once, rather than stopping at the first error.

## Current (Sequential)

```typescript
const getUser = t.query({
  args: z.object({
    id: z.number(),
    email: z.string().email(),
  }),
  handler: async (ctx, args) => { ... }
})
```

## Proposed (Parallel)

```typescript
import { Applicative, Validation } from '@deessejs/fp'

const validateUserQuery = pipe(
  z.object({ id: z.number() }).safeParse,
  Validation.mapError(parseErrorToValidationError),
  Applicative.apSecond(
    z.object({ email: z.string().email() }).safeParse,
  )
)

const getUser = t.query({
  args: validateUserQuery,
  handler: async (ctx, args) => { ... }
})
```

Or with custom validation:

```typescript
const UserQueryV = Applicative.sequenceS({
  id: validateNumber,
  email: validateEmail,
})

// Result: { id: ValidationError[], email: ValidationError[] }
// All errors collected, not just first
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Better DX** | Users get ALL validation errors at once |
| **Composable** | Easy to combine independent validations |
| **Performance** | Independent validations can run in parallel |

## Typed Error Codes

```typescript
const validateWithCodes = <E extends Record<string, Schema>>(
  schemas: E
): Validator<{ [K in keyof E]: Infer<E[K]> }, { [K in keyof E]: string }> =>
  (input) => {
    const results = Object.entries(schemas).map(([key, schema]) => {
      const result = schema.safeParse(input[key])
      return result.success
        ? { key, value: result.data }
        : { key, error: mapZodToErrorCode(result.error) }
    })

    const errors = results.filter(r => 'error' in r)
    if (errors.length > 0) {
      return Validation.failure(
        errors.map(e => ({ field: e.key, code: e.error }))
      )
    }
    return Validation.success(
      Object.fromEntries(results.map(r => [r.key, r.value]))
    )
  }

const getUser = t.query({
  args: validateWithCodes({
    id: { schema: z.number(), code: 'INVALID_ID' },
    email: { schema: z.string().email(), code: 'INVALID_EMAIL' },
  }),
  handler: async (ctx, args) => { ... }
})
```
