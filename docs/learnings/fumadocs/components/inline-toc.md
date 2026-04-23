# Inline TOC

Add a Table of Contents inline within documentation pages.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `TOCItemType[]` | Yes | TOC items to display |
| `asChild` | `boolean` | No | — |
| `defaultOpen` | `boolean` | No | Start expanded |
| `open` | `boolean` | No | Controlled open state |
| `disabled` | `boolean` | No | Disable component |
| `onOpenChange` | `(open: boolean) => void` | No | Callback when open state changes |

## Usage

**In MDX content:**
```mdx
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';

<InlineTOC items={toc}>Table of Contents</InlineTOC>
```

**Adding to every page via layout:**
```tsx
import { DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';

export default function Page() {
  return (
    <DocsPage>
      <InlineTOC items={page.data.toc}>Table of Contents</InlineTOC>
    </DocsPage>
  );
}
```

Supports controlled and uncontrolled modes.

---

Sources: [Fumadocs Inline TOC](https://www.fumadocs.dev/docs/ui/components/inline-toc)
