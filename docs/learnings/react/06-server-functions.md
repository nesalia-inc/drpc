# React Server Functions & Server Actions

Date: 2026-04-21
Tag: [react] [rsc] [server-functions] [server-actions]

## Overview

**Server Functions** allow Client Components to call async functions executed on the server.

> **Terminology:** Until September 2024, Server Functions were called "Server Actions." A Server Function becomes a Server Action only when passed to an `action` prop or called from inside an action—not all Server Functions are Server Actions.

---

## Defining Server Functions

### Method 1: Inline in Server Components

Use `"use server"` directive directly in an async function:

```tsx
// Server Component
import Button from './Button';

function EmptyNote() {
  async function createNoteAction() {
    'use server';
    await db.notes.create();
  }

  return <Button onClick={createNoteAction} />;
}
```

### Method 2: Module-level (File Export)

Create a dedicated file with `"use server"` at file top:

```tsx
// actions.ts
'use server';

export async function createNote() {
  await db.notes.create();
}
```

Client Components can then import and use these functions directly.

---

## Calling Server Functions from Client

When invoked on the client, the function reference appears as:

```js
{$$typeof: Symbol.for("react.server.reference"), $$id: 'functionName'}
```

### Basic Usage

```tsx
"use client";
import { createNote } from './actions';

function EmptyNote() {
  return <button onClick={() => createNote()} />;
}
```

---

## Serializable Arguments

Server Function arguments must be serializable:

**Supported types:**
- Primitives: `string`, `number`, `bigint`, `boolean`, `undefined`, `null`
- Symbols registered in global registry (`Symbol.for`)
- Iterables: `String`, `Array`, `Map`, `Set`, `TypedArray`, `ArrayBuffer`
- `Date`, `FormData`
- Plain objects (object initializers)
- Server Functions
- `Promises`

**Not supported:**
- React elements / JSX
- Regular functions or component functions
- Classes or class instances
- Objects with null prototype
- Non-global symbols

---

## Using with Forms

### Direct Form Action

Pass a Server Function directly to `form.action`:

```tsx
"use client";
import { updateName } from './actions';

function UpdateName() {
  return (
    <form action={updateName}>
      <input type="text" name="name" />
    </form>
  );
}
```

React automatically resets the form on successful submission.

### Using `useActionState`

For pending state and last response access:

```tsx
"use client";
import { updateName } from './actions';

function UpdateName() {
  const [state, submitAction, isPending] = useActionState(updateName, { error: null });

  return (
    <form action={submitAction}>
      <input type="text" name="name" disabled={isPending} />
      {state.error && <span>Failed: {state.error}</span>}
    </form>
  );
}
```

### Progressive Enhancement (Permalink)

Add a permalink URL as third argument for server-side fallback:

```tsx
"use client";
import { updateName } from './actions';

function UpdateName() {
  const [, submitAction] = useActionState(updateName, null, `/name/update`);

  return <form action={submitAction}>...</form>;
}
```

When permalink is provided, React redirects to specified URL if form is submitted before JavaScript loads.

---

## With useTransition

```tsx
"use client";
import { useState, useTransition } from 'react';

function LikeButton() {
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(0);

  const onClick = () => {
    startTransition(async () => {
      const currentCount = await incrementLike();
      setLikeCount(currentCount);
    });
  };

  return <button onClick={onClick} disabled={isPending}>Like</button>;
}
```

---

## Server Function as Action

A Server Function becomes a Server Action when:
- Passed to an `action` prop
- Called from inside an action

```tsx
// Server Function
async function submitForm(formData: FormData) {
  'use server';
  await saveData(formData);
}

// Server Action (passed to action prop)
<form action={submitForm}>
  <button>Submit</button>
</form>
```

---

## Security Considerations

- Always treat arguments as untrusted input; validate and sanitize
- Always verify user permissions before mutations
- Use `experimental_taintUniqueValue` and `experimental_taintObjectReference` to prevent sensitive data from reaching client

---

## Important Notes

- Server Functions in React 19 are **stable** and won't break between minor versions
- Underlying APIs for bundlers/frameworks do not follow semver and may break in React 19.x minor versions
- For production support, pin to a specific React version or use Canary release

---

## References

- [Server Functions Reference](https://react.dev/reference/rsc/server-functions)
- [use-server Directive](https://react.dev/reference/rsc/use-server)