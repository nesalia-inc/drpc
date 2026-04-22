# React Release Notes: v18+

Date: 2026-04-21
Tag: [react] [release-notes] [migration]

## Overview

This folder contains migration guides and breaking changes for React versions 18 and 19, plus detailed documentation on React 19 new features.

## Files

### Core Migration Guides

| File | Description |
|------|-------------|
| `01-react-19.md` | React 19 breaking changes & migration guide |
| `00-react-18.md` | React 18 migration (stub) |

### React 19 New Features

| File | Description |
|------|-------------|
| `02-use-hook.md` | `use()` hook - read promises/context in render |
| `03-view-transition.md` | ViewTransition API for animations |
| `04-activity.md` | Activity component - state preservation without unmount |
| `05-server-components.md` | Server Components architecture |
| `06-server-functions.md` | Server Functions & Server Actions |
| `07-suspense-improvements.md` | Suspense fallback improvements |
| `08-deprecated-apis.md` | Removed and deprecated APIs in React 19 |

---

## Key Breaking Changes

| Change | Impact |
|--------|--------|
| Ref callbacks returning values rejected | High |
| `useFormState` → `useActionState` | Medium |
| `forwardRef` deprecated | Medium |
| `<Context.Provider>` deprecated | Low |

---

## Migration Priority

1. **Ref callbacks** - Run codemod to remove implicit returns
2. **Ref cleanup** - Return cleanup functions from ref callbacks
3. **Hooks** - Rename `useFormState` to `useActionState`
4. **Context** - Use `<Context>` as provider instead of `<Context.Provider>`

---

## React 19 Feature Summary

### New Hooks
- `useActionState` (formerly `useFormState`)
- `useOptimistic` - instant UI feedback during async updates
- `use` - read promises/context in render (works after early returns)
- `useFormStatus` - access form pending state

### New Components
- `<ViewTransition>` - animate component transitions
- `<Activity>` - preserve state without unmounting

### Server Features
- Server Components (stable)
- Server Functions / Server Actions
- `'use server'` directive

### Other Improvements
- Suspense fallback displays immediately
- Document metadata support (`<title>`, `<link>`, `<meta>` auto-hoisted)
- Stylesheet deduplication
- Ref cleanup functions

---

## References

- [React 19 Announcement](https://react.dev/blog/2024/12/05/react-19)
- [React 18 Announcement](https://react.dev/blog/2022/03/29/react-v18)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)