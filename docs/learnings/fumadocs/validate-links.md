# Fumadocs - Validate Links

Validates that links in documentation are correct.

## Setup

Requires `next-validate-link` package.

Create a lint script using:
- `scanURLs()`
- `validateFiles()`
- `printErrors()`

## Configuration

1. Configure the preset for your framework (e.g., `'next'`)
2. Populate with docs pages and their headings
3. Set `checkRelativePaths: 'as-url'` to validate relative paths
4. Register custom components with href attributes in the markdown config

## Running

```bash
# Configure Fumadocs MDX Loader for Bun first
bun ./scripts/lint.ts
```

**Note:** For Node.js, you may need TypeScript transpiling or use Bun/`tsx` instead.

---

Sources: [Fumadocs Validate Links](https://www.fumadocs.dev/docs/integrations/validate-links)
