# Subagents Learning

## What are Subagents?

Subagents are specialized AI assistants in Claude Code that handle specific types of tasks. They run in their own context window with a custom system prompt, specific tool access, and independent permissions.

**Key Benefits:**
- **Preserve context** - Keep exploration results out of main conversation
- **Enforce constraints** - Limit which tools a subagent can use
- **Reuse configurations** - Share across projects with user-level subagents
- **Control costs** - Route tasks to faster/cheaper models like Haiku

## Built-in Subagents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| **Explore** | Haiku | Read-only | File discovery, code search, exploration |
| **Plan** | Inherit | Read-only | Research during plan mode |
| **General-purpose** | Inherit | All | Complex multi-step operations |

## How to Invoke

### Natural Language
```
Use the code-reviewer subagent to find performance issues
```

### @-mention (guaranteed delegation)
```
@"code-reviewer (agent)" look at the auth changes
```

### Background (concurrent)
```
Run this in the background
```

### Session-wide (as main agent)
```bash
claude --agent code-reviewer
```

## Subagent Configuration

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate |
| `tools` | No | Tools subagent can use |
| `disallowedTools` | No | Tools to deny |
| `model` | No | `sonnet`, `opus`, `haiku`, or `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `bypassPermissions`, etc. |
| `maxTurns` | No | Max agentic turns before stop |
| `skills` | No | Skills to preload into subagent |
| `memory` | No | `user`, `project`, or `local` for persistent memory |
| `background` | No | `true` for always-background execution |
| `isolation` | No | `worktree` for isolated git worktree |

### Example Subagent Definition

```markdown
---
name: code-reviewer
description: Expert code reviewer. Use proactively after code changes.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a senior code reviewer. Focus on code quality, security, and best practices.
```

## Tool Restrictions

### Allowlist (recommended for focused agents)
```yaml
tools: Read, Grep, Glob, Bash
```

### Denylist (inherit all except some)
```yaml
disallowedTools: Write, Edit
```

## Memory Scope

| Scope | Location | Use when |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Cross-project learnings |
| `project` | `.claude/agent-memory/<name>/` | Project-specific, version controlled |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not versioned |

## Scopes & Priority

| Location | Scope | Priority |
|----------|-------|---------|
| Managed settings | Organization | 1 (highest) |
| `--agents` CLI flag | Session | 2 |
| `.claude/agents/` | Project | 3 |
| `~/.claude/agents/` | User | 4 |
| Plugin agents/ | Plugin | 5 (lowest) |

## Key Patterns

### Chain Subagents (multi-step)
```
Use the code-reviewer to find issues, then use the optimizer to fix them
```

### Parallel Research
```
Research auth, database, and API modules in parallel using separate subagents
```

### Background for Long Tasks
```
Run this analysis in background while we continue other work
```

## Important Notes

1. **Subagents cannot spawn other subagents** - Chain from main conversation instead
2. **Read-only Explore is ideal for research** - Keeps verbose output out of main context
3. **Background subagents need permission pre-approval** - Claude prompts before launching
4. **Resume subagents with SendMessage** - Agent ID available in transcript

## When to Use Subagents

**Use subagents when:**
- Task produces verbose output
- You need tool restrictions
- Work is self-contained with summary return

**Use main conversation when:**
- Need frequent back-and-forth
- Multiple phases share context
- Quick targeted change
