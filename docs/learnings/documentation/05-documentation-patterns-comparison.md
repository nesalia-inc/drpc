# Documentation Best Practices: Comparative Analysis

Date: 2026-04-23
Tags: [documentation] [best-practices] [patterns] [comparison]

## Overview

This document synthesizes insights from analyzing Better Auth and Fumadocs documentation, extracting patterns applicable to @deessejs/server documentation.

## Key Patterns from Both Sources

### 1. File Name Headers for Code Blocks

**What they do:**
Every code block has a filename annotation above it.

**Better Auth example:**
```typescript
// auth.ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: { enabled: true }
})
```

**Fumadocs example:**
```mdx
```tsx
// layout.tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';

export default function Layout({ children }) {
  return <DocsLayout tree={source.getPageTree()}>{children}</DocsLayout>;
}
```
```

**Apply to our docs:** Add `// filename.ts` header to every code block.

### 2. Complete Imports in Every Example

**What they do:**
Never show partial imports - every example is copy-paste runnable.

**Better Auth example:**
```typescript
// sign-up.ts
import { authClient } from "@/lib/auth-client"; //import the auth client

const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    callbackURL: "/dashboard"
}, {
    onRequest: (ctx) => { /*show loading*/ },
    onSuccess: (ctx) => { /*redirect*/ },
    onError: (ctx) => { /*display error*/ },
});
```

**Apply to our docs:** Always include:
1. Package imports (`@deessejs/server`, `zod`, `@deessejs/fp`)
2. Type imports
3. Local imports

### 3. Multi-Framework Examples

**What they do:**
Show code for each supported framework when behavior is similar.

**Better Auth example:**
Shows session usage in React, Vue, Svelte, Solid, Vanilla, Next.js, Nuxt, SvelteKit, Astro, Hono, TanStack.

**Apply to our docs:** When documenting Next.js integration, show both App Router and Pages Router if relevant.

### 4. Callback Patterns with Full Lifecycle

**What they do:**
Show onRequest/onSuccess/onError callbacks for async operations.

**Better Auth example:**
```typescript
authClient.signUp.email({
    email, password, name
}, {
    onRequest: (ctx) => { /*loading*/ },
    onSuccess: (ctx) => { /*redirect*/ },
    onError: (ctx) => { /*show error*/ },
});
```

**Apply to our docs:** Document lifecycle hooks (`.beforeInvoke()`, `.onSuccess()`, `.onError()`) with complete callback examples.

### 5. "On This Page" Navigation

**What they do:**
Right sidebar with clickable section headers for quick navigation.

**Fumadocs implementation:** Uses the page TOC automatically extracted from headings.

**Apply to our docs:** Ensure all MDX files use proper heading hierarchy (H2, H3) for automatic TOC generation.

### 6. Terminology Section

**What they do:**
Explain key terms upfront before diving into content.

**Fumadocs example:**
```mdx
### Terminology

Markdown/MDX: Markdown is a markup language...
Bun: A JavaScript runtime...
```

**Apply to our docs:** Add a terminology table to the Quick Start page.

### 7. FAQ Section

**What they do:**
Address common questions at the end of pages.

**Fumadocs example:**
```mdx
## FAQ

### Getting error with missing APIs or bugs?
### How to change the base route of docs?
```

**Apply to our docs:** Add FAQ accordion to every major feature page.

### 8. Multiple Variant Patterns

**What they do:**
Show different ways to accomplish the same thing.

**Fumadocs Tabs example:**
- With `value`
- Without `value` (auto-detect)
- Shared value (across groups)
- Persistent (localStorage)
- Default value
- Link to tab (URL hash)

**Apply to our docs:** Document different patterns for the same feature (e.g., query vs mutation, internal vs public).

### 9. Anti-Patterns Explicitly Documented

**What they do:**
Show what NOT to do alongside what TO do.

**Pattern:**
```mdx
### Anti-Patterns

❌ **Don't do X** - Why this is problematic

```typescript
// bad code
```

✅ **Do Y instead** - Why this is better

```typescript
// good code
```

**Apply to our docs:** Every feature page should have an anti-patterns section.

### 10. Step-Based Instructions

**What they do:**
Break complex setups into sequential steps with clear actions.

**Fumadocs uses:**
```md
### Installation [step]
### Write Code [step]
### Deploy [step]
```

**Better Auth uses:**
Named file headers with sequential setup.

**Apply to our docs:** Use `<Steps>` component for all multi-step processes.

### 11. Prerequisites Clearly Stated

**What they do:**
List what users need BEFORE starting.

**Fumadocs example:**
```
## Prerequisites
- Node.js 22+
- React framework (Next.js, Waku, etc.)
```

**Apply to our docs:** Always include requirements section.

### 12. Realistic Data in Examples

**What they do:**
No "foo", "bar", "test" placeholders - use realistic examples.

**Better Auth example:**
```typescript
email: "user@example.com",
password: "securePassword123",
name: "John Doe"
```

**Apply to our docs:** Use real-world data patterns in all examples.

## Implementation Checklist

For each documentation page:

- [ ] **Filename header** - Every code block has `// filename.ts`
- [ ] **Complete imports** - All imports shown, no partial imports
- [ ] **Prerequisites** - What is needed before starting
- [ ] **Terminology** - Key terms explained
- [ ] **Step-by-step** - Sequential instructions for complex tasks
- [ ] **FAQ section** - Common questions with answers
- [ ] **Anti-patterns** - What NOT to do and why
- [ ] **Realistic data** - No placeholders like "foo"
- [ ] **Multiple variants** - Different approaches when applicable
- [ ] **Callbacks documented** - Full lifecycle patterns shown
- [ ] **Link to source** - GitHub link for each page

## Quick Start Page Structure

Based on both sources, our Quick Start should follow:

1. **Introduction** - What is @deessejs/server
2. **Features cards** - 3-4 main capabilities
3. **Terminology table** - Key terms and concepts
4. **Requirements** - Node.js version, TypeScript, etc.
5. **Installation** - Package manager commands
6. **Step 1: Create API** - First example with full context
7. **Step 2: Setup Server** - Next.js/Hono integration
8. **Step 3: Setup Client** - Client creation
9. **FAQ Accordion** - Common questions
10. **Next Steps cards** - Links to further reading

## Code Example Template

```typescript
// filename.ts
// Description of what this file does

// 1. External imports
import { createAPI, t } from '@deessejs/server'
import { z } from 'zod'
import { ok } from '@deessejs/fp'

// 2. Type imports (if needed)
import type { Context } from '@deessejs/server'

// 3. Define the query/mutation
const myQuery = t.query({
  args: z.object({ id: z.string() }),
  handler: async (ctx: Context, args) => {
    // implementation
    return ok(result)
  }
})

// 4. Export or use
export const router = t.router({ myQuery })
```

## Sources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Fumadocs Documentation](https://www.fumadocs.dev/docs)
- [Better Auth Basic Usage](https://better-auth.com/docs/basic-usage)
- [Fumadocs Quick Start](https://www.fumadocs.dev/docs)
- [Fumadocs Markdown](https://www.fumadocs.dev/docs/markdown)