# No Code Blocks as Section Starters

A section must not begin with a code block. Always lead with a paragraph that explains what the code demonstrates.

## Why

- Sections need context before showing code
- Readers need to understand the purpose before seeing implementation
- Code examples should support the prose, not replace it
- Jumping straight into code feels abrupt and unpolished

## Rule 1: Sections Must Not Start with Code Blocks

Every section heading must be followed by explanatory text before any code block.

### Forbidden

```mdx
## My Function

```typescript
function foo() { }
```
```

### Allowed

```mdx
## My Function

This function demonstrates basic usage of the foo pattern.

```typescript
function foo() { }
```
```

## Rule 2: Paragraphs Must Not Start with Inline Code

Inline code at the start of a paragraph is hard to read and breaks flow.

### Forbidden

```mdx
`defineContext` is used to create the router. You can also use it for middlewares.
```

### Allowed

```mdx
Use `defineContext` to create the router. You can also use it for middlewares.
```

## Enforcement

### Section Start Check

Before a code block, verify there is at least one paragraph of prose:

```mdx
## Section Title

Explanation of what this code does and why it matters.

```typescript
// code here
```
```

### Paragraph Start Check

Inline code should not be the first character in a paragraph. Add a word before it:

```mdx
<!-- Don't -->
`defineContext` returns an object.

<!-- Do -->
The `defineContext` function returns an object.
```

## Rule 3: Section Introductions Must Use Connecting Words

Section intro paragraphs should lead with connecting words like When, To, The, Unlike, From, After, Before, etc. This creates flow and helps readers understand context before encountering code.

### Forbidden

```mdx
## Creating Middleware

`createMiddleware` is a function that returns middleware.
```

### Allowed

```mdx
## Creating Middleware

Use `createMiddleware` to build custom middleware for your API.
```

### Recommended Opening Words

Use these words to start section introductions:

| Word | Use Case |
|------|----------|
| When | Describing conditions or triggers |
| To | Describing purpose or goal |
| The | Introducing a concept or object |
| Unlike | Making comparisons |
| From | Showing origin or source |
| After | Describing sequence |
| Before | Describing prerequisites |
| Use | Giving instructions |
| Call | Referring to function invocations |
| Define | Creating new definitions |

### Pattern

Always lead with a word, not with backtick-wrapped code:

```mdx
<!-- Don't -->
`defineContext` returns t.

<!-- Do -->
When you call `defineContext`, it returns t.
```