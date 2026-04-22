# Suspense Improvements in React 19

Date: 2026-04-21
Tag: [react] [v19] [suspense] [performance]

## Overview

React 19 improves Suspense behavior by committing fallbacks immediately when a component suspends, rather than waiting for sibling rendering to complete.

---

## The Change

### React 18 Behavior (Before)

When a component suspends:
1. Component suspends
2. **Suspended siblings were rendered first**
3. **Then** the fallback was committed

Result: User sees loading state **after** sibling rendering completes.

### React 19 Behavior (After)

When a component suspends:
1. Component suspends
2. **Fallback is committed immediately**
3. Suspended siblings are rendered afterward (to "pre-warm" lazy requests)

Result: User sees fallback **instantly** while React works in background.

---

## Performance Benefit

This change means:
- **Suspense fallbacks display faster**
- Suspended siblings still get "pre-warmed" (rendered in background to prepare lazy requests)
- The fallback appears instantly rather than waiting for sibling rendering to complete

### Visual Example

```
Parent
├── Accordion
│   ├── Panel (isActive=true)
│   └── Panel (isActive=false) ← Suspends!
└── Fallback
```

With React 19:
1. `Panel` with `isActive=false` starts suspending
2. Fallback is shown immediately
3. Suspended `Panel` renders in background to warm up lazy requests

---

## How It Works

React schedules a separate render for suspended siblings **after** the fallback commits, allowing:
- Fallback to appear without delay
- Lazy requests in suspended tree to be prepared
- Better perceived responsiveness

---

## Migration Notes

This change should be transparent for most applications. If you relied on specific Suspense behavior for sibling rendering order, you may need to adjust.

---

## Combining with New Features

### With `use()` Hook

```tsx
// Server Component
async function Page() {
  const commentsPromise = fetchComments();

  return (
    <Suspense fallback={<CommentsSkeleton />}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Client Component
'use client';
import { use } from 'react';

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map(c => <Comment key={c.id} {...c} />);
}
```

### With ViewTransition

```tsx
<Suspense fallback={<VideoPlaceholder />}>
  <ViewTransition>
    <LazyVideo />
  </ViewTransition>
</Suspense>
```

### With Activity

```tsx
<Activity mode={isVisible ? 'visible' : 'hidden'}>
  <Suspense fallback={<ContentSkeleton />}>
    <LazyContent />
  </Suspense>
</Activity>
```

---

## References

- [React 19 Upgrade Guide - Suspense Improvements](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#improvements-to-suspense)