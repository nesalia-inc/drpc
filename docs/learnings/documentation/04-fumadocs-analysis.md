# Fumadocs Documentation Analysis

Date: 2026-04-23
Tags: [documentation] [analysis] [fumadocs] [mdx] [components]

## Overview

Fumadocs is a documentation framework for React. Its documentation is an excellent example of documentation for a documentation tool.

**Site:** https://www.fumadocs.dev/docs

## Structure

### Quick Start

**What they do well:**

1. **Prerequisites clearly stated** - Node.js 22 minimum
2. **Automatic installation with CLI** - `npm create fumadocs-app`
3. **Interactive prompts explained** - Framework and content source selection
4. **Manual installation available** - "From Existing Codebase?" link
5. **First MDX file example** - Shows exactly what to create
6. **Development command** - `npm run dev` with localhost URL
7. **FAQ section** - Common questions and solutions

### Terminology Section

Explains terms upfront:
- Markdown/MDX
- Bun
- React.js basics

## Component Documentation

### Steps Component

**Pattern used:**
```mdx
import { Step, Steps } from 'fumadocs-ui/components/steps';

<Steps>
<Step>

### Hello World

</Step>
</Steps>
```

**Also supports Tailwind-only usage:**
```mdx
<div className="fd-steps">
  <div className="fd-step" />
</div>
```

**Arbitrary variants:**
```mdx
<div className='fd-steps [&_h3]:fd-step'>
  ### Hello World
</div>
```

### Tabs Component

Shows multiple variants:
- **With value** - Explicit tab selection
- **Without value** - Auto-detect from children index
- **Shared value** - Same tab across multiple tab groups
- **Persistent** - localStorage persistence
- **Default value** - Set initial tab
- **Link to tab** - URL hash based
- **Update anchor** - Auto URL hash updates
- **Primitive usage** - Radix UI primitives directly

### Accordion Component

Shows MDX and React.js variants:
```mdx
// MDX usage
<Accordions type="single">
  <Accordion title="My Title">My Content</Accordion>
</Accordions>
```

```tsx
// React.js usage
export default function Page() {
  return (
    <Accordions type="single">
      <Accordion title="My Title">My Content</Accordion>
    </Accordions>
  );
}
```

**Linking to accordion:**
```mdx
<Accordion title="My Title" id="my-title">
  My Content
</Accordion>
```

## Markdown/MDX Features

### Cards Component

```mdx
import { HomeIcon } from 'lucide-react';

<Cards>
  <Card
    href="https://nextjs.org/docs/..."
    title="Fetching, Caching, and Revalidating"
  >
    Learn more about caching in Next.js
  </Card>
</Cards>
```

### Callouts

Types: info, warn, warning, error, success, idea

```mdx
<Callout>Hello World</Callout>
<Callout title="Title" type="warn">Hello World</Callout>
```

### Code Blocks

**Features:**
- Syntax highlighting with Shiki
- Line numbers
- Twoslash support
- Shiki transformers (highlight, word, diff, focus)
- Tab groups

### NPM Commands

Auto-generates package manager commands:
```md
```npm
npm i next -D
```
```

Output shows npm, pnpm, yarn, bun tabs.

### Steps via Remark Plugin

```md
### Installation [step]
### Write Code [step]
### Deploy [step]
```

## Layout Documentation

### Docs Layout

Shows:
1. **Basic usage** - Pass page tree
2. **Sidebar configuration** - Enabled, collapsible
3. **Layout tabs** - Dropdown behavior
4. **Banner slot** - Custom content
5. **Decoration** - Custom icons/styles
6. **Sidebar components** - Custom separators

### Layout System

Explains the CSS grid system:
- `grid-template` areas
- CSS variables for sizing
- Row offset variables
- Responsive behavior

## AI/LLM Integration

### LLMs.txt

Shows setup for multiple frameworks:
- Next.js
- React Router
- Tanstack Start
- Waku

### Ask AI

Setup options:
- OpenRouter (default)
- Inkeep AI

Shows how to add to docs layout:
```tsx
<AISearch>
  <AISearchPanel />
  <AISearchTrigger position="float">
    <MessageCircleIcon />
    Ask AI
  </AISearchTrigger>
</AISearch>
```

## Content Structure Patterns

### Frontmatter

```mdx
---
title: This is a document
---
```

### Auto Links

Internal links use framework's Link component (for prefetching).

External links get security attributes.

### Custom Anchors

```md
# heading [#my-heading-id]
```

### TOC Settings

```md
# Heading [!toc]       // Hidden from TOC
# Another Heading [toc] // Only in TOC
```

## What They Do Well

| Aspect | Implementation |
|--------|-----------------|
| **Code tabs** | Multiple languages/frameworks in tabs |
| **Tailwind alternative** | Components have CSS utility alternatives |
| **Copy button** | Built-in copy functionality |
| **Feedback** | "How is this guide?" rating |
| **Last updated** | Timestamp on pages |
| **Framework variants** | Different code for each React framework |
| **Prerequisites** | Explicitly stated before steps |
| **On this page** | Right sidebar TOC |

## Anti-Patterns They Avoid

1. **No code without imports** - Every example is complete
2. **No unexplained terms** - Terminology section
3. **No one-size-fits-all** - Multiple framework examples
4. **No broken links** - validate-links integration
5. **No outdated examples** - Regular updates

## Sources

- [Fumadocs Quick Start](https://www.fumadocs.dev/docs)
- [Fumadocs Core](https://www.fumadocs.dev/docs/headless)
- [Fumadocs UI Layouts](https://www.fumadocs.dev/docs/ui/layouts/docs)
- [Fumadocs Steps](https://www.fumadocs.dev/docs/ui/components/steps)
- [Fumadocs Tabs](https://www.fumadocs.dev/docs/ui/components/tabs)
- [Fumadocs Markdown](https://www.fumadocs.dev/docs/markdown)
- [Fumadocs LLMs](https://www.fumadocs.dev/docs/integrations/llms)