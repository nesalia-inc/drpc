# Page Tree

Tree structure describing all navigation links, including separators and folders. Sent to the client for sidebar and breadcrumb components.

## Overview

- **Multiple node types:** pages, folders, and separators
- **External URL support:** links can point outside the site
- **Icons:** ReactElement support for pages and folders
- **Unique IDs:** `$id` property unique across locales
- **Folder options:** collapsible, defaultOpen, index page
- **Fallback trees:** alternative page trees for special cases

## Important Note

Unserializable data like functions cannot be passed to page tree.

## API Types

### PageTree.Root

Initial root with `children`, `name`, `description`, `fallback`.

### PageTree.Item

Link with `type: "page"`, `url`, `external`, `icon`.

| Prop | Type | Description |
|------|------|-------------|
| `type` | `"page"` | Node type |
| `name` | `string` | Display name |
| `url` | `string` | Page URL |
| `external` | `boolean` | External link flag |
| `icon` | `ReactElement` | Page icon |
| `$id` | `string` | Unique ID across locales |

### PageTree.Folder

Container with `children`, `index`, `collapsible`, `defaultOpen`.

| Prop | Type | Description |
|------|------|-------------|
| `type` | `"folder"` | Node type |
| `name` | `string` | Display name |
| `children` | `PageTreeItem[]` | Child nodes |
| `index` | `PageTree.Item` | Index page |
| `collapsible` | `boolean` | Can be collapsed |
| `defaultOpen` | `boolean` | Start expanded |
| `icon` | `ReactElement` | Folder icon |
| `$id` | `string` | Unique ID across locales |

### PageTree.Separator

Label with `type: "separator"`, `name`.

| Prop | Type | Description |
|------|------|-------------|
| `type` | `"separator"` | Node type |
| `name` | `string` | Label text |

## Usage

```ts
import type * as PageTree from 'fumadocs-core/page-tree';

const tree: PageTree.Root = {
  name: "Docs",
  children: [
    { type: "page", name: "Quick Start", url: "/docs" },
    {
      type: "folder",
      name: "Guide",
      children: [
        { type: "page", name: "Installation", url: "/docs/guide/installation" }
      ],
      defaultOpen: true
    }
  ]
};
```

---

Sources: [Fumadocs Page Tree](https://www.fumadocs.dev/docs/headless/page-tree)
