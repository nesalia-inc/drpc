# Notebook Layout

A compact version of Docs Layout.

## Overview

A more opinionated, streamlined design for documentation.

## Features

- Inherits most options from DocsLayout
- Sidebar and navbar cannot be replaced
- Configurable via `tabMode` (affecting Layout Tabs styling)
- Configurable via `navMode` (affecting navbar style)

## Usage

```tsx
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';

export default function Layout({ children }) {
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
```

## Tab Mode

```tsx
<DocsLayout {...baseOptions()} tabMode="navbar" tree={source.getPageTree()}>
  {children}
</DocsLayout>
```

## Nav Mode

```tsx
<DocsLayout {...base} nav={{ ...nav, mode: 'top' }} tree={source.getPageTree()}>
  {children}
</DocsLayout>
```

---

Sources: [Fumadocs Notebook Layout](https://www.fumadocs.dev/docs/ui/layouts/notebook)
