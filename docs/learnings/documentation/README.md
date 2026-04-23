# Documentation Learnings

This folder contains research and analysis on technical documentation best practices, gathered from industry sources and competitor analysis.

## Files

| File | Description |
|------|-------------|
| `01-documentation-best-practices.md` | Core best practices from web research (Diataxis, docs-as-code, etc.) |
| `02-documentation-patterns-over-features.md` | Patterns over features philosophy with code example templates |
| `03-better-auth-analysis.md` | Analysis of better-auth.com documentation strengths |
| `04-fumadocs-analysis.md` | Analysis of fumadocs.dev documentation strengths |
| `05-documentation-patterns-comparison.md` | Synthesized patterns from both sources with implementation checklist |

## Key Takeaways

### From Better Auth
- File name headers for every code block
- Complete imports, never partial
- Multi-framework examples (React, Vue, Svelte, Solid, etc.)
- Callback patterns with full lifecycle (onRequest/onSuccess/onError)
- Plugin ecosystem page with categorized tables
- AI integration (Ask AI, LLMs.txt, MCP server)

### From Fumadocs
- Step-based instructions with `[step]` remark
- FAQ accordion at end of pages
- Terminology section upfront
- Multiple component variants documented
- "On this page" right sidebar navigation
- Prerequisites clearly stated
- Code tabs for multiple languages/frameworks

## Common Patterns

1. **Complete examples** - Every code block is runnable
2. **Named files** - `// filename.ts` header on all examples
3. **Imports required** - No partial imports
4. **Anti-patterns** - Explicitly show what NOT to do
5. **FAQ section** - Common questions addressed
6. **Multi-framework** - Show variants for different stacks

## How to Use These Learnings

When creating or updating documentation:

1. Start with `01-documentation-best-practices.md` for foundations
2. Read `02-documentation-patterns-over-features.md` for the philosophy
3. Reference `03-better-auth-analysis.md` and `04-fumadocs-analysis.md` for examples
4. Use `05-documentation-patterns-comparison.md` as a checklist

## Integration with Project Rules

These learnings inform:
- `docs/rules/documentation/documentation.md` - Updated with "Best Patterns Over Features" section
- Quick Start page structure
- Code example template

## Sources

- [Techlasi: Software Documentation Best Practices 2026](https://techlasi.com/savvy/software-documentation-best-practices/)
- [Mintlify: How to write technical documentation](https://www.mintlify.com/resources/how-to-write-technical-documentation)
- [Fern: API documentation best practices](https://buildwithfern.com/post/api-documentation-best-practices-guide)
- [Better Auth Documentation](https://better-auth.com/docs)
- [Fumadocs Documentation](https://www.fumadocs.dev/docs)
- [Diataxis Framework](https://diataxis.fr/)