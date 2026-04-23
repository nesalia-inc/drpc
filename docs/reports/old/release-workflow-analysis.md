# Monorepo Release Workflow Analysis

**Date:** 2026-04-16
**Author:** Claude Code
**Status:** Research Complete - Awaiting Decision

---

## Context

The `@deessejs/server` monorepo currently lacks an automated release workflow. This analysis evaluates approaches for implementing one.

**Current Packages:**
- `@deessejs/server` - Main RPC framework
- `@deessejs/client` - Client library
- `@deessejs/client-react` - React integration
- `@deessejs/server-hono` - Hono adapter
- `@deessejs/server-next` - Next.js adapter
- Examples (not published)

---

## Option 1: Changesets

### Overview
Changesets is a tool for managing versioning and changelogs with a focus on multi-package repositories. It's the recommended approach for most monorepos.

### How It Works
1. **Create changeset** - Developer runs `pnpm changeset` to create a markdown file declaring intent
2. **Version PR** - GitHub Action detects changesets on main and creates a PR with version bumps
3. **Publish** - On PR merge, packages are published to npm

### Configuration
```yaml
# .github/workflows/changesets.yml
name: Changesets
on:
  push:
    branches:
      - main
jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - uses: changesets/action@v1
        with:
          commit: "chore: update versions"
          title: "chore: update versions"
          publish: pnpm ci:publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pros
- Designed specifically for monorepos
- Handles internal package dependencies automatically
- Updates changelogs for each affected package
- Coordinates versions across interdependent packages
- Proven at scale (used by Vite, Nuxt, Tailwind, etc.)

### Cons
- Always releases ALL packages with changesets (coordinated releases only)
- Additional friction: requires creating changeset files for every change
- Learning curve for contributors

---

## Option 2: Release-Please

### Overview
Manifest-based release tool that auto-generates version bumps from conventional commits.

### How It Works
1. Analyzes commit history since last release
2. Generates a PR with version bumps based on commit types
3. On PR merge, publishes to npm

### Pros
- Commit-based (no additional files needed)
- Well-integrated with Google-style development
- Supports monorepos via manifest config

### Cons
- Less flexible than changesets
- Commit message convention required
- May over-bump for large changes

---

## Option 3: Custom Dispatch Workflow

### Overview
A manual GitHub Actions workflow triggered via `workflow_dispatch` for per-package releases.

### Configuration
```yaml
name: Release Package
on:
  workflow_dispatch:
    inputs:
      package:
        type: choice
        options:
          - @deessejs/server
          - @deessejs/client
          - @deessejs/client-react
          - @deessejs/server-hono
          - @deessejs/server-next
      version:
        type: string
        required: true

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm --filter ${{ inputs.package }} version ${{ inputs.version }}
      - run: pnpm --filter ${{ inputs.package }} publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pros
- Full control over when and what to release
- No additional contributor friction
- Can handle emergency patches

### Cons
- Manual version bumping required
- No changelog generation
- No coordination between packages

---

## Analysis: Which Approach Fits Best?

### Recommendation: Hybrid Approach

| Release Type | Tool | Reason |
|-------------|------|--------|
| Coordinated release (all packages) | Changesets | Handles dependencies, automatic versioning |
| Single package emergency release | Manual dispatch | Full control, no coordination needed |
| Patch release (one package) | Changesets | Works if only that package has changeset |

### Key Insight

**Changesets is not designed for independent single-package releases.** If you need to release only `@deessejs/server` without releasing `@deessejs/client`, you must:
1. Not create a changeset for the other packages
2. Or use a custom workflow as fallback

---

## Decision Required

1. **Primary approach:** Changesets vs Release-Please vs Custom?
2. **Release trigger:** Only on PR merge, or also manual?
3. **Version strategy:** Fixed (all packages same version) or Independent?

### Suggested Default
- **Primary:** Changesets for coordinated releases
- **Fallback:** Manual dispatch workflow for single-package releases
- **Strategy:** Start with Fixed mode, switch to Independent if needed

---

## Next Steps (Not Implemented)

1. Install `@changesets/cli` and initialize
2. Create `.changeset/config.json`
3. Add GitHub Actions workflow
4. Configure npm tokens in repo secrets
5. Test with dry-run before production

---

## Sources

- [Changesets GitHub](https://github.com/changesets/changesets)
- [Changesets Action](https://github.com/changesets/action)
- [pnpm Using Changesets](https://pnpm.io/using-changesets)
- [Release-Please](https://github.com/googleapis/release-please)
