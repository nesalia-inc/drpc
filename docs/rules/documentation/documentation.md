# Documentation Rule

## Assume Zero Knowledge

When writing documentation, always assume the reader has **no prior knowledge** of the project.

### Why?

Documentation is often read by:
- New users discovering the project for the first time
- Developers evaluating the tool
- Users from different backgrounds and ecosystems

Starting from zero ensures:
- No assumed terminology
- Clear explanations of concepts
- Complete context for every example
- Accessible onboarding experience

### What This Means

1. **Define terms** - Don't assume readers know what "mutation", "context", or "router" mean
2. **Explain why** - Not just what something does, but why you'd use it
3. **Complete examples** - Every code snippet should be runnable with minimal context
4. **File locations** - Always specify where files should be created (e.g., `src/api.ts`, `app/api/[...route]/route.ts`)
5. **Step-by-step** - Break complex setups into clear, sequential steps

### Structure Template

For feature documentation:

```mdx
## Feature Name

Brief description of what this feature does and why you'd use it.

### Prerequisites (optional)
What the user should know or have installed before.

### Step 1: [Action]
Explanation of what to do.

**File location**

```typescript
// code example
```

### Step 2: [Action]
[...]

### What's Next?
Links to related documentation.
```

### Quick Start Page Structure

The Quick Start page MUST follow this structure (content may change, structure must remain):

1. Introduction
2. Cards (max 4) describing main features
3. Terminology table
4. Requirements
5. Installation
6. Create Your First API (Steps)
7. Setup Server
8. Setup Client
9. FAQ (Accordion)
10. Next Steps (Cards)

## Best Patterns Over Features

Documentation's role is **not only** to explain how the package works, but **especially** to give the **best patterns**.

### Why Best Patterns Matter

Users read documentation to:
- **Solve real problems** - They don't just want to understand features, they want to know the right way to solve their use cases
- **Avoid anti-patterns** - Showing what NOT to do is as important as showing what TO do
- **Learn by example** - Complete, production-ready examples teach better than API references
- **Make decisions** - Help users choose between alternatives with clear tradeoffs

### What This Means

1. **Show the recommended way first** - Present the best pattern before edge cases
2. **Explain tradeoffs** - When showing multiple approaches, explain when to prefer each
3. **Include anti-patterns** - Explicitly show what to avoid and why
4. **Provide complete examples** - Runnable code that users can copy-paste and adapt
5. **Document patterns, not just APIs** - Instead of listing every parameter, show common workflows

### Pattern Documentation Template

```mdx
## [Pattern Name]

**When to use this pattern:** [clear use case description]

**Why it works:** [explanation of why this approach is better]

### Basic Usage

[Recommended approach with complete code]

### Advanced Usage

[Variation for more complex scenarios]

### Anti-Patterns

```typescript
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
