# No Inline Code in Titles

Titles must not contain inline code blocks (backticks `` ` ``). Code references belong in the body text, not in headings.

## Why

- Titles are used in navigation, breadcrumbs, and SEO metadata
- Code in titles renders poorly in many contexts (sidebars, tabs, search results)
- Readers may not understand the code's purpose from a title alone
- It creates inconsistency - some titles have code, others don't

## Examples

### Forbidden

```mdx
---
title: Using `defineContext`
---

## Call `t.query()` with proper args

### Don't use `any` in your handlers
```

### Allowed

```mdx
---
title: Using defineContext
---

## Call t.query() with proper args

### Don't use any in your handlers
```

## When Code Belongs in Title

If the concept genuinely requires a code term (like a function name), write it as plain text without backticks:

```mdx
<!-- Don't -->
## Call `defineContext`

<!-- Do -->
## Call defineContext
```

If the code term is the primary subject of the page, consider using the word itself as the title:

```mdx
<!-- For a page specifically about defineContext -->
title: defineContext
```

## Enforcement

Linters can flag inline code in frontmatter `title` fields and headings (`#`, `##`, etc.).