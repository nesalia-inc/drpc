# Zod v4 Breaking Changes & Migration Guide

**Date:** 2026-04-22
**Current Stable:** v4.3.6 (January 22, 2026)
**Tag:** [zod] [v4] [migration] [breaking-changes]

## Overview

Zod v4 introduces significant breaking changes. The current stable release is v4.3.6.


**Community Codemod:** A community-maintained zod-v3-to-v4 codemod is available.

---

## Breaking Changes Summary

### 1. Error Handling

**Deprecated:**
- `message` parameter - replaced with `error`
- `invalid_type_error` and `required_error` - merged into `error`
- `errorMap` - renamed to `error`
- `.format()`, `.flatten()`, `.formErrors()`, `.addIssue()`, `.addIssues()` - deprecated

**New syntax:**
```typescript
// v3
z.string({ invalid_type_error: "Not a string", required_error: "Required" })
z.string().min(5, { message: "Too short" })

// v4
z.string({ error: "Not a string" })
z.string().min(5, { error: "Too short" })


// Dynamic error with function
z.string({ error: (issue) => issue.input === undefined ? "Required" : "Not a string" })
```


**Important:** Schema-level error maps now override parse-level ones (reverse of v3 behavior).

### 2. String Formats Moved to Top-Level

**Deprecated method syntax:**
```typescript
z.string().email()
z.string().url()
z.string().uuid()
z.string().ip()
z.string().cidr()
```

**New top-level syntax:**
```typescript
z.email()
z.url()
z.uuid()
z.guid()
z.ipv4()
z.ipv6()
z.cidrv4()
z.cidrv6()
z.nanoid()
z.cuid()
z.cuid2()
z.ulid()
z.emoji()
z.base64()
z.base64url()
z.iso.date()
z.iso.time()
z.iso.datetime()
z.iso.duration()
```

**UUID validation is stricter:** `z.uuid()` now validates RFC 9562/4122 specification. Use `z.guid()` for permissive validation.

**IPv6 validation is stricter:** Now uses the `URL()` constructor for validation.

### 3. Number Validation Changes

- Infinite values are now rejected
- `.safe()` now behaves like `.int()`, rejecting floats
- `.int()` only accepts safe integers
- New: `z.int8()`, `z.int16()`, `z.int32()`, `z.uint8()`, `z.uint16()`, `z.uint32()`, `z.float32()`, `z.float64()`

### 4. Object Schema Changes

| v3 | v4 |
|----|----|
| `.strict()` | `z.strictObject()` |
| `.passthrough()` | `z.looseObject()` |
| `.deepPartial()` | Removed |
| `z.unknown()` optional | `z.unknown()` required |
| `z.any()` optional | `z.any()` required |

**Defaults applied within optional fields:**
```typescript
const schema = z.object({
  name: z.string().default("Anonymous"),
  age: z.number().optional()
});
schema.parse({}); // => { name: "Anonymous" }
```

**New `.prefault()` API** for replicating v3 behavior.

### 5. Enum Changes

- `z.nativeEnum()` deprecated - use `z.enum()` with enum objects

### 6. Record Changes

- `z.record()` no longer accepts single argument
```typescript
z.record(z.string(), z.string()); // key and value schemas required
```

### 7. Other Deprecations

- `.nonempty()` no longer changes inferred type
- `z.promise()` deprecated
- `z.function()` now a factory, not a schema
- `ctx.path` unavailable in `.superRefine()`
- `.merge()` deprecated - use `.extend()` instead
- `.strip()` deprecated
- `.nonstrict()` removed

### 8. ZodFunction Changes

```typescript
const myFunction = z.function({
  input: [z.object({ name: z.string(), age: z.number().int() })],
  output: z.string(),
});

myFunction.implement((input) => "Hello " + input.name);
myFunction.implementAsync(async (input) => "Hello " + input.name);
```

### 9. Refinement Changes


- `.refine()` now allows method chaining
- `.refine()` ignores type predicates

### 10. Coercion Changes


```typescript
const schema = z.coerce.string();
type schemaInput = z.input<typeof schema>; // v4: unknown (v3: string)
```

---

## Internal API Changes

- `._def` moved to `._zod.def`
- Generics updated: `ZodType` now tracks only `Output` and `Input`
- `ZodEffects`, `ZodBranded`, `ZodPreprocess` classes removed
- New `z.core` namespace with shared utilities
- Build against `"zod/v4/core"` for compatibility with both Zod and Zod Mini

---
## Transform vs Overwrite

```typescript
// v3: transform output type introspectable
const schema = z.string().transform(val => val.length);

// v4: transform output type NOT introspectable
const schema = z.string().overwrite(val => val.length);
```

---
## Migration Commands

```bash
npm install zod@^4.0.0
```

---


## Zod Mini (Bundle Size Alternative)

Zod Mini is a tree-shakable variant with a functional API:


```typescript
import * as z from "zod/mini";

z.optional(z.string());
z.union([z.string(), z.number()]);

z.array(z.number()).check(
  z.minLength(5),
  z.maxLength(10),
  z.refine(arr => arr.includes(5))
);
```

---

## Library Author Notes

### Peer Dependencies Recommendation
```json
"zod": "^3.25.0 || ^4.0.0"
```


### Import Subpaths (Permalinks)
- `"zod/v3"` for Zod 3
- `"zod/v4/core"` for Zod 4 Core (works with both Zod and Zod Mini)

**Avoid:** `"zod"`, `"zod/v4"`, `"zod/v4/mini"`


### Detecting Zod v4 at Runtime
```typescript
if ("_zod" in schema) {
  // Zod 4 schema
} else {
  // Zod 3 schema
}
```

---
## v4.2+ New Features

### Codecs (v4.2 flagship feature)

Bi-directional transformations:

```typescript
const stringToDate = z.codec(
  z.iso.datetime(),
  z.date(),
  {
    decode: (isoString) => new Date(isoString),
    encode: (date) => date.toISOString(),
  }
);
```


### z.fromJSONSchema() (v4.2)

Convert JSON Schema to Zod:
```typescript
const jsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer" }
  },
  required: ["name"]
};
const schema = z.fromJSONSchema(jsonSchema);
```


---
## Impact Assessment
| Area | Impact | Effort |
|------|--------|--------|
| Error handling | High | Medium |
| String formats | Medium | Medium |
| Number validation | High | High |
| Object schemas | Medium | Medium |
| Internal APIs | High | High |
| Record schemas | Medium | Medium |
| ZodFunction | Medium | Medium |

---
## References

- [Zod v4 Changelog](https://zod.dev/v4/changelog)
- [Zod v4 Home](https://zod.dev/v4)
- [Library Authors Guide](https://zod.dev/library-authors)
- [Zod Mini Documentation](https://zod.dev/v4/mini)
- [Community Codemod](https://github.com/unts/eslint-plugin-zod)