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
