# Better Auth Documentation Analysis

Date: 2026-04-23
Tags: [documentation] [analysis] [better-auth] [auth]

## Overview

Better Auth is a TypeScript authentication library. Its documentation is an excellent example of well-structured technical documentation.

**Site:** https://better-auth.com/docs

## Strengths

### 1. Code Examples with Full Context

Every code example includes:
- File name header (e.g., `auth.ts`, `sign-up.ts`)
- Complete imports
- Context comments explaining what each part does

**Example structure:**
```typescript
// auth.ts
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true
    }
})
```

### 2. Multi-Framework Examples

For each feature, they show code for multiple frameworks:
- React (with `useSession` hook)
- Vue (composition API)
- Svelte
- Solid
- Vanilla
- Next.js, Nuxt, SvelteKit, Astro, Hono, TanStack

**Example:** Session documentation shows identical usage across React, Vue, Svelte, Solid, and Vanilla.

### 3. On This Page / TOC Navigation

Right sidebar shows "On this page" with all section headers for quick navigation.

### 4. Callback Patterns

Show full callback patterns for async operations:
```typescript
const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    callbackURL: "/dashboard"
}, {
    onRequest: (ctx) => {
        //show loading
    },
    onSuccess: (ctx) => {
        //redirect
    },
    onError: (ctx) => {
        // display error
    },
});
```

### 5. Plugins Ecosystem Page

Clear categorization of 50+ plugins:
- Authentication
- Authorization & Management
- API & Tokens
- OAuth & OIDC Providers
- Payments & Billing
- Security & Utilities
- Analytics & Tracking
- Community Plugins

### 6. AI Resources Section

Built-in AI assistance:
- Ask AI in docs
- LLMs.txt
- Documentation MCP server
- Skills for coding assistants

## What They Do Well

| Aspect | Implementation |
|--------|-----------------|
| **File headers** | Every code block has filename annotation |
| **Imports** | All imports shown, never partial |
| **Callbacks** | Full pattern with onRequest/onSuccess/onError |
| **Multi-framework** | Same feature shown across all supported frameworks |
| **Table of contents** | Right sidebar "On this page" navigation |
| **AI integration** | Built-in AI chat, llms.txt, MCP server |
| **Plugin docs** | Categorized plugin ecosystem with tables |

## Code Example Style

### 1. Named File Headers

```typescript
// auth.ts
import { betterAuth } from "better-auth"
// ... code

// sign-up.ts
import { authClient } from "@/lib/auth-client"
// ... code
```

### 2. Complete Working Examples

Every example is copy-paste runnable with:
- All imports
- Environment variables referenced
- Error handling shown
- Callback patterns included

### 3. Framework-Specific Variants

When a feature works differently per framework, they show all variants in tabs or sections:

```typescript
// React
const { data, error } = authClient.useSession()

// Vue
const session = authClient.useSession()

// Svelte
const session = authClient.useSession();
// use $session.data in template
```

## Anti-Patterns They Avoid

1. **No partial examples** - Always show complete code
2. **No missing imports** - All imports always present
3. **No "foo/bar" placeholders** - Realistic data used
4. **No abstract pseudocode** - All examples are runnable

## AI Integration

### Ask AI Feature
- Built-in chat in documentation
- Uses OpenRouter or Inkeep
- Grounded in documentation

### LLMs.txt
- Lightweight index for AI overview
- Generated automatically

### MCP Server
- `https://mcp.better-auth.com/mcp`
- Allows AI coding assistants to use their docs

## Sources

- [Better Auth Documentation](https://better-auth.com/docs)
- [Better Auth Basic Usage](https://better-auth.com/docs/basic-usage)
- [Better Auth Plugins](https://better-auth.com/docs/plugins)