# Vitest v2 to v4 Migration Guide

**Date:** 2026-04-22
**Current Stable:** v4.1.x
**Tag:** [vitest] [v4] [v3] [migration] [breaking-changes]

## Overview

Vitest has had significant breaking changes across v2, v3, and v4 major releases. This guide covers migration from v2.x to v4.x.

**Prerequisites for v4:**
- Vite >= 6.0.0
- Node.js >= 20.0.0

---

## Breaking Changes by Version

### Vitest 4.0 Breaking Changes

#### 1. Coverage Provider Changes (HIGH IMPACT)

**Removed Options:**
- `coverage.all` - Removed entirely. Previously defaulted to `true`, causing slow/stuck coverage on minified files
- `coverage.extensions` - Removed

**Migration:**
```typescript
// v3 (before)
coverage: { all: true, extensions: ['js', 'ts'] }

// v4 (after)
coverage: {
  include: ['packages/**/src/**'],
  exclude: ['**/dist/**']
}
```

**New behavior:**
- Must define explicit `coverage.include` patterns
- `coverage.ignoreEmptyLines` now supported by V8 provider
- `coverage.ignoreClassMethods` now supported by V8 provider

#### 2. Pool Configuration Rework (HIGH IMPACT)

`poolOptions` flattened to top-level options:

```typescript
// v3 (before)
poolOptions: { forks: { execArgv: ['--expose-gc'], singleFork: true } }

// v4 (after)
{
  execArgv: ['--expose-gc'],
  maxWorkers: 1,
  isolate: false
}
```

| Old Option | New Option |
|------------|------------|
| `poolOptions.forks.singleFork` | `maxWorkers: 1` |
| `poolOptions.forks.execArgv` | `execArgv: [...]` |
| `poolOptions.forks.isolate` | `isolate: boolean` |

#### 3. Test Options Syntax (HIGH IMPACT)

Third argument object removed:

```typescript
// v3 (before) - caused errors in v4
test('example', () => {}, { retry: 2 })

// v4 (after) - options as second argument
test('example', { retry: 2 }, () => {})
```

#### 4. Constructor Mocking (MEDIUM IMPACT)

Constructor mocks must use `function` or `class` keyword, not arrow functions:

```typescript
// v3 (before)
vi.mock('./MyClass', () => ({
  default: vi.fn(() => 'mocked')
}))

// v4 (after) - must use function keyword
vi.mock('./MyClass', () => ({
  default: vi.fn(function() { return 'mocked' })
}))
```

#### 5. Browser Provider Syntax (MEDIUM IMPACT)

```typescript
// v3 (before)
provider: 'playwright'

// v4 (after)
provider: playwright({ launchOptions: {...} })
```

#### 6. Import Path Changes (MEDIUM IMPACT)

```typescript
// v3 (before)
import { screen } from '@vitest/browser/context'

// v4 (after)
import { screen } from 'vitest/browser'
```

#### 7. Default Exclude Changed (LOW IMPACT)

Only `node_modules` and `.git` excluded by default. Previous default excluded additional patterns.

---

### Vitest 3.0 Breaking Changes

#### 1. `spy.mockReset` Behavior

`mock.mockReset()` now restores original implementation (was `undefined` in v2).

#### 2. `vi.spyOn` Reuse

`vi.spyOn` reuses mock if already mocked (previously created new mock each time).

#### 3. Fake Timers

`performance.now()` now faked by default in fake timers.

#### 4. Error Equality

Error equality checks now include `cause` and prototype matching.

---

### Vitest 2.0 Breaking Changes

#### 1. Default Pool Changed

Default pool changed from `threads` to `forks`.

#### 2. Hooks Serialization

Hooks now run serially (not parallel) by default.

#### 3. Generic Type Syntax

```typescript
// v2 (before)
vi.fn<Args, Return>()

// v3+ (after)
vi.fn<typeof add>()
```

#### 4. Mock Results

`mock.results` no longer auto-resolved. Use `mock.settledResults` instead.

---

## Migration Commands

```bash
# Install Vitest v4 with required Vite v6
npm install vitest@^4.0.0 vite@^6.0.0 --save-dev

# If using coverage-v8
npm install @vitest/coverage-v8@^4.0.0 --save-dev
```

---

## Impact Assessment

| Change | Impact | Effort |
|--------|--------|--------|
| Coverage config syntax | High | 30 min |
| Pool config syntax | High | 30 min |
| Test options order | High | 1-2 hours |
| Constructor mocks | Medium | 15 min |
| Browser provider syntax | Medium | 15 min |
| Import paths | Low | 10 min |

---

## Migration Checklist

- [ ] Update Vite to >= 6.0.0
- [ ] Update Node.js to >= 20.0.0
- [ ] Replace `coverage.all` with explicit `coverage.include` patterns
- [ ] Remove `coverage.extensions`
- [ ] Migrate `poolOptions.forks/singleFork` to top-level options
- [ ] Move test options from third argument to second argument
- [ ] Update constructor mocks to use `function` keyword
- [ ] Update browser provider syntax to object format
- [ ] Update import paths (`@vitest/browser/context` → `vitest/browser`)
- [ ] Review `mock.results` usage (use `mock.settledResults`)
- [ ] Update generic type syntax for `vi.fn()`
- [ ] Test runner executes hooks serially (check if tests depend on parallel hooks)

---

## References

- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest 4.0 Release Notes](https://vitest.dev/guide/testing-types.html)
- [Vitest Coverage v8](https://vitest.dev/guide/coverage.html)