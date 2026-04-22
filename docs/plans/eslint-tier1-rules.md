# ESLint Tier 1 Rules Implementation Plan

## Context

We have 15+ rules in `docs/rules/` covering code quality. Not all are ESLint-feasible — some are too architectural, process-oriented, or abstract. This plan identifies what can be automated and what remains as manual review.

## Scope

This plan covers **Tier 1 rules that can be fully automated via existing ESLint plugins**.

## What the Audit Revealed

### Existing ESLint Configuration

The project already has a **comprehensive ESLint config** at `packages/server/eslint.config.js` using **ESLint flat config (ESM)**:

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import security from "eslint-plugin-security";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  // ... rules
);
```

### Already Configured (from `packages/server/eslint.config.js`)

| Rule | Status | Evidence |
|------|--------|----------|
| `@typescript-eslint/no-explicit-any` | ✅ Already `error` | Line 51: `"error"` |
| `import/consistent-type-specifier-style` | ✅ Already `warn` | Line 73: `prefer-inline` |
| `import/no-unused-modules` | ✅ Already `warn` | Line 68 |
| `import/no-extraneous-dependencies` | ✅ Already `error` | Line 69 |
| `import/no-cycle` | ✅ Already `error` | Line 70 |
| `import/no-mutable-exports` | ✅ Already `error` | Line 71 |
| `import/extensions` | ✅ Already `warn` | Line 72 |

### Actually Missing / Blocked

| Item | Blocker | Resolution Path |
|------|---------|-----------------|
| `import/order` | **eslint-plugin-import 2.32.0 incompatible with ESLint 10.x** | Upgrade plugin OR use `import` from `@import` |
| `comments.md` rule | **Cannot be ESLint-automated** | Remains manual code review |
| `no-inline-imports.md` rule | **Cannot be ESLint-automated** | Already documented as "code review only" |

## The Real Blocker: eslint-plugin-import Version

Line 74-75 of existing config:
```javascript
// TODO: Enable when eslint-plugin-import is updated past 2.32.0 for ESLint 10.x compatibility
// "import/order": ["warn", { "alphabetize": { "order": "asc" }, "newlines-between": "never" }],
```

This is the **only real technical obstacle** for `import/order`.

## Correct Import Group Order

From `docs/rules/import-organization.md`, the correct order is:

```
1. External packages (node_modules)
2. Internal packages (workspace packages)
3. Types (import type { ... })
4. Functions (import { ... })
5. Relative imports (local files)
```

When enabling `import/order`, configure it with this exact order:

```javascript
"import/order": ["warn", {
  "groups": [
    "builtin",      // Node builtins (fs, path)
    "external",     // npm packages
    "internal",     // @deessejs/* packages
    "type",         // Type imports only
    "object",       // Other imports
    "parent",       // ../ imports
    "sibling",      // ./ imports
    "index"         // index.js imports
  ],
  "alphabetize": {
    "order": "asc",
    "caseInsensitive": true
  },
  "newlines-between": "never"
}]
```

**Note:** `import/order` does not natively support "types first, then functions" split within the same group. This may require a custom rule or manual enforcement for strict compliance.

## What Cannot Be ESLint-Automated

### 1. `docs/rules/comments.md` — Tier 3 (Manual Review Only)

The `comments.md` rule requires:
- No useless inline comments (`// Loop through items`)
- No noise comments (`// This function does X`)
- Comments must explain WHY, trade-offs, alternatives considered

**ESLint cannot enforce "useful comments"** — this requires human judgment during code review.

Status: **Manual review only. Not ESLint-feasible.**

### 2. `docs/rules/no-inline-imports.md` — Tier 3 (Manual Review Only)

Already documented in the rule itself:
> "This rule is checked during code reviews."

Status: **Manual review only. Not ESLint-feasible.**

## Implementation Steps

### Phase 1: Audit Existing Configuration (DONE)

```bash
# Check existing config
cat packages/server/eslint.config.js

# Verify what's already enabled
grep -E "@typescript-eslint/no-explicit-any|import/order|import/consistent" packages/server/eslint.config.js
```

