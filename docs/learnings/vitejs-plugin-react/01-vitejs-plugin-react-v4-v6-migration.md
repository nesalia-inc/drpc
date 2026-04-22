# @vitejs/plugin-react v4 to v6 Migration

**Date:** 2026-04-22
**Package:** @vitejs/plugin-react
**From:** v4.0.0
**To:** v6.0.1
**Risk:** Medium-High

---

## Executive Summary

Version 6.0.0 of `@vitejs/plugin-react` is a major release that removes Babel as a bundled dependency, shifts to Oxc for React Fast Refresh transformations, and requires Vite 8+. Projects using Babel plugins (including React Compiler) need to migrate to `@rolldown/plugin-babel`.

---

## Breaking Changes

### 1. Babel Removed as Dependency

**Impact:** High

The `babel` option in plugin configuration is removed. Babel is no longer bundled with the plugin.

**Before (v4):**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['@babel/plugin-proposal-throw-expressions'],
      },
    }),
  ],
})
```

**After (v6):**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      plugins: ['@babel/plugin-proposal-throw-expressions'],
    }),
  ],
})
```

---

### 2. React Compiler Setup Changed

**Impact:** High (if using React Compiler)

The `babel-plugin-react-compiler` must now be used with `@rolldown/plugin-babel` and the new `reactCompilerPreset()` helper.

**Before (v4):**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
})
```

**After (v6):**
```javascript
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
})
```

**With options:**
```javascript
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [
        reactCompilerPreset({
          compilationMode: 'annotation', // or 'wholeapp'
          target: '18', // or '17' for older React versions
        }),
      ],
    }),
  ],
})
```

---

### 3. Vite 8+ Required

**Impact:** High

Vite 7 and below are no longer supported. Upgrade to Vite 8 before upgrading the plugin.

```bash
# Update Vite
npm install vite@^8.0.0
```

---

### 4. Node.js Version Requirement

**Impact:** Low (if using modern Node)

Requires Node 20.19+ or 22.12+.

---

### 5. resolve.dedupe Changes

**Impact:** Medium

`react` and `react-dom` are no longer automatically added to `resolve.dedupe`.

If you encounter errors after upgrading, check for version mismatches in `dependencies` or `devDependencies`. To restore previous behavior:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [react()],
})
```

---

### 6. node_modules Processing Default Changed

**Impact:** Low

The default `exclude` pattern now includes `[/\/node_modules\//]`, allowing processing of files in `node_modules`. Previously, files in `node_modules` were always excluded regardless of the `exclude` option.

---

### 7. @vitejs/plugin-react-oxc Deprecated

**Impact:** Low

The separate `@vitejs/plugin-react-oxc` package is deprecated. V6 uses Oxc natively for Fast Refresh when using rolldown-vite. The `disableOxcRecommendation` option has been removed.

---

## Migration Steps

### Step 1: Verify Current Setup

Check your `vite.config.js` for Babel plugin usage:

```javascript
// Search for babel configuration in your vite config
plugins: [
  react({
    babel: {
      // ...
    },
  }),
]
```

### Step 2: Install Dependencies

```bash
# If using Babel plugins (including React Compiler)
npm install -D @rolldown/plugin-babel

# If using React Compiler
npm install -D babel-plugin-react-compiler
npm install react-compiler-runtime  # for React 17/18
```

### Step 3: Update vite.config.js

**Simple case (no Babel plugins):**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**With Babel plugins:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      plugins: ['your-babel-plugin'],
    }),
  ],
})
```

**With React Compiler:**
```javascript
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
})
```

### Step 4: Upgrade Vite (if needed)

```bash
npm install vite@^8.0.0
```

### Step 5: Verify Node.js Version

```bash
node --version
# Must be >= 20.19 or >= 22.12
```

---

## New Features in v6

### Oxc-Based Fast Refresh

V6 uses Oxc for React Refresh transform instead of Babel. This provides:
- Smaller installation size
- Improved build performance
- Native support in rolldown-vite

### reactCompilerPreset Helper

The new `reactCompilerPreset()` function provides:
- Preconfigured filter for better build performance
- Support for `compilationMode` option ('annotation' or 'wholeapp')
- Support for `target` option ('17', '18', or '19')

---

## Impact Assessment

| Area | Impact | Effort |
|------|--------|--------|
| Basic usage (no Babel) | None | 5 min |
| Babel plugin users | Medium | 15-30 min |
| React Compiler users | High | 30-60 min |
| Vite upgrade (if needed) | High | 15-30 min |

**Total estimated effort:** 30 minutes - 2 hours depending on complexity of Babel usage.

---

## References

- [CHANGELOG](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md)
- [Release v6.0.0](https://github.com/vitejs/vite-plugin-react/releases/tag/plugin-react%406.0.0)
- [Vite 8.0 Announcement](https://vite.dev/blog/announcing-vite8)
- [React Compiler Setup Guide](https://dev.to/recca0120/react-compiler-10-vite-8-the-right-way-to-install-after-vitejsplugin-react-v6-drops-babel-p0i)
- [@rolldown/plugin-babel](https://www.npmjs.com/package/@rolldown/plugin-babel)
