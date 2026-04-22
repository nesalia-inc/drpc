# @vitest/coverage-v8 v2 to v4 Migration

**Date:** 2026-04-22
**Package:** @vitest/coverage-v8
**From:** v2.0.0
**To:** v4.1.5
**Risk:** Medium
**Learning File:** docs/learnings/vitest-coverage-v8/01-vitest-coverage-v8-v2-v4-migration.md

## Summary

The @vitest/coverage-v8 package has undergone significant internal changes from v2 to v4, primarily around coverage remapping and configuration options. While the user-facing API remains largely similar, there are important internal changes and configuration deprecations to be aware of.

## What's Changed

### Core Coverage Remapping (v3.2)

**Before (v2):**
- Used `v8-to-istanbul` for remapping V8 coverage to source files
- Coverage accuracy depended on source maps

**After (v3.2+):**
- Introduced `experimentalAstAwareRemapping` option using `ast-v8-to-istanbul`
- AST-based remapping provides better accuracy than source-map-only approach
- In v4, this becomes the **default and only** remapping method

### Breaking Changes

#### v3.0 Breaking Changes:
1. **Test files always excluded**: Coverage now always excludes test files regardless of `include` patterns
2. **`thresholds` improvements**: Added support for `maxUncovered` option to limit uncovered items

#### v4.0 Breaking Changes:
1. **Removed deprecated coverage options**: Many options that were deprecated in v3 are removed
2. **Coverage packages refactored**: Coverage provider exports changed
3. **Removed `v8-to-istanbul`**: Replaced entirely by `ast-v8-to-istanbul`
4. **Coverage configuration validation**: More strict validation of coverage options

### Configuration Changes

**Current configuration (v2):**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      include: ['src/**'],
    },
  },
})
```

**This configuration remains compatible in v4**, but some options are deprecated:

| Option | Status | Notes |
|--------|--------|-------|
| `provider: 'v8'` | OK | Still works |
| `reporter` | OK | Unchanged |
| `include` | OK | Unchanged |
| `exclude` | OK | Unchanged |
| ` thresholds` | OK | Enhanced in v3 with `maxUncovered` |
| `experimentalAstAwareRemapping` | **Removed in v4** | No longer needed - always enabled |

### Dependencies Changes

**v2 dependencies:**
- `v8-to-istanbul`
- `@bcoe/v8-coverage`
- `istanbul-lib-*` packages

**v4 dependencies:**
- `ast-v8-to-istanbul` (replaces `v8-to-istanbul`)
- `@bcoe/v8-coverage`
- `istanbul-lib-*` packages
- `magicast` (for config parsing)
- `tinyrainbow` (for colored output)

## Migration Steps

### 1. Update Dependencies

```bash
npm update @vitest/coverage-v8 vitest
# or
pnpm update @vitest/coverage-v8 vitest
```

### 2. Remove Deprecated Options

If you have `experimentalAstAwareRemapping` in your config, **remove it**:

```typescript
// BEFORE (v2 config with experimental option)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      experimentalAstAwareRemapping: true, // REMOVE THIS
    },
  },
})

// AFTER (v4 compatible)
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // AST remapping is now always enabled
    },
  },
})
```

### 3. Review Threshold Configuration

If you use thresholds, verify the syntax is correct:

```typescript
// v4 threshold configuration
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        // New in v3: maxUncovered option
        maxUncoveredLines: 10,
        maxUncoveredFunctions: 5,
      },
    },
  },
})
```

### 4. Update Vite Version (Required for v4)

v4 requires **Vite >= 6.0.0**. Update your `package.json`:

```bash
npm update vite
```

## Code Examples

### Simple Coverage Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
  },
})
```

### With Threshold Alerts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        // v3+ feature: limit uncovered items
        maxUncoveredLines: 5,
        maxUncoveredBranches: 10,
      },
      // v4: autoUpdate supports percentage formatting
      autoUpdate: true,
    },
  },
})
```

## Impact Assessment

| Area | Impact | Notes |
|------|--------|-------|
| **Configuration** | Low | Most options unchanged |
| **Dependencies** | Medium | New `ast-v8-to-istanbul` replaces `v8-to-istanbul` internally |
| **Vite Version** | Medium | Requires Vite >= 6.0 for v4 |
| **Node.js** | Low | Requires Node.js >= 20 for v4 |
| **Test Behavior** | Low | Coverage reports should be more accurate |

## Estimated Effort

- **Configuration changes**: 15-30 minutes
- **Dependency updates**: 5-10 minutes
- **Testing coverage output**: 15-30 minutes

**Total**: Approximately 1 hour for a typical project

## References

- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [Vitest v4 Blog Post](https://vitest.dev/blog/vitest-4)
- [Vitest v3.2 Blog Post](https://vitest.dev/blog/vitest-3-2) - AST remapping details
- [Vitest Migration Guide](https://vitest.dev/guide/migration)
- [GitHub Release v4.0.0](https://github.com/vitest-dev/vitest/releases/tag/v4.0.0)
- [GitHub Release v3.0.0](https://github.com/vitest-dev/vitest/releases/tag/v3.0.0)

## Notes

- The coverage provider API (`CoverageProvider`) is considered stable - no changes needed in custom providers
- If using custom reporters, verify they work with the new coverage map format
- The `coverageMap` is now included in the JSON reporter output (v3+)
- Browser mode coverage handling has specific considerations - see [browser coverage docs](https://vitest.dev/guide/browser#coverage)
