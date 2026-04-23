# Skills Learning

## What are Skills?

Skills extend Claude's capabilities by creating `SKILL.md` files with instructions. Claude uses skills when relevant, or you invoke them directly with `/skill-name`.

**Key Difference from CLAUDE.md:** Skill content loads only when used, so long reference material costs nothing until needed.

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── template.md        # Template for Claude to fill in
├── examples/          # Example outputs
└── scripts/           # Helper scripts
```

## Basic SKILL.md Format

```yaml
---
name: skill-name
description: What this skill does and when to use it
---

Your skill instructions here...
```

## Frontmatter Fields

| Field | Description |
|-------|-------------|
| `name` | Display name (becomes /command) |
| `description` | When Claude should use it |
| `disable-model-invocation` | `true` = only you can invoke |
| `user-invocable` | `false` = hide from `/` menu |
| `allowed-tools` | Tools without permission prompts |
| `context` | `fork` = run in subagent |
| `agent` | Which subagent type (Explore, Plan, etc.) |
| `paths` | Glob patterns for auto-activation |

## Invocation Control

| Setting | You can invoke | Claude can invoke |
|---------|----------------|------------------|
| (default) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

## Dynamic Context Injection

Use `` !`<command>` `` to run shell commands and inject output:

```yaml
## Environment
- Version: !`node --version`
- Status: !`git status --short`
```

## Arguments

Use `$ARGUMENTS` or `$0`, `$1`, etc.:

```yaml
---
name: migrate-component
---

Migrate $ARGUMENTS[0] from $ARGUMENTS[1] to $ARGUMENTS[2]
```

Run: `/migrate-component SearchBar React Vue`

## Skill + Subagent

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly...
```

## Where Skills Live

| Location | Path | Scope |
|----------|------|-------|
| Enterprise | Managed settings | All users |
| Personal | `~/.claude/skills/` | All projects |
| Project | `.claude/skills/` | This project |
| Plugin | `<plugin>/skills/` | Plugin scope |

**Priority:** enterprise > personal > project > plugin

## Bundled Skills

Claude Code includes bundled skills: `/simplify`, `/batch`, `/debug`, `/loop`, `/claude-api`

## String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All passed arguments |
| `$ARGUMENTS[N]` | Specific argument by index |
| `$N` | Shorthand for `$ARGUMENTS[N]` |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Skill's directory path |

## Tips

1. Keep `SKILL.md` under 500 lines
2. Front-load key use case in description
3. Use `disable-model-invocation: true` for side-effect workflows
4. Skills persist in context until session end
5. Add "ultrathink" anywhere to enable extended thinking
