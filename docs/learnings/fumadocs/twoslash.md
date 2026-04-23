# Fumadocs - Twoslash

Enables TypeScript Twoslash in documentation, providing interactive code examples with type annotations, error displays, and hover tooltips.

## Overview

Built on Shiki's Twoslash integration.

## Installation

```bash
npm install fumadocs-twoslash twoslash
```

**Next.js configuration:**
```js
// next.config.js
{
  serverExternalPackages: ['typescript', 'twoslash']
}
```

## Setup

```js
transformerTwoslash({
  typesCache: createFileSystemTypesCache(), // optional
});
```

Requires Tailwind CSS v4.

## Usage in MDX

```md
```ts twoslash
console.log('Hello World');
```
```

## Features

| Feature | Syntax | Description |
|---------|--------|-------------|
| Error annotations | `// @errors` | Display compile errors |
| Hover type queries | `// ^?` | Show type on hover |
| Line markers | - | Highlight specific lines |
| Cut sections | `// ---cut---` | Collapse code sections |
| Named code blocks | - | Label code blocks |

---

Sources: [Fumadocs Twoslash](https://www.fumadocs.dev/docs/markdown/twoslash)
