# Fumadocs - OG Images (Next.js)

Fumadocs integrates with Next.js Metadata API to dynamically generate OG images.

## Setup Steps

### 1. Define Image Segments

Create a `getPageImage` function that builds URL segments by appending `image.png` to page slugs.

### 2. Configure Metadata

Use `generateMetadata` to set OpenGraph images via the returned URL.

### 3. Build Route Handler

Create a route at `app/og/docs/[...slug]/route.tsx`:

```tsx
import { ImageResponse } from 'next/og'

export async function GET(req, { params }) {
  return new ImageResponse(/* ... */)
}
```

Key requirements:
- Use `ImageResponse` from `next/og`
- Call `generateStaticParams` to generate images at build time
- Pass page title and description to a default image template

## Static Generation

The `generateStaticParams` function maps all pages to their image segments, enabling static generation at build time.

## Additional Presets

Additional presets like `mono` are available through the Fumadocs CLI.

---

Sources: [Fumadocs OG Images Next.js](https://www.fumadocs.dev/docs/integrations/og/next)
