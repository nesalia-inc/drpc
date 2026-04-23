# Fumadocs - Page Conventions

Fumadocs generates page slugs and sidebar trees from a content directory using the `loader()` API, following file-system-based routing patterns.

## File Configuration

MDX and Markdown files use frontmatter to define page metadata:

```mdx
---
title: My Page
description: Best document ever
icon: HomeIcon
---
```

**Frontmatter properties:**
- `title` - Page title
- `description` - Page description
- `icon` - Page icon

## Slug Generation

Slugs derive from file paths relative to the content folder. Directories wrapped in parentheses become folder groups without affecting child slugs.

## Folder Structure

Folders support customization via `meta.json`:

```json
{
  "title": "Display Name",
  "icon": "MyIcon",
  "pages": ["index", "getting-started"],
  "defaultOpen": true
}
```

Root folders hide other content when active - useful for documentation with separate product sections.

## Page Ordering

The `pages` array controls sidebar item order using various syntax types:

| Syntax | Description |
|--------|-------------|
| `path` | Simple path to a page |
| `---Label---` | Separator with label |
| `[Text](url)` | Link |
| `...` | Rest operator (all remaining pages) |
| `z...a` | Rest operator in reverse order |
| `...folder` | Extract specific folder |
| `!item` | Exclude item |

## i18n Routing

Two parser modes for internationalization:

- **dot** - Locale suffixes on filenames: `get-started.cn.mdx`
- **dir** - Language folders grouping content by locale

---

Sources: [Fumadocs Page Conventions](https://www.fumadocs.dev/docs/page-conventions)
