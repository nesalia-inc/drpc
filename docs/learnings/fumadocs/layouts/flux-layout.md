# Flux Layout

An aggressively minimal layout for documentation.

## Overview

Originally created as an experimental design that prioritizes aesthetics over user experience.

## Features

- Minimalist, clean design
- Client-side component (cannot pass unserializable props from server components)
- `renderNavigationPanel` prop for customizing the bottom navigation panel
- No `tocPopover` options (unlike Docs Layout)

## Setup

```tsx
// layout.tsx
import { DocsLayout } from 'fumadocs-ui/layouts/flux';

// page.tsx - update your import
import { ... } from 'fumadocs-ui/layouts/flux/page'; // was docs/page
```

## Recommendations

- Best paired with "static/local search" for efficient navigation
- Opinionated design; use Fumadocs CLI for customization

---

Sources: [Fumadocs Flux Layout](https://www.fumadocs.dev/docs/ui/layouts/flux)
