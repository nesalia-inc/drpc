# React Server Components

Date: 2026-04-21
Tag: [react] [rsc] [server-components] [architecture]

## Overview

Server Components are a new type of component that renders ahead of time (before bundling) in an environment separate from the client app or SSR server.

**Key characteristic:** Not sent to the browser, so they cannot use interactive APIs like `useState`.

---

## Two Modes of Operation

### 1. Build Time (Static Content)

For static content that doesn't change per request. Components render at build time, output can be SSR'd to HTML and uploaded to CDN.

**Benefits:**
- Users don't download expensive libraries (e.g., `marked` + `sanitize-html` ≈ 75KB gzipped)
- Content visible during first page load
- No second request needed after page loads

```tsx
// Server Component - runs at build time
import marked from 'marked'; // Not included in bundle
import sanitizeHtml from 'sanitize-html'; // Not included in bundle

async function Page({ page }) {
  const content = await file.readFile(`${page}.md`);
  return <div>{sanitizeHtml(marked(content))}</div>;
}
```

### 2. Request Time (Dynamic Data)

For dynamic data. Components render on web server during request, accessing data layer directly without API endpoints.

**Benefits:**
- Eliminates client-server waterfalls (fetching in useEffect)
- Can access database directly
- Data and JSX passed as props to Client Components

```tsx
import db from './database';

async function Note({ id }) {
  const note = await db.notes.get(id);
  return (
    <div>
      <Author id={note.authorId} />
      <p>{note}</p>
    </div>
  );
}

async function Author({ id }) {
  const author = await db.authors.get(id);
  return <span>By: {author.name}</span>;
}
```

---

## Adding Interactivity with Client Components

Server Components combine with Client Components using `"use client"` directive:

### Server Component

```tsx
// app/Notes.tsx (Server Component)
import Expandable from './Expandable';

async function Notes() {
  const notes = await db.notes.getAll();
  return (
    <div>
      {notes.map(note => (
        <Expandable key={note.id}>
          <p note={note} />
        </Expandable>
      ))}
    </div>
  );
}
```

### Client Component

```tsx
// app/Expandable.tsx (Client Component)
"use client"

export default function Expandable({ children }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}>Toggle</button>
      {expanded && children}
    </div>
  );
}
```

---

## Async Components

Server Components support `async`/`await` in render. When awaiting, React suspends and waits for the promise to resolve.

### Cross-Server/Client Streaming Pattern

```tsx
// Server Component
async function Page({ id }) {
  const note = await db.notes.get(id);

  // Not awaited - starts on server, awaits on client
  const commentsPromise = db.comments.get(note.id);
  return (
    <div>
      {note}
      <Suspense fallback={<p>Loading Comments...</p>}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </div>
  );
}
```

```tsx
// Client Component
"use client";
import { use } from 'react';

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  return comments.map(comment => <p>{comment}</p>);
}
```

---

## Important Directives

| Directive | Purpose | Usage |
|-----------|---------|-------|
| `"use client"` | Marks component as Client Component | At top of file |
| `"use server"` | Marks function as Server Function | In function body (inline) or file top (module) |

**Note:** There is no `"use server"` directive for Server Components. Server Functions use this directive.

---

## Directives Syntax

```tsx
// In function body (inline Server Function)
async function createNoteAction() {
  'use server';
  await db.notes.create();
}

// At file top (all exports are Server Functions)
'use server';

export async function createNote() {
  await db.notes.create();
}
```

---

## Architecture Summary

Server Components combine:
- **Server-centric MPA:** Simple "request/response" mental model
- **Client-centric SPA:** Seamless interactivity

Giving the best of both worlds.

---

## Limitations

1. **Bundler/Framework Support:** The underlying APIs do not follow semver and may break between React 19.x minor versions. Pin to specific version or use Canary release.

2. **No Interactive APIs:** Server Components cannot use `useState`, event handlers, or other client-only features.

3. **Async Components on Client:** Not supported on client; must use `use()` hook to await promises on client side.

---

## References

- [React Server Components Reference](https://react.dev/reference/rsc/server-components)