**Result:** `@typescript-eslint/no-explicit-any` is already `error`. `import/order` is blocked by plugin version.

### Phase 2: Resolve eslint-plugin-import Compatibility

**Option A: Upgrade eslint-plugin-import**
```bash
# Check current version
cat packages/server/package.json | grep eslint-plugin-import

# Upgrade to latest
pnpm up -r eslint-plugin-import
```

**Option B: Wait for fix (if upgrade breaks other things)**

### Phase 3: Enable import/order (After Plugin Upgrade)

Once plugin is updated past 2.32.0, uncomment and configure:

```javascript
"import/order": ["warn", {
  "groups": [
    "builtin",
    "external",
    "internal",
    "type",
    "object",
    "parent",
    "sibling",
    "index"
  ],
  "alphabetize": { "order": "asc", "caseInsensitive": true },
  "newlines-between": "never"
}]
```

### Phase 4: Baseline Count (Before Enabling Strict Rules)

Before enabling `error` severity or new rules:

```bash
# Count violations as baseline
npx eslint packages/server/src --format json > baseline-audit.json

# Analyze with jq
cat baseline-audit.json | jq '[.[].messages[]] | group_by(.ruleId) | map({rule: .[0].ruleId, count: length}) | sort_by(.count) | reverse'
```

This establishes:
- How many violations exist
- Which rules trigger most violations
- Whether violations are legitimate or rule needs tuning

### Phase 5: Fix Violations (Iterative)

For each violation category:
1. **Legitimate violation** → Fix the code
2. **Rule too strict** → Lower severity or disable with justification
3. **False positive** → Report as bug, disable until fixed

### Phase 6: CI Integration

```bash
# In package.json scripts
"lint": "eslint packages/server/src --ext .ts",
"lint:fix": "eslint packages/server/src --ext .ts --fix"
```

Add to CI pipeline (`.github/workflows/`):

```yaml
- name: Lint
  run: pnpm lint
```

### Phase 7: Rollback Path

If a rule produces excessive violations:

```javascript
// Temporarily lower severity
"import/order": ["warn", { ... }]  // Was "error"

// Or disable per-file during migration
/* eslint-disable import/order */
import { something } from "../file";
/* eslint-enable import/order */
```

## Files to Modify

| File | Action |
|------|--------|
| `packages/server/eslint.config.js` | Uncomment `import/order` after plugin upgrade |
| `packages/server/package.json` | Upgrade `eslint-plugin-import` if needed |
| `package.json` (root) | Add `lint` script if missing |
| `.github/workflows/ci.yml` | Add lint step |
| `docs/rules/import-organization.md` | Add note: "ESLint automated (pending plugin upgrade)" |
| `docs/rules/comments.md` | Add note: "Manual review only" |
| `docs/rules/no-inline-imports.md` | Already noted as "code review only" |

## Summary: What Remains

| Rule | Status | Action |
|------|--------|--------|
| `no-any` | ✅ Done | Already configured as `error` |
| `import-organization` | ⚠️ Blocked | Wait for plugin upgrade, then enable |
| `comments` | ❌ Cannot automate | Manual code review only |
| `no-inline-imports` | ❌ Cannot automate | Manual code review only |

## Next Steps

1. **Upgrade eslint-plugin-import** and test `import/order` works
2. **If upgrade fails**, investigate alternative (custom rule, different plugin)
3. **Run baseline audit** before enabling any new rules at `error` severity
4. **Document remaining rules** as "Tier 2/3: Manual review only"

## Appendix: Import Order Mapping

`import/order` groups vs our `import-organization.md`:

| import-organization.md | import/order group |
|------------------------|-------------------|
| External packages | `external` |
| Internal packages | `internal` |
| Types | `type` |
| Functions | `object` (catch-all) |
| Relative imports | `parent`, `sibling`, `index` |

**Note:** The `type` group in `import/order` only catches `import type { ... }`. Type imports mixed with value imports need separate handling.