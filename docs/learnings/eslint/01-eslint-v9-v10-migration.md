# ESLint v9 to v10 Migration

**Date:** 2026-04-22
**Risk:** High
**Reference:** [ESLint v10.0.0 Release](https://github.com/eslint/eslint/releases/tag/v10.0.0)

## Overview

ESLint v10 is a major release that removes the legacy eslintrc configuration system entirely. Flat config is now the only configuration system.

---

## Breaking Changes Summary

### 1. Flat Config Required (Highest Impact)

ESLint v10 **removes all legacy eslintrc support**. The flat config system (`eslint.config.js`) is now mandatory.

**Before (eslint v9 - `.eslintrc.json`):**
```json
{
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unused-vars": "warn"
  }
}
```

**After (eslint v10 - `eslint.config.js`):**
```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
```

### 2. Node.js Version Requirement

**Changed:** ESLint v10 requires Node.js `^20.19.0 || ^22.13.0 || >=24`

Verify your Node.js version:
```bash
node --version
```

### 3. Package Changes

| Package | Change |
|---------|--------|
| `@eslint/js` | v10.0.0 - Now includes the recommended config |
| `minimatch` | Updated to v10 (breaking glob pattern changes) |
| `eslint` | No longer includes built-in configs |

### 4. Removed Command-Line Flags

The following flags were removed:
- `--rulesdir` - Custom rules directories no longer supported
- All `v10_*` and `unstable_*` experimental flags

### 5. Configuration Must Have Names

All configs in `eslint.config.js` must now have a `name` property:

```javascript
export default [
  {
    name: 'my-config',
    files: ['**/*.js'],
    rules: { }
  }
];
```

### 6. `eslint-env` Comments Now Report Errors

Previously, `/* eslint-env */` comments were ignored. In v10, they report errors. Use flat config globals instead:

```javascript
// OLD (v9) - now reports error
/* eslint-env node */

// NEW (v10)
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: { require: 'readonly', process: 'readonly' }
    }
  }
];
```

### 7. Rule Context Methods Removed

The following deprecated rule context methods were removed:
- `context.getSourceLines()`
- `context.getAllComments()`
- `context.getTokenOrCommentBefore()`
- `context.getCommentAfter()`
- `context.getCommentBefore()`
- `context.getTokens()`
- `context.getTokensAfter()`
- `context.getTokensBefore()`

**Use AST traversal instead.**

### 8. SourceCode Methods Removed

Deprecated `SourceCode` methods removed:
- `sourceCode.hasSideEffects()`
- `sourceCode.getNav`
- `sourceCode.parserOptions`

### 9. Rule Changes

| Rule | Change |
|------|--------|
| `no-shadow-restricted-names` | Now reports `globalThis` by default |
| `radix` | `"always"` and `"as-needed"` options deprecated |
| `func-names` | Stricter schema validation |
| `no-invalid-regexp` | Stricter validation with `uniqueItems: true` |
| `no-unsafe-finally` | Now reports generator functions in finally |

### 10. RuleTester Changes

- Stricter assertions for valid test cases
- Test case failure location estimation improved
- `RuleTester` no longer accepts deprecated `type` property

### 11. Program Range Change

The `Program` node now spans the entire source text (previously started after shebang if present).

### 12. Color Output

`chalk` replaced with Node.js built-in `styleText`. The `ResultsMeta` object now includes `color` property.

---

## Migration Steps

### Step 1: Update Node.js

Ensure Node.js version meets requirement:
```bash
nvm install 20.19.0
nvm use 20.19.0
```

### Step 2: Install ESLint v10

```bash
npm install eslint@10 --save-dev
```

### Step 3: Install Required Packages

```bash
# For TypeScript projects
npm install @eslint/js typescript-eslint --save-dev

# If using other frameworks
npm install @html-eslint/eslint-plugin --save-dev
```

### Step 4: Create `eslint.config.js`

Replace `.eslintrc.json` with `eslint.config.js`:

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';

export default [
  {
    name: 'setup',
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: 'custom-rules',
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
```

### Step 5: Update Globals

Replace `/* eslint-env */` comments with flat config globals:

```javascript
{
  languageOptions: {
    globals: {
      require: 'readonly',
      module: 'readonly',
      console: 'readonly'
    }
  }
}
```

### Step 6: Update CI/CD

Ensure CI uses Node.js 20.19+:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.19'
```

### Step 7: Update Custom Rules

If you have custom ESLint rules, update them to use the new API:

```javascript
// Old API (removed)
module.exports = {
  create(context) {
    const source = context.getSourceCode();
    // ...
  }
};

// New API
module.exports = {
  create(context) {
    const sourceCode = context.sourceCode;
    // Use sourceCode.text, sourceCode.ast, etc.
  }
};
```

---

## Impact Assessment

| Area | Impact | Effort |
|------|--------|--------|
| Configuration | **Critical** - Must rewrite all configs | High |
| Node.js version | **High** - May need infrastructure updates | Medium |
| Custom rules | **Medium** - API changes | Medium |
| CI/CD | **Medium** - Node version update | Low |
| Plugins | **Low** - Most compatible | Low |

---

## Estimated Effort

- **Small project (few configs):** 2-4 hours
- **Medium project (multiple configs):** 4-8 hours
- **Large project (monorepo):** 1-2 days

---

## Verification

After migration, verify with:

```bash
npx eslint --version
# Should show eslint@10.x.x

npx eslint .
# Should run without errors
```

---

## References

- [ESLint v10.0.0 Release Notes](https://github.com/eslint/eslint/releases/tag/v10.0.0)
- [Migration Guide](https://eslint.org/docs/latest/migrate-to-v10.0)
- [Flat Config Documentation](https://eslint.org/docs/latest/migrate-to-flat-config)
- [typescript-eslint v10 Migration](https://typescript-eslint.io/troubleshooting/ts-eslint/migration)
