# React `use()` Hook Documentation

Date: 2026-04-21
Tag: [react] [v19] [use] [hooks]

## Overview

`use()` is a React API that lets you read the value of a resource like a Promise or context. **Unlike React Hooks, `use` can be called within loops and conditional statements** like `if`.

```js
const value = use(resource);
```

**Key constraint:** Must be called inside a Component or Hook function.

---

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `resource` | Promise \| Context | The source of data |

## Returns

The resolved value from the resource (Promise resolution or context value).

---

## Usage with Promises

### Basic Pattern

```tsx
// Server Component - creates promise
async function ServerPage() {
  const messagePromise = fetchMessage();
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <Message messagePromise={messagePromise} />
    </Suspense>
  );
}

// Client Component - consumes promise
'use client';
import { use } from 'react';

export function Message({ messagePromise }) {
  const messageContent = use(messagePromise);
  return <p>Message: {messageContent}</p>;
}
```

### Error Handling with Promises

**Option 1: Error Boundary**
```tsx
import { ErrorBoundary } from "react-error-boundary";

function MessageContainer({ messagePromise }) {
  return (
    <ErrorBoundary fallback={<p>⚠️Something went wrong</p>}>
      <Suspense fallback={<p>Loading...</p>}>
        <Message messagePromise={messagePromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Option 2: Promise.catch()**
```tsx
const messagePromise = fetchMessage().catch(() => {
  return "no new message found.";
});
```

### Important: `use` cannot be called in a try-catch block

```tsx
// ❌ WRONG
function MessageComponent({ messagePromise }) {
  try {
    const message = use(messagePromise); // Error!
    return <p>{message}</p>;
  } catch (e) {
    return <p>Error</p>;
  }
}

// ✅ CORRECT - use Error Boundary
function MessageComponent({ messagePromise }) {
  const message = use(messagePromise);
  return <p>{message}</p>;
}
```

---

## Usage with Context

```tsx
import { use } from 'react';

function Button() {
  // Unlike useContext, can be called in conditionals:
  const theme = use(ThemeContext);

  return <button className={theme}>Click</button>;
}

// Works with early returns
function Component({ show }) {
  if (show) {
    const theme = use(ThemeContext);
    return <hr className={theme} />;
  }
  return <div>No theme</div>;
}
```

---

## Key Behaviors

### Server Components

Prefer `async`/`await` over `use` in Server Components:

```tsx
// ✅ PREFERRED in Server Components
async function ServerComponent() {
  const data = await fetchData(); // awaits directly
  return <Child data={data} />;
}

// ⚠️ use() causes re-render after data resolves
// async/await picks up from where it left off
```

### Client Components

Promises in Client Components are recreated on every render. Create promises in Server Components and pass to Client Components:

```tsx
// ✅ Server Component creates promise
async function ServerPage() {
  return <ClientComponent dataPromise={fetchData()} />;
}

// ✅ Client Component uses use()
'use client';
function ClientComponent({ dataPromise }) {
  const data = use(dataPromise);
  return <div>{data}</div>;
}
```

---

## Common Errors

### "Suspense Exception: This is not a real error!"

This error occurs when:
1. Calling `use` outside a React Component or Hook function
2. Calling `use` inside a try-catch block

**Wrong:**
```tsx
function MessageComponent({ messagePromise }) {
  function download() {
    const message = use(messagePromise); // ❌ Not in a Component/Hook
  }
}
```

**Correct:**
```tsx
function MessageComponent({ messagePromise }) {
  const message = use(messagePromise); // ✅ In a Component
  return <p>{message}</p>;
}
```

---

## Comparison with useContext

| Feature | `useContext` | `use` |
|---------|--------------|-------|
| Conditional usage | ❌ Must be at top level | ✅ Can be in if/loop |
| With Promises | ❌ Not supported | ✅ Supported |
| With Context | ✅ | ✅ |

---

## References

- [React use() Reference](https://react.dev/reference/react/use)