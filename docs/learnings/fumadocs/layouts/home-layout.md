# Home Layout

Shared layout for non-documentation pages.

## Overview

Use for landing pages and other pages outside the documentation section.

## Features

- Shared layout for pages like landing, blog, etc.
- Supports navigation menus
- Links configuration via `links` prop

## Usage

```tsx
import { HomeLayout } from 'fumadocs-ui/layouts/home';

export default function Layout({ children }) {
  return (
    <HomeLayout>
      {children}
    </HomeLayout>
  );
}
```

---

Sources: [Fumadocs Home Layout](https://www.fumadocs.dev/docs/ui/layouts/home)
