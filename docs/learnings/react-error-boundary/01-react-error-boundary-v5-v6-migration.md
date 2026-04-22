# react-error-boundary v5 to v6 Migration Guide

## Overview

Version 6 of `react-error-boundary` (published 2025-05-03) is **ESM-only**, a breaking change for projects using CommonJS or environments without ES Module support.

## Breaking Changes

### 1. ESM-Only Module System

**v6.0.0** changed the module system to ES Modules only. This is the primary breaking change.

```
Module is ESM-only in order to better work with modern tooling.
```

**Impact:**
- Projects using frameworks or runtimes that don't support ES Modules must use **v5** of this library
- CommonJS requires are no longer supported (`require('react-error-boundary')` will fail in ESM contexts)
- Bundlers and environments must support ES Module imports

**Migration:** If you encounter ESM errors, pin to `react-error-boundary@5` in your dependencies.

### 2. TypeScript Changes

#### v5.0.0: `withErrorBoundary` Types Update (December 2024)

This update fixed compatibility with `@types/react@18.3.5` where `forwardRef` types changed.

**Problem:** The `forwardRef` callback `props` argument expects no `ref` property, but `Props extends Object` doesn't guarantee this.

**Solution:** `withErrorBoundary` HOC is now parameterized by component type instead of props type.

**Impact:** This is a breaking TypeScript change for anyone providing a type argument to `withErrorBoundary()`. The return type will be different.

Error seen without the fix:
```
Argument of type '(props: Props, ref: ForwardedRef<ComponentType<Props>>) => React.CElement<ErrorBoundaryProps, ErrorBoundary>'
is not assignable to parameter of type 'ForwardRefRenderFunction<ComponentType<Props>, PropsWithoutRef<Props>>'.
```

#### v6.1.0: Error Type Fixed (January 2026)

**Change:** Error type changed from `Error` to `unknown` in error handlers.

```
- Fix error type (Error -> unknown) (#235)
- Export getErrorMessage helper method
```

This affects the `onError` callback and `useErrorBoundary` hook return types.

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 6.1.1 | 2026-02-13 | Fixed Firefox README logo display |
| 6.1.0 | 2026-01-17 | Fixed error type (`Error` -> `unknown`), exported `getErrorMessage` helper |
| 6.0.3 | 2026-01-08 | Removed `react-dom` from peer dependencies (was accidentally added) |
| 6.0.2 | 2026-01-05 | Updated README and generated TS docs |
| 6.0.1 | 2026-01-05 | Updated README and generated docs |
| **6.0.0** | **2025-05-03** | **ESM-only module system** |
| **5.0.0** | **2024-12-21** | **Updated `withErrorBoundary` types for `forwardRef` compatibility** |

## API Reference

The API itself (components and hooks) remains consistent across v5 to v6:

### Components

- `ErrorBoundary` - Main error boundary component
- `useErrorBoundary` - Hook to trigger error boundary resets
- `useErrorBoundaryThread` - Hook for concurrent error handling
- `withErrorBoundary` - HOC to wrap components with error boundary
- `HasErrorBoundary` - Type utility for components with error boundaries

### Props

All optional:
- `onError` - Callback when an error occurs
- `onReset` - Callback when boundary resets
- `resetKeys` - Array of keys that trigger reset when changed
- `fallback` - Fallback component or render function
- `FallbackComponent` - Component to render on error
- `fallbackRender` - Render function for fallback

## React 19 Compatibility

**No explicit React 19 compatibility notes found in changelog.**

The library peer dependency has remained `react >= 16.13.1` across versions. No breaking changes related to React 19 were documented in the v6 release notes.

## Migration Summary

| From v5 to v6 | Action Required |
|---------------|-----------------|
| ESM-only | If using CommonJS or non-ESM runtime, stay on v5 |
| TypeScript return types | Review `withErrorBoundary` usages with explicit type parameters |
| Error type in handlers | Type changed from `Error` to `unknown` - update type assertions if needed |

## Staying on v5

If ESM is not compatible with your environment:

```json
{
  "dependencies": {
    "react-error-boundary": "^5.0.0"
  }
}
```

## References

- [GitHub Releases](https://github.com/bvaughn/react-error-boundary/releases)
- [v6.0.0 Release](https://github.com/bvaughn/react-error-boundary/releases/tag/6.0.0)
- [v5.0.0 Release (withErrorBoundary types)](https://github.com/bvaughn/react-error-boundary/releases/tag/5.0.0)
- [PR #211: withErrorBoundary types fix](https://github.com/bvaughn/react-error-boundary/pull/211)
- [PR #235: Error type fix](https://github.com/bvaughn/react-error-boundary/pull/235)