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
