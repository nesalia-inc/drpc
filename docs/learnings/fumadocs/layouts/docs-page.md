# Docs Page

A page component in your documentation.

## Overview

Used within Docs Layout to render individual documentation pages.

## Usage

```tsx
import { DocsPage } from 'fumadocs-ui/layouts/docs/page';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';

export default function Page({ page }) {
  return (
    <DocsPage>
      <InlineTOC items={page.data.toc} />
      {/* Page content */}
    </DocsPage>
  );
}
```

---

Sources: [Fumadocs Docs Page](https://www.fumadocs.dev/docs/ui/layouts/docs-page)
