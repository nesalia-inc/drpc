---
name: package-audit
description: Full package audit workflow. Run version scanner, analyze changelogs, and update packages safely.
disable-model-invocation: true
---

# Package Audit Workflow

This skill orchestrates a complete package audit across three phases.

## Tool

**npm-check-updates (ncu)** is the industry standard for version scanning and updating.
Install globally if needed: `npm install -g npm-check-updates`

## Workflow Overview

```
Phase 1: Scan versions (ncu --deep)
    ↓
Phase 2: Learn changelogs (package-changelog-learner) [if major gaps]
    ↓
Phase 3: Update packages (ncu --upgrade) [only on user "go"]
```

## Phase 1: Version Scan

Run `ncu --deep` to scan all package.json files recursively and identify version gaps.

### Execution
```bash
ncu --deep --format group
```

### Expected Output
```
## Package Version Scan

Summary:
- Outdated: X
- Major gaps: Y

[Table of outdated packages]
```

### Save Report
Save to: `docs/reports/package-versions/YYYY-MM-DD-HHMMSS-scan.md`

## Phase 2: Changelog Research

For packages with major version gaps (>1 major version):

Invoke the package-changelog-learner agent to:
- Research changelogs via websearch
- Identify breaking changes
- Create learnings in docs/learnings/

### Execution
```
Use the package-changelog-learner agent to research changelogs for:
- zod (3.x to 4.x)
- [other major gaps from scan]
```

### Expected Output
```
## Changelog Learnings Created

| Package | Learning File |
|--------|---------------|
| zod | docs/learnings/zod-v3-to-v4.md |
```

## Phase 3: Update (User Confirmation Required)

### WARNING: This phase requires explicit user approval

Present findings to user:
- Summary of outdated packages
- Major version risks
- Learnings created
- Effort estimation

**Ask user:** "Ready to update? Type 'go' to proceed or 'skip' to skip."

### If User Says "go"

Use `ncu` to apply updates:

```bash
# Update all packages (minor/patch by default)
ncu --deep --upgrade

# Include major upgrades (if user confirmed major)
ncu --deep --upgrade --target major
```

### If User Says "skip"

End workflow - user will update manually when ready.

## Summary Report

At the end, present:

```
## Package Audit Complete

### Scanned: X packages
### Updated: Y packages
### Learnings Created: Z
### Failed: W

### Learnings Available
- docs/learnings/zod-v3-to-v4.md
- ...

### Next Steps
1. Review learnings for major migrations
2. Run tests: pnpm test
3. Type check: pnpm typecheck
```

## Arguments

Use `$ARGUMENTS` to specify scope:

```
/package-audit packages/server
/package-audit all
/package-audit
```

Default: scan all package.json files in project.

## Important Notes

1. **Always scan first** - don't skip to updating
2. **Use ncu --deep** for monorepo scanning - it's the industry standard
3. **Learnings are valuable** - even if user skips updating now
4. **User controls updates** - never auto-update without explicit "go"
5. **Major versions need extra caution** - ensure learnings are reviewed before upgrading