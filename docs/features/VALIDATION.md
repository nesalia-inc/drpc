# Multi-Engine Validation System

## Overview

The validation system supports multiple validation libraries through a standardized interface. While Zod is the default, you can use Valibot, ArkType, Typia, or any library that implements the validation interface.

## Supported Libraries

| Library | Size (minified) | Performance | TypeScript |
|---------|----------------|-------------|------------|
| Zod | ~30KB | Good | Excellent |
| Valibot | ~6KB | Excellent | Excellent |
| ArkType | ~12KB | Excellent | Excellent |
| Yup | ~25KB | Good | Good |
| Superstruct | ~15KB | Good | Good |

## Default: Zod

```typescript
import { z } from "zod"

const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})
```

## Using Valibot

### Installation

```bash
pnpm add valibot
```

### Configuration

```typescript
import { defineContext } from "@deessejs/server"
import { valibot } from "deessejs/validators"

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  validator: valibot  // Use Valibot
})

// Now use Valibot schemas
import { v } from "valibot"

const getUser = t.query({
  args: v.object({
    id: v.number()
  }),
  handler: async (ctx, args) => { ... }
})
```

### Full Example

```typescript
import { defineContext } from "@deessejs/server"
import { valibot } from "deessejs/validators"
import { v } from "valibot"

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  validator: valibot
})

// Query with Valibot
const getUser = t.query({
  args: v.object({
    id: v.number(),
    include: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id, {
      include: args.include
    })
    return ok(user)
  }
})

// Mutation with Valibot
const createUser = t.mutation({
  args: v.object({
    name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
    email: v.pipe(v.string(), v.email()),
    age: v.optional(v.number())
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})
```

## Using ArkType

### Installation

```bash
pnpm add arktype
```

### Configuration

```typescript
import { defineContext } from "@deessejs/server"
import { arktype } from "deessejs/validators"

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  validator: arktype
})

// Now use ArkType schemas
import { type } from "arktype"

const getUser = t.query({
  args: type({
    id: "number",
    include: "string?"
  }),
  handler: async (ctx, args) => { ... }
})
```

### Full Example

```typescript
import { defineContext } from "@deessejs/server"
import { arktype } from "deessejs/validators"
import { type } from "arktype"

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  validator: arktype
})

// Query with ArkType
const getUser = t.query({
  args: type({
    id: "number",
    include: "string?"
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return ok(user)
  }
})

// Mutation with ArkType
const createUser = t.mutation({
  args: type({
    name: "string >= 2 <= 100",
    email: "string.email",
    age: "number?"
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.create(args)
    return ok(user)
  }
})
```

## Using Custom Validator

### Validator Interface

```typescript
interface Validator {
  // Create a schema from a definition
  schema<T>(definition: unknown): Schema<T>

  // Validate data against a schema
  parse<T>(schema: Schema<T>, data: unknown): T

  // Get type from schema (for TypeScript inference)
  infer<T>(schema: Schema<T>): T
}

interface Schema<T> {
  // Validation
  _parse(data: unknown): { success: true; data: T } | { success: false; error: Error }

  // TypeScript type
  readonly type: T
}
```

### Implementation

```typescript
import { defineContext, createValidator } from "@deessejs/server"
import { parse, string, number, object, optional } from "my-custom-validator"

// Create custom validator adapter
const myValidator = createValidator({
  schema: (def) => object(def),
  parse: (schema, data) => {
    const result = schema.parse(data)
    if (!result.valid) throw new Error(result.errors.join(", "))
    return result.data
  },
  infer: (schema) => schema.type
})

const { t, createAPI } = defineContext({
  context: { db: myDatabase },
  validator: myValidator
})
```

## Schema Definition

### Query Args

```typescript
// Zod
const getUser = t.query({
  args: z.object({
    id: z.number(),
    include: z.string().optional()
  }),
  handler: async (ctx, args) => { ... }
})

// Valibot
const getUser = t.query({
  args: v.object({
    id: v.number(),
    include: v.optional(v.string())
  }),
  handler: async (ctx, args) => { ... }
})

// ArkType
const getUser = t.query({
  args: type({
    id: "number",
    include: "string?"
  }),
  handler: async (ctx, args) => { ... }
})
```

### Mutation Args

```typescript
// Zod
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    age: z.number().min(0).optional()
  }),
  handler: async (ctx, args) => { ... }
})
```

### Middleware Args

```typescript
const rateLimit = t.middleware({
  args: z.object({
    maxRequests: z.number().min(1).max(1000).default(100),
    windowMs: z.number().min(1000).default(60000)
  }),
  handler: async (ctx, next) => { ... }
})
```

## Type Inference

### Automatic Inference

Types are automatically inferred from schemas:

```typescript
const createUser = t.mutation({
  args: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  handler: async (ctx, args) => {
    // args is typed automatically!
    // { name: string, email: string }
    return ok(args)
  }
})
```

### Manual Inference

```typescript
import { InferArgs } from "@deessejs/server"

const createUserArgs = z.object({
  name: z.string(),
  email: z.string().email()
})

type CreateUserArgs = InferArgs<typeof createUserArgs>
// { name: string, email: string }
```

## Error Handling

### Validation Errors

```typescript
const getUser = t.query({
  args: z.object({
    id: z.number()
  }),
  handler: async (ctx, args) => { ... }
})

// When invalid args are passed:
// HTTP 400 Bad Request
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "id", "message": "Expected number, received string" }
    ]
  }
}
```

### Custom Error Messages

```typescript
const createUser = t.mutation({
  args: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    age: z.number().min(0, "Age must be positive").optional()
  }),
  handler: async (ctx, args) => { ... }
})
```

## Performance Comparison

### Bundle Size

| Library | Bundle Size | Gzipped |
|---------|-------------|---------|
| Zod | 30KB | 10KB |
| Valibot | 6KB | 2KB |
| ArkType | 12KB | 4KB |

### Parse Time (10,000 iterations)

| Library | Time |
|---------|------|
| Zod | 45ms |
| Valibot | 15ms |
| ArkType | 12ms |

## Recommendations

### Use Valibot When

- Bundle size is critical (mobile, edge)
- You need excellent TypeScript inference
- Performance is important

### Use Zod When

- You need ecosystem compatibility
- You have existing Zod schemas
- You need extensive documentation

### Use ArkType When

- You want the best TypeScript inference
- You need excellent performance
- You're building a new project

## Migration Guide

### From Zod to Valibot

```typescript
// Zod
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

// Valibot
import { v } from "valibot"

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(2)),
  email: v.pipe(v.string(), v.email())
})
```

### From Zod to ArkType

```typescript
// Zod
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
})

// ArkType
import { type } from "arktype"

const schema = type({
  name: "string >= 2",
  email: "string.email"
})
```

## Future Considerations

- Runtime schema generation
- Schema versioning
- Schema migration tools
- Built-in validators for common patterns
