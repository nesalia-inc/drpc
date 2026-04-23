# Documentation Patterns: Best Practices Over Features

Date: 2026-04-23
Tags: [documentation] [patterns] [anti-patterns] [best-practices]

## Core Philosophy

**Documentation's role is NOT only to explain how the package works, but ESPECIALLY to give the best patterns.**

Users read documentation to:
- **Solve real problems** - They don't just want to understand features, they want to know the right way to solve their use cases
- **Avoid anti-patterns** - Showing what NOT to do is as important as showing what TO do
- **Learn by example** - Complete, production-ready examples teach better than API references
- **Make decisions** - Help users choose between alternatives with clear tradeoffs

## Pattern Documentation Template

When documenting a feature or concept, use this structure:

```mdx
## [Feature Name]

**When to use this pattern:** [clear use case description]

**Why it works:** [explanation of why this approach is better]

### Basic Usage

[Recommended approach with complete code]

### Advanced Usage

[Variation for more complex scenarios]

### Anti-Patterns

// ❌ Don't do this - [reason]
[bad code example]

// ✅ Do this instead - [reason]
[good code example]
```

### Common Use Cases

1. [Use case 1] - [how to solve]
2. [Use case 2] - [how to solve]
```

## Anti-Patterns Section

Every feature documentation page SHOULD include an anti-patterns section to:
- Prevent users from making common mistakes
- Explain why certain approaches don't work well
- Save time debugging issues that are already documented

### Anti-Pattern Structure

```mdx
### Anti-Patterns

Avoid these common mistakes:

❌ **Anti-pattern name** - Description of why this is problematic

```typescript
// Bad code here
```

✅ **Correct approach** - Explanation of the better solution

```typescript
// Good code here
```
```

## Content Hierarchy

### 1. Quick Start (Tutorial)

First-time users need:
- Clear getting-started path
- Minimum viable working example
- Step-by-step instructions
- File locations specified

### 2. Best Patterns (How-to)

Users solving specific problems need:
- Pattern name and use case
- Complete runnable example
- Tradeoff explanation
- Links to reference docs

### 3. Reference

Users building complex integrations need:
- Complete parameter descriptions
- All error codes documented
- Type definitions
- Link to source code

### 4. Explanation (Concepts)

Users understanding architecture need:
- Why design decisions were made
- How components interact
- Security considerations
- Performance implications

## Best Practices Checklist

- [ ] **Show recommended way first** - Present the best pattern before edge cases
- [ ] **Explain tradeoffs** - When showing multiple approaches, explain when to prefer each
- [ ] **Include anti-patterns** - Explicitly show what to avoid and why
- [ ] **Provide complete examples** - Runnable code that users can copy-paste
- [ ] **Document patterns, not just APIs** - Instead of listing parameters, show workflows
- [ ] **Use realistic data** - No "foo", "bar" placeholders in examples
- [ ] **Cover error handling** - Show failure modes, not just happy path
- [ ] **Specify file locations** - Always tell where files should be created
- [ ] **Break complex setups into steps** - Sequential instructions for advanced features
- [ ] **Include proper imports** - Every code example must have correct import statements

## Code Examples Must Have Proper Imports

Every code example must include correct, complete import statements. Without imports, examples are useless - users cannot copy-paste and run them.

### Why Imports Matter

1. **Runnable examples** - Code without imports fails immediately
2. **Package awareness** - Shows which packages need to be installed
3. **Context** - Imports reveal the source of utilities like `ok()`, `err()`, `z`

### Import Structure

```typescript
// 1. Package imports (external dependencies)
import { createAPI, t } from '@deessejs/server'
import { z } from 'zod'
import { ok } from '@deessejs/fp'

// 2. Type imports (if using TypeScript)
import type { Context } from '@deessejs/server'

// 3. Local imports (project-specific)
import { myHelper } from '@/lib/helper'
```

### Checklist for Code Examples

- [ ] All external packages imported (`@deessejs/server`, `zod`, etc.)
- [ ] Utility functions have source (`ok` from `@deessejs/fp`)
- [ ] Local helpers have mock import or explanation
- [ ] Types are imported (not just used inline)
- [ ] Package versions specified if critical

### Bad Example (missing imports)

```typescript
// ❌ What NOT to do
const user = await ctx.db.users.find(args.id)
return ok(user, { keys: [['users', { id: args.id }]] })
```

### Good Example (complete imports)

```typescript
// ✅ Complete example
import { defineContext, t } from '@deessejs/server'
import { z } from 'zod'
import { ok } from '@deessejs/fp'

const { router } = defineContext({
  context: () => ({ db: myDatabase }),
})

const getUser = t.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx, args) => {
    const user = await ctx.db.users.find(args.id)
    return ok(user, { keys: [['users', { id: args.id }]] })
  }
})
```

## Writing Style

### Lead with the Answer

**Before:**
> When configuring the router, you need to consider several factors including the base path, the middleware stack, and how errors are handled. The router is the main entry point...

**After:**
> Set the base path in `createAPI()` to prefix all routes:
> ```typescript
> const api = createAPI({ basePath: '/api/v1', ... })
> ```

### Use Descriptive Headings

**Before:** "Configuration"
**After:** "Configuring Rate Limits" or "Setting Base Path"

### Keep Paragraphs Short

2-4 sentences. Developers scan, they don't read novels.

### Code Examples Hierarchy

1. Most common/recommended pattern first
2. Variation for different scenarios
3. Edge case / advanced usage last
4. Anti-pattern examples with clear "don't do this"

## Metrics for Pattern Documentation

Track these to measure effectiveness:

| Metric | Target |
|--------|--------|
| Time-to-first-call | < 15 minutes from zero |
| Support ticket reduction | Measure before/after adding patterns |
| Search abandonment rate | < 20% of searches should fail |
| User success rate | Track task completion |

## Examples from Industry

### Good: Stripe Documentation

- Pattern-based organization
- Clear "do this, not that" examples
- Complete code examples per language
- Troubleshooting section for every feature

### Good: Twilio Documentation

- Anti-patterns explicitly documented
- Use case categorization
- Multiple code examples per endpoint
- Error handling documented

### Good: Algolia Documentation

- Decision guides (choose between approaches)
- Common recipes (pattern collection)
- Anti-patterns with migration paths

## Integration with Project Rules

This pattern approach aligns with existing project rules:

- **`docs/rules/documentation`** - Assumes zero knowledge, structure template
- **`docs/rules/reduce-duplication`** - Pattern reuse across docs
- **`docs/rules/typing-rule`** - Code examples should be typed

## Sources

- [Mintlify: How to write technical documentation](https://www.mintlify.com/resources/how-to-write-technical-documentation)
- [Fern: API documentation best practices](https://buildwithfern.com/post/api-documentation-best-practices-guide)
- [Techlasi: Software documentation best practices](https://techlasi.com/savvy/software-documentation-best-practices/)