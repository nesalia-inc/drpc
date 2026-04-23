# Root Provider

Context provider for all Fumadocs UI components.

## Overview

Must be placed in the root layout. Includes `next-themes` and `<FrameworkProvider />`.

## Supported Frameworks

- Next.js
- React Router
- Tanstack (requires `HeadContent` and `Scripts` imports)
- Waku

## Props

| Prop | Type | Description |
|------|------|-------------|
| `search` | `SearchOptions` | Customize or disable search dialog |
| `theme` | `ThemeOptions` | Customize or disable theme provider |

**Disable search:**
```tsx
<RootProvider search={{ enabled: false }} />
```

**Disable theme:**
```tsx
<RootProvider theme={{ enabled: false }} />
```

## Usage (Next.js)

```jsx
import { RootProvider } from 'fumadocs-ui/provider/next';

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
```

## Features

- Enables light/dark mode support through `next-themes`
- Manages the documentation framework context for child components

---

Sources: [Fumadocs Root Provider](https://www.fumadocs.dev/docs/ui/layouts/root-provider)
