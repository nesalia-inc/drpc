# Package Version Management Rule

## Rule

**Always use the latest version of packages.** When unsure about a package's version, determine your current known version and research the changelog to find the latest.

## Why

- Latest versions contain bug fixes, security patches, and performance improvements
- Staying current reduces technical debt
- New APIs can simplify code
- Outdated packages become harder to upgrade over time

## How to Research Package Versions

### 1. Check Current Version First

```bash
# Check installed version
pnpm list <package-name>

# Or in package.json
grep "<package-name>" package.json
```

### 2. Research Latest Version

```bash
# Check latest version on npm
pnpm view <package-name> version

# Or use websearch to check changelogs
websearch search "<package-name> changelog latest version"
```

### 3. Review Changelog for Breaking Changes

When upgrading or confirming versions, always check the changelog:

```bash
websearch fetch https://github.com/<owner>/<repo>/blob/main/CHANGELOG.md
# or
websearch fetch https://<package-name>.github.io/changelog
```

### 4. Use Specific Ranges Appropriately

```json
{
  "dependencies": {
    "zod": "^3.25.0"
  }
}
```

- Use `^` for patches and minor updates (recommended)
- Use `~` for patches only (more conservative)
- Use exact version for critical dependencies

## Enforcement

- Before adding a package dependency, verify it's the latest version
- When encountering a package version in code, research if it's outdated
- Check changelogs for significant version jumps

## Quick Reference

| Task | Command |
|------|---------|
| Check latest version | `pnpm view <package> version` |
| Check all versions | `pnpm view <package> versions` |
| Check dependencies | `pnpm list <package>` |
| Search changelog | `websearch search "<package> changelog 2024"` |
