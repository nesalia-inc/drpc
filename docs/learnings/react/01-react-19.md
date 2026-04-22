# React 19 Breaking Changes & Migration Guide

Date: 2026-04-21
Tag: [react] [v19] [breaking-changes] [migration]

## Overview

React 19 is a major version with significant new features including Server Components, Server Actions, new hooks (`useActionState`, `useOptimistic`, `use`), and breaking changes to refs, context providers, and form handling.

## Breaking Changes Summary

| Change | Impact | Migration |
|--------|--------|-----------|
| Ref callbacks returning values | **High** | Use `no-implicit-ref-callback-return` codemod |
| Refs called with `null` on unmount | Medium | Return cleanup function instead |
| `useFormState` | Medium | Renamed to `useActionState` |
| `forwardRef` | Medium | Use `ref` as a prop instead |
| `<Context.Provider>` | Low | Use `<Context>` as provider |
| `contextTypes`/`childContextTypes` | High | Legacy context API removed |

## Breaking Changes Detail

### 1. Ref Callbacks Returning Values (HIGH IMPACT)

TypeScript now rejects any return value other than a cleanup function from ref callbacks.

```jsx
// OLD - Now errors
<div ref={current => (instance = current)} />

// NEW - Must return undefined or cleanup function
<div ref={current => { instance = current; }} />
```

**Codemod:** `npx types-react-codemod no-implicit-ref-callback-return`

### 2. Refs Called with null Deprecated

Previously React called ref functions with `null` when unmounting. This is deprecated.

```jsx
// OLD
<input ref={(ref) => {
  // setup
  if (ref === null) {
    // unmounting
  }
}} />

// NEW - Use cleanup function
<input ref={(ref) => {
  // setup
  return () => {
    // cleanup
  };
}} />
```

### 3. `useFormState` Renamed to `useActionState`

```typescript
// OLD
import { useFormState } from 'react-dom';
const [state, formAction] = useFormState(action, initialState);

// NEW
import { useActionState } from 'react';
const [state, formAction, isPending] = useActionState(action, initialState);
```

### 4. `forwardRef` Deprecated

New function components should use `ref` as a prop instead:

```tsx
// OLD
const MyInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// NEW
function MyInput({ placeholder, ref }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input placeholder={placeholder} ref={ref} />;
}
```

### 5. `<Context.Provider>` Deprecated

```tsx
// OLD
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>

// NEW
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

A codemod will be provided for this migration.

## New Features

### `useActionState`

```tsx
import { useActionState } from 'react';

async function submitAction(previousState: FormState, formData: FormData) {
  const error = await submitForm(formData);
  return error ?? null; // returns state
}

export function Form() {
  const [state, formAction, isPending] = useActionState(submitAction, null);
  // ...
}
```

### `useOptimistic`

```tsx
import { useOptimistic } from 'react';

function ChatThread({ messages, sendMessage }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [
      ...state,
      { id: Date.now(), content: newMessage, pending: true }
    ]
  );

  async function handleSend(content: string) {
    addOptimisticMessage(content);
    await sendMessage(content);
  }

  return <MessageList messages={optimisticMessages} />;
}
```

### `use` API

Read promises and context in render:

```tsx
// Read promises (suspends until resolved)
const comments = use(commentsPromise);

// Read context conditionally (works after early returns)
const theme = use(ThemeContext);
```

### `useFormStatus`

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>Submit</button>;
}
```

### Form Actions

```tsx
<form action={async (formData) => {
  await submitForm(formData);
}}>
  <input name="email" type="email" />
  <button type="submit">Submit</button>
</form>
```

### Ref Cleanup Functions

```tsx
<input ref={(ref) => {
  // setup code
  ref.focus();

  // return cleanup
  return () => {
    ref.removeEventListener('change', handleChange);
  };
}} />
```

### Document Metadata Support

Native support for `<title>`, `<link>`, and `<meta>` tags - React automatically hoists them to `<head>`:

```tsx
function Article() {
  return (
    <article>
      <title>My Article</title>
      <link rel="canonical" href="https://..." />
      <meta name="description" content="..." />
    </article>
  );
}
```

### Stylesheet Support

```tsx
<link rel="stylesheet" href="foo" precedence="default" />
```

React manages insertion order and deduplication.

## Server Components & Server Actions

### Server Components

```tsx
// app/page.tsx (Server Component)
import { db } from './database';

async function Page() {
  const data = await db.query('SELECT * FROM posts');
  return <PostList posts={data} />;
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

export async function submitForm(formData: FormData) {
  // server-side logic
  return { success: true };
}
```

```tsx
// app/form.tsx (Client Component)
'use client';
import { submitForm } from './actions';

function Form() {
  return <form action={submitForm}>
    <button type="submit">Submit</button>
  </form>;
}
```

## Migration Checklist

### Phase 1: Refs

- [ ] Run `npx types-react-codemod no-implicit-ref-callback-return`
- [ ] Replace ref cleanup handling with cleanup functions
- [ ] Replace `forwardRef` with `ref` prop (or keep `forwardRef` for now, it's deprecated not removed)

### Phase 2: Context

- [ ] Replace `<Context.Provider>` with `<Context>`
- [ ] Codemod available for this

### Phase 3: Hooks

- [ ] Rename `useFormState` to `useActionState`
- [ ] Update import from `react-dom` to `react`
- [ ] `useActionState` returns `[state, formAction, isPending]` (3-tuple vs 2-tuple)

### Phase 4: Forms (Optional but Recommended)

- [ ] Adopt `<form action={...}>` pattern
- [ ] Use `useFormStatus` for pending states

## Impact Assessment

| Area | Impact | Effort |
|------|--------|--------|
| Ref callbacks | High | Medium |
| Ref cleanup | Medium | Medium |
| useFormState → useActionState | Medium | Low |
| forwardRef deprecation | Medium | Medium (can defer) |
| Context.Provider | Low | Low |

## Affected Packages

Based on version scan: **2 packages** use React 18 in this repo (`examples/basic-next`, `packages/client-react`).

## References

- [React 19 Announcement](https://react.dev/blog/2024/12/05/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)