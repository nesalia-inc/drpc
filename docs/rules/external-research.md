# External Research Rule

## Rule

**When facing problems, always research externally before relying solely on internal knowledge.** Use web searches and package documentation to find solutions.

## Why

- External knowledge provides verified, up-to-date solutions
- Package documentation often has nuances not remembered internally
- Web searches reveal real-world usage patterns and edge cases
- Prevents reinventing solutions already documented

## Research Tools

### Websearch CLI (Primary)

Use the **websearch CLI tool** (not the native WebSearch tool):

```bash
# Fetch URL as Markdown
websearch fetch https://example.com

# Search the web
websearch search "query"

# Check if CLI is working
websearch ping
```

**Important:** The websearch CLI and the native WebSearch tool are **separate**. The native tool does not work in this environment. Always use the CLI.

### Installation (If Needed)

```bash
uv add websearch
```

## When to Research Externally

1. **Unknown error messages** - Search the error text
2. **Package behavior unclear** - Read package docs
3. **Best practices uncertain** - Search for patterns
4. **Edge cases** - Research community discussions
5. **API usage unsure** - Check official documentation

## How to Research

### 1. Search Package Documentation

```bash
websearch search "zod custom error messages site:zod.dev"
websearch search "typescript generic defaults documentation"
```

### 2. Search Error Messages

```bash
websearch search "TypeScript 'X' is not assignable to 'Y' cause"
websearch search "ESLint rule no-explicit-any recommended fix"
```

### 3. Fetch Specific Documentation

```bash
websearch fetch https://typescript.io/docs/...
websearch fetch https://zod.dev/docs/...
```

### 4. Search Community Solutions

```bash
websearch search "Stack Overflow pattern for API type safety"
websearch search "GitHub issue TypeScript strict mode best practices"
```

## API Key Requirement

**Brave Search API key is required for web search.**

If the CLI reports missing API key:
1. Ask the user to provide a Brave API key
2. Help them get one at https://brave.com/search/api/
3. Set it with: `export BRAVE_API_KEY=your_key_here`

## Enforcement

- When stuck on a problem, first search externally
- Document external sources in code comments when relevant
- Don't guess at solutions that could be verified with research

## Quick Reference

| Task | Command |
|------|---------|
| Fetch docs | `websearch fetch <url>` |
| Web search | `websearch search "<query>"` |
| Test connection | `websearch ping` |
| Verbose output | `websearch fetch <url> --verbose` |
