# Docs Layout

The default theme component for fumadocs documentation.

## Overview

Provides documentation page structure with sidebar navigation and mobile-only header/navbar.

## Features

### Sidebar Navigation

- Renders items from page tree structure
- Collapsible on desktop (enabled by default)
- `defaultOpenLevel` controls initial folder expansion
- Custom components via `components` prop (e.g., `SidebarSeparator`)
- Banner slot for custom content
- Prefetch toggle available

### Layout Tabs

- Dropdown-style tabs for root folders
- Configure via `meta.json` with `"root": true` or via `tabs` prop
- Decoration support for custom icons/styles via `transform` option

### Grid Layout System

- Uses CSS grid with named areas (sidebar, header, toc, main)
- CSS variables handle responsive sizing:
  - `--fd-sidebar-width`
  - `--fd-toc-width`
- Sticky positioning with row offset variables (`--fd-docs-row-*`)
- Works with Baseline Widely Available CSS features

## Props

| Prop | Type | Description |
|------|------|-------------|
| `tree` | `PageTree` | Required: page tree structure |
| `sidebar` | `object` | Sidebar config (`enabled`, `collapsible`) |
| `tabs` | `TabItem[]` | Layout tabs array |
| `githubUrl` | `string` | GitHub repository URL |
| `links` | `LinkItem[]` | Navigation links |
| `nav` | `object` | Navbar config (e.g., `title`) |
| `themeSwitch` | `object` | Theme switcher config |
| `searchToggle` | `object` | Search toggle config |

## Usage

```tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';

export default function Layout({ children }) {
  return (
    <DocsLayout tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
```

---

Sources: [Fumadocs Docs Layout](https://www.fumadocs.dev/docs/ui/layouts/docs)
