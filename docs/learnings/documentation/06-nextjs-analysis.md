# Next.js Documentation Analysis

Date: 2026-04-23
Tags: [documentation] [analysis] [nextjs] [react]

## Overview

Next.js is Vercel's React framework for full-stack web applications. Its documentation is one of the most comprehensive and well-organized in the industry.

**Site:** https://nextjs.org/docs

## Documentation Structure

### Three Main Sections

Next.js organizes docs into 3 clear sections:

1. **Getting Started** - Step-by-step tutorials for beginners
2. **Guides** - Tutorials on specific use cases
3. **API Reference** - Detailed technical reference

### App Router vs Pages Router

Clear separation with dropdown to switch between:
- **App Router** - Newer router with React Server Components
- **Pages Router** - Original router (still supported)

### Getting Started Flow

The getting started section follows a logical progression:
1. Installation
2. Project Structure
3. Layouts and Pages
4. Linking and Navigating
5. Server and Client Components
6. Fetching Data
7. Mutating Data
8. Caching
9. Revalidating
10. Error Handling
11. CSS
12. Image Optimization
13. Font Optimization
14. Metadata and OG images
15. Route Handlers
16. Proxy
17. Deploying
18. Upgrading

## What They Do Well

### 1. Code Examples with File Headers

Every code block shows the filename:

```tsx
// app/page.tsx
export default function Page() {
  return <h1>Hello, Next.js!</h1>
}
```

### 2. Multi-Framework Examples (TS/JS)

Code examples shown in both TypeScript and JavaScript:

```tsx
// TypeScript version
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

```jsx
// JavaScript version
export default function Page({ params }) {
  const { id } = await params
}
```

### 3. Multiple Package Manager Commands

Every CLI command shows npm, pnpm, yarn, bun:

```bash
pnpm create next-app

npx create-next-app@latest

yarn create next-app

bun create next-app
```

### 4. "Good to Know" Callouts

Callout boxes highlight important information:

```mdx
> Good to know:
>
> - The `App Router` uses React canary releases built-in...
```

### 5. Prerequisites Clearly Stated

Before diving in, they state required knowledge:

> Our documentation assumes some familiarity with web development. Before getting started, it'll help if you're comfortable with:
> - HTML
> - CSS
> - JavaScript
> - React

### 6. Server/Client Components Pattern

They show the complete pattern with multiple variants:

**Server Component passes data to Client Component:**

```tsx
// app/page.tsx (Server Component)
import LikeButton from '@/app/ui/like-button'
import { getPost } from '@/lib/data'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getPost(id)
  return <LikeButton likes={post.likes} />
}
```

```tsx
// app/ui/like-button.tsx (Client Component)
'use client'

import { useState } from 'react'

export default function LikeButton({ likes }: { likes: number }) {
  const [liked, setLiked] = useState(false)
  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? 'Liked!' : 'Like'} ({likes})
    </button>
  )
}
```

### 7. Step-by-Step Numbered Instructions

Installation uses numbered steps:

```
1. Create a new Next.js app named `my-app`
2. `cd my-app` and start the dev server.
3. Visit `http://localhost:3000`.
```

### 8. Version Indicator

Top of page shows current version:

```mdx
---
title: App Router
version: 16.2.4
---
```

### 9. "Was this helpful?" Feedback

At the bottom of every page:

```
Was this helpful?

👍 supported.
```

### 10. Sitemap and LLMs.txt Links

At the bottom of every page:

```
For a semantic overview of all documentation, see [/docs/sitemap.md]
For an index of all available documentation, see [/docs/llms.txt]
```

### 11. "Next Steps" Section

Links to related documentation at end of pages:

```mdx
## Next Steps

Learn more about the APIs mentioned in this page.

- [use client](/docs/app/api-reference/directives/use-client)
- Learn how to use the use client directive...
```

### 12. LLM-First Design

They have dedicated `llms.txt` and `llms-full.txt` endpoints for AI consumption:

- Index of all available documentation
- Complete content export for AI

### 13. AI Coding Agents Guide

Dedicated guide for AI agents: `/docs/app/guides/ai-agents`

- Configure projects so AI coding agents use up-to-date docs
- `AGENTS.md` file with guidance

### 14. Interactive Prompts Documentation

Shows all CLI prompts in detail:

```txt
What is your project named? my-app
Would you like to use the recommended Next.js defaults?
    Yes, use recommended defaults - TypeScript, ESLint, Tailwind CSS, App Router, AGENTS.md
    No, reuse previous settings
    No, customize settings - Choose your own preferences
```

## Guides Coverage

Impressive list of 50+ guides:
- AI Coding Agents
- Analytics
- Authentication
- Backend for Frontend
- Caching
- CDN Caching
- CI Build Caching
- Content Security Policy
- CSS-in-JS
- Custom Server
- Data Security
- Debugging
- Deploying to Platforms
- Draft Mode
- Environment Variables
- Forms
- ISR
- Instrumentation
- Internationalization
- MDX
- Migrating
- Multi-tenant
- OpenTelemetry
- PWAs
- Streaming
- Testing
- Upgrading
- And many more...

## Anti-Patterns They Avoid

1. **No partial code** - Always complete files
2. **No missing imports** - All shown
3. **No unexplained concepts** - Prerequisites stated
4. **No outdated content** - Regular updates, version indicators
5. **No broken navigation** - Clear sitemap

## Key Patterns for Our Docs

| Pattern | How They Do It | Apply to Our Docs |
|---------|----------------|-------------------|
| **File headers** | `// app/page.tsx` above code | Add `// filename.ts` to every block |
| **TS/JS variants** | Show both TypeScript and JavaScript | When relevant, show both |
| **Package managers** | All CLI commands for npm/pnpm/yarn/bun | Show all package manager options |
| **Callout boxes** | `> Good to know:` for tips | Use Callout component |
| **Prerequisites** | Stated upfront before steps | Add requirements section |
| **Feedback** | "Was this helpful?" at bottom | Consider adding |
| **Sitemap links** | `llms.txt` and `llms-full.txt` | Already implemented |
| **Next Steps** | Links to related pages | Add "What's Next" cards |
| **Multiple examples** | Different approaches shown | Show query vs mutation patterns |

## Sources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Getting Started](https://nextjs.org/docs/app/getting-started)
- [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js use client Directive](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Next.js Guides](https://nextjs.org/docs/app/guides)