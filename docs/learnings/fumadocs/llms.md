# Fumadocs - LLMs Integration

Fumadocs provides comprehensive AI integration capabilities for documentation sites.

## Core Setup

Enable `includeProcessedMarkdown` in the source config and create a `getLLMText` function to convert pages into static text format for LLMs.

## Key Features

### 1. `llms.txt`

A lightweight index file providing LLMs an overview of available documentation. Generated using the Loader API.

**Supported frameworks:** Next.js, React Router, Tanstack Start, Waku

### 2. `llms-full.txt`

Complete version combining all documentation content - allows AI agents to access the full knowledge base in a single file.

### 3. `*.mdx` Extension

Fetch page content as Markdown/MDX by appending `.mdx` to URLs. Uses rewrite rules to direct requests. Also supports content negotiation via the `Accept` header.

### 4. Page Actions

Interactive components:
- `LLMCopyButton` - copies markdown content
- `ViewOptions` - links to GitHub sources

Automatically installed via CLI.

### 5. Ask AI

Integrated chat dialog powered by:
- **OpenRouter** (uses Vercel AI SDK)
- **Inkeep AI**

Requires API keys in environment variables.

## Implementation Notes

Fumadocs does not provide AI models themselves - users must supply their own API keys and configure model selection in the `/api/chat` route.

---

Sources: [Fumadocs LLMs Integration](https://www.fumadocs.dev/docs/integrations/llms)
