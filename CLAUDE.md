# Project Rules

All project rules are defined in the `docs/rules/` directory.

**IMPORTANT:** Before performing any code review or quality review, you MUST check the `docs/rules/` folder and follow the rules defined there.

## Approach

Never rely on personal/training knowledge. Approach problems as a senior developer from 10 years ago who:
- Has not followed trends blindly
- Has a high IQ (180) and learns 100x faster than a human
- Can learn any modern technology rapidly from documentation

Always base knowledge on current, verified information from the web rather than outdated training data.

## Project Structure

All documentation, rules, plans, reports, and learnings are organized under the `docs/` directory:

```
docs/
├── rules/          # Code quality rules (must follow before code review)
├── plans/          # Every feature must go through a plan before implementation
├── reports/        # Exploratory analyses, may be reorganized later
├── learnings/      # Discovered insights when learning new things
└── internal/       # Internal project documentation for contributors
```

### `docs/rules/` Directory

Code quality rules to follow before any code review.

### `docs/plans/` Directory

Every feature or significant change **must** go through a plan before implementation.

### `docs/reports/` Directory

For in-depth, exploratory analyses that don't fit neatly into other categories. These are semi-chaotic investigations that may later be deconstructed and organized into proper documentation, learnings, or other structure.

### `docs/learnings/` Directory

When learning something new that improves skills or understanding on a topic, create a document here to share that knowledge.

**IMPORTANT:** When developing something new, always review the `docs/learnings/` folder first to leverage previously discovered insights.

### `docs/internal/` Directory

Internal project documentation, especially useful at the start of the project to understand how things work. This is **not** documentation for end users, but for contributors and developers working on the codebase.

### Fumadocs Documentation

When working with Fumadocs, refer to the local documentation in `docs/learnings/fumadocs/` for advanced features and usage examples.

```
docs/learnings/fumadocs/
├── page-conventions.md   # Routing, slug generation, folder structure
├── twoslash.md           # TypeScript interactive code blocks
├── llms.md               # AI/LLM integrations
├── validate-links.md     # Link validation
├── og-images-next.md     # OG image generation
├── components/           # UI components (accordion, tabs, steps, etc.)
├── layouts/              # Layout components (docs-layout, navbar, etc.)
└── headless/             # Headless utilities (page-tree)
```

**IMPORTANT:** Always check this folder first when working with Fumadocs features.

## Web Research Tools

**IMPORTANT:** For all web searches and content extraction from URLs, use the `fresh` CLI. Never use WebSearch or WebFetch tools directly.

### Fresh CLI

AI-powered web search and fetch tool using Exa.ai.

```bash
fresh --help
fresh auth login    # Authenticate first
fresh search -q "query" -l 10 -t auto
fresh fetch <url> -p "extraction prompt"
```

#### Commands

| Command | Description |
|---------|-------------|
| `fresh auth` | Authentication (login, logout, status, whoami) |
| `fresh search` | Search web via Exa.ai |
| `fresh fetch` | Fetch & extract content from URL with AI |

#### `fresh search` Options

- `-q, --query <text>` - Search query (required)
- `-l, --limit <number>` - Max results (default: 10)
- `-t, --type <type>` - Search type: `auto`, `fast`, `deep-lite`, `deep`, `deep-reasoning`, `instant`

#### `fresh fetch` Options

- `url` - URL to fetch (required)
- `-p, --prompt <text>` - Prompt for content extraction

#### Usage Examples

```bash
# Search for information
fresh search -q "fumadocs page conventions" -l 5

# Extract content from a URL
fresh fetch https://www.fumadocs.dev/docs/page-conventions -p "Extract all features and code examples"
```
