# Agent-Powered Linter: Architectural Analysis

## Executive Summary

This document analyzes how to build an agent-powered linting system — a "linter with an AI agent behind it" — using either the **Claude Agent SDK** or **Vercel AI SDK** as the underlying agent framework. The goal is to create a CLI tool (`analyze`) that reads rules from `docs/rules/` and outputs a JSON report of all violations found in the codebase.

---

## 1. Problem Statement

ESLint can only enforce **syntactic** and **some semantic** rules. Our `docs/rules/` contains rules that are **architectural, process-oriented, or semantic** — impossible to express as ESLint rules:

| Rule | Why ESLint Can't | Feasible With |
|------|------------------|---------------|
| `no-generic-suffixes` | Naming conventions need context | Agent required |
| `separate-types-from-functions` | File-level organization | Agent required |
| `no-exported-classes` | Semantic — "is this exported?" | Agent required |
| `comments` (meaningful only) | "Is this comment useful?" | Agent required |
| `deterministic-functional` | Behavioral requirement | Agent required |
| `type-enrichment` | Semantic — "can this type be enriched?" | Agent required |
| `external-research` | Process rule, not code rule | Outside scope |

### The Gap

**ESLint** → static analysis → fast, deterministic → can't understand intent
**Human review** → full understanding → slow, expensive → can't scale

**Agent-powered linting** → AI understanding → scalable, context-aware → meaningful violations

---

## 2. Available SDKs

### 2.1 Claude Agent SDK

**What it is:** A library that gives you Claude Code's agent loop as a programmable API. Available in Python and TypeScript.

**Key characteristics:**
- Tool-first: Claude handles tool execution autonomously in a loop
- Built-in tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
- Subagents: Spawn specialized agents with restricted tools
- Sessions: Maintain context across multiple exchanges
- Hooks: Intercept at tool call boundaries
- MCP support: Connect to Model Context Protocol servers

**Example (TypeScript):**
```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Analyze this codebase for code quality issues",
  options: {
    allowedTools: ["Read", "Glob", "Grep"],
    agents: {
      "rules-checker": {
        description: "Rule enforcement specialist",
        prompt: "You are a code quality auditor...",
        tools: ["Read", "Grep", "Glob"]
      }
    }
  }
})) {
  if ("result" in message) console.log(message.result);
}
```

**Strengths:**
- Native subagent orchestration built-in
- Session management for context preservation
- Hooks system for logging/auditing
- Filesystem-based agent definitions (`.claude/agents/`)
- Can use Claude Code skills

**Weaknesses:**
- Requires Anthropic API key (cost per token)
- Not open source
- Vendor lock-in to Anthropic

---

### 2.2 Vercel AI SDK

**What it is:** A unified TypeScript SDK for building AI apps with streaming, fallbacks, and multi-model support. Part of Vercel's AI ecosystem.

**Key characteristics:**
- `ToolLoopAgent`: Class that manages tool calls in a loop
- Multi-provider: OpenAI, Anthropic, Google, etc.
- Streaming: Built-in streaming support
- Framework integrations: React, Next.js, Vue, Svelte, Node.js

**Example:**
```typescript
import { ToolLoopAgent } from "ai";

const agent = new ToolLoopAgent({
  model: "claude-3-5-sonnet",
  tools: [weather, convertFahrenheitToCelsius],
});
```

**Strengths:**
- Multi-provider (OpenAI, Anthropic, Google, etc.)
- Open source (Apache 2.0)
- Framework integrations
- Streaming support

**Weaknesses:**
- Agents are less emphasized — core functions (`generateText`, `streamText`) are primary
- Subagent support exists but less documented
- Agent orchestration is more manual

---

## 3. Architectural Patterns

### 3.1 Single-Agent Analysis

```
┌─────────────────────────────────────┐
│         analyze CLI                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Master Agent               │  │
│  │   (reads rules + analyzes)   │  │
│  │                               │  │
│  │   Tools: Read, Glob, Grep    │  │
│  └───────────────────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │   JSON Report                 │  │
│  │   { violations: [...] }      │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Flow:**
1. CLI loads rules from `docs/rules/*.md`
2. Prompts agent with rules + codebase
3. Agent scans files using tools
4. Agent outputs structured JSON

**Pros:** Simple, single agent, fast
**Cons:** Agent has to hold all rules in context, no parallelization

---

### 3.2 Multi-Agent (Parallel Scan)

```
┌─────────────────────────────────────┐
│         analyze CLI                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Orchestrator Agent          │  │
│  │   (delegates + aggregates)    │  │
│  └───────────────────────────────┘  │
│         │         │         │       │
│    ┌────┴───┐ ┌───┴───┐ ┌───┴────┐  │
│    │Agent 1 │ │Agent 2│ │Agent N │  │
│    │Rule 1  │ │Rule 2 │ │Rule N  │  │
│    └────────┘ └───────┘ └────────┘  │
│         │         │         │       │
│         └─────────┴─────────┘       │
│              │                       │
│              ▼                       │
│  ┌───────────────────────────────┐  │
│  │   JSON Report (merged)        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Flow:**
1. Orchestrator spawns one subagent per rule (or per rule group)
2. Subagents scan in parallel
3. Orchestrator merges results
4. Output combined JSON report

**Pros:** Parallel execution, isolated context per rule
**Cons:** More complex orchestration, session management needed

---

### 3.3 Multi-Agent (Relay/Chain)

```
┌─────────────────────────────────────┐
│         analyze CLI                  │
│                                     │
│  ┌─────────┐   ┌─────────┐   ┌─────┐│
│  │Parano   │──►│ Severe  │──►│Exp. ││
│  │(finds)  │   │(filters)│   │(adv)││
│  └─────────┘   └─────────┘   └─────┘│
│       │             │            │   │
│       └─────────────┴────────────┘   │
│                   │                  │
│                   ▼                  │
│          ┌────────────────┐         │
│          │  JSON Report   │         │
│          └────────────────┘         │
└─────────────────────────────────────┘
```

**Flow:**
1. Parano finds all potential issues
2. Severe filters to real problems
3. Expert suggests fixes
4. Results merged into report

**Pros:** Natural workflow, each agent specialized
**Cons:** Sequential (slow), context accumulates

---

## 4. Claude Agent SDK vs AI SDK for This Use Case

| Criteria | Claude Agent SDK | Vercel AI SDK |
|----------|-----------------|---------------|
| **Subagent orchestration** | ✅ Native, built-in | ⚠️ Manual, less documented |
| **Streaming** | ✅ Yes | ✅ Yes |
| **Tool loop** | ✅ Autonomous | ✅ Via ToolLoopAgent |
| **Multi-provider** | ❌ Anthropic only | ✅ 100+ providers |
| **Cost model** | Per-token (Anthropic) | Per-token (varies by provider) |
| **Open source** | ❌ No | ✅ Apache 2.0 |
| **Skill loading** | ✅ Yes (`.claude/skills/`) | ❌ No |
| **Filesystem agent defs** | ✅ Yes (`.claude/agents/`) | ❌ No |
| **CI/CD integration** | ✅ Designed for it | ✅ Works |
| **Session management** | ✅ Built-in | ⚠️ Manual |

### Recommendation

**For this project specifically** (TypeScript monorepo, already has `.claude/agents/` and skills):

> **Claude Agent SDK is the better fit** because:
> 1. Native subagent system matches our existing `.claude/agents/` files
> 2. Skills loading (`docs/rules/`) integrates naturally
> 3. Session management for resumable analysis
> 4. Already designed for CI/CD

**However**, if you want:
- Multi-provider flexibility → Vercel AI SDK
- Open source (no vendor lock-in) → Vercel AI SDK

---

## 5. Rule Categories and Agent Mapping

Not all rules need the same agent strategy:

### 5.1 Pattern-Based Rules (ast-grep territory)

These can be detected with AST pattern matching:

| Rule | Pattern Type | Tool |
|------|-------------|------|
| `no-inline-imports` | AST | ast-grep |
| `no-any` | AST | ESLint (already done) |
| `no-generic-suffixes` | Regex on names | ast-grep or Agent |

**Strategy:** Agent invokes `ast-grep` via Bash tool for these.

```typescript
// Agent prompt for pattern-based rule
"Run: npx ast-grep scan --lang ts --pattern '$NAME is $TYPE' .
Where NAME matches (Handler|Manager|Executor|Service)$"
```

### 5.2 Semantic Rules (Agent-only)

These require understanding context:

| Rule | What Agent Must Understand |
|------|--------------------------|
| `separate-types-from-functions` | "Is this type used by functions in the same file?" |
| `no-exported-classes` | "Is this class part of the public API?" |
| `comments` | "Is this comment stating the obvious?" |
| `type-enrichment` | "Can this type be enriched with Result/Maybe?" |
| `deterministic-functional` | "Does this code have side effects?" |

**Strategy:** Agent reads files and applies rules with LLM reasoning.

### 5.3 Process Rules (Outside scope)

| Rule | Reason |
|------|--------|
| `external-research` | Requires web search, not linting |
| `package-versions` | Already handled by `ncu` |

---

## 6. Proposed CLI Architecture

### 6.1 Command Interface

```bash
# Full analysis
analyze --rules all --output report.json

# Specific rules
analyze --rules no-generic-suffixes,separate-types-from-functions

# Single rule
analyze --rule no-exported-classes --format json

# CI mode (exit code based)
analyze --rules all --fail-on error
```

### 6.2 Output Format

```json
{
  "analyzedAt": "2026-04-22T10:30:00Z",
  "rulesChecked": ["no-generic-suffixes", "separate-types-from-functions"],
  "filesScanned": 245,
  "violations": [
    {
      "rule": "no-generic-suffixes",
      "severity": "error",
      "file": "src/services/UserManager.ts",
      "line": 3,
      "message": "Export 'UserManager' uses forbidden suffix 'Manager'",
      "suggestion": "Rename to 'UserAPI' or 'UserService' (but 'Service' is also forbidden — prefer 'UserAPI')"
    },
    {
      "rule": "separate-types-from-functions",
      "severity": "warning",
      "file": "src/query/builder.ts",
      "line": 12,
      "message": "Type 'QueryOptions' defined in same file as function 'buildQuery'",
      "suggestion": "Move type to src/query/types.ts"
    }
  ],
  "summary": {
    "total": 2,
    "errors": 1,
    "warnings": 1,
    "byRule": {
      "no-generic-suffixes": { "errors": 1, "warnings": 0 },
      "separate-types-from-functions": { "errors": 0, "warnings": 1 }
    }
  }
}
```

### 6.3 Internal Flow

```
1. Load rules from docs/rules/*.md
         │
         ▼
2. Parse rule frontmatter (name, severity, category)
         │
         ▼
3. Create subagents for semantic rules
   (parallel invocation)
         │
         ▼
4. For pattern-based rules, invoke
   ast-grep via Bash tool
         │
         ▼
5. Collect results from all agents
         │
         ▼
6. Normalize to JSON schema
         │
         ▼
7. Output report
```

---

## 7. Integration with Existing Infrastructure

### 7.1 Reuse Existing `.claude/agents/`

We already have agents:
- `duplicate-finder.md`
- `package-version-scanner.md`
- `package-changelog-learner.md`
- `package-updater.md`

**Opportunity:** Create a `rules-checker.md` agent that:
- Reads `docs/rules/*.md`
- Applies each rule
- Outputs structured violations

```markdown
---
name: rules-checker
description: Analyze code against project rules. Use when user asks to check code quality.
tools: Read, Glob, Grep, Bash
---

You are a rules enforcement agent. Your job is to:
1. Read all rules from docs/rules/*.md
2. For each rule, check if violations exist in the codebase
3. Report violations in structured JSON format
```

### 7.2 Skill Integration

We have `package-audit` skill. We could create a `code-quality` skill that orchestrates the analyze workflow.

### 7.3 CI Integration

```yaml
# .github/workflows/code-quality.yml
name: Code Quality Analysis
on: [pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-agent-action@v1
        with:
          tool: analyze
          args: --rules all --fail-on error
```

---

## 8. Key Design Decisions

### 8.1 Single-pass vs Multi-pass

**Decision: Multi-pass with parallel subagents**

Rationale:
- Each rule needs different context
- Parallel execution reduces total time
- Subagent isolation prevents context overflow

### 8.2 Agent per Rule vs Agent per Rule Category

**Decision: Agent per rule category**

Rationale:
- Too many subagents (15+ rules) = orchestration overhead
- Group related rules: naming, imports, architecture
- 4-5 subagents is manageable

### 8.3 ast-grep vs Agent for Pattern Detection

**Decision: Hybrid — ast-grep for patterns, Agent for semantics**

- Pattern-based rules (no-generic-suffixes) → ast-grep via Bash
- Semantic rules (comments, type-enrichment) → Agent reasoning

Rationale: ast-grep is faster and deterministic for regex-like patterns.

### 8.4 Streaming vs Batch Output

**Decision: Batch output (JSON) with optional streaming progress**

Rationale:
- CI needs complete JSON for gating
- Streaming progress is nice-to-have for interactive use
- Simpler to implement

---

## 9. Challenges and Risks

### 9.1 Context Overflow

**Risk:** 15 rules × full codebase scan = massive context
**Mitigation:** Subagent isolation — each agent only sees relevant files

### 9.2 Non-Deterministic Results

**Risk:** Agent may miss violations on different runs
**Mitigation:**
- Explicit prompts with specific checks
- Structured output format
- Repeatable rules (not "is this good code?" but "does X pattern exist?")

### 9.3 Cost

**Risk:** Each run = token cost per subagent
**Mitigation:**
- Cache results (baseline + diff)
- Only run on changed files (via git diff)
- Tiered approach: fast ESLint first, agent only for complex rules

### 9.4 False Positives

**Risk:** Agent reports spurious violations
**Mitigation:**
- Allow suppression comments: `// analyze-ignore: no-generic-suffixes`
- Exit code based on severity threshold
- Human-in-the-loop for final decisions

### 9.5 Cross-File Violations

**Risk:** Some rules span multiple files (e.g., duplicate patterns)
**Mitigation:**
- Agent has Glob + Grep tools
- Group related files before analysis

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Create `rules-checker` agent in `.claude/agents/`
- [ ] Define JSON output schema
- [ ] Implement single-rule analysis
- [ ] CLI wrapper (`analyze` command)

### Phase 2: Multi-Rule (Week 2)
- [ ] Parallel subagent invocation
- [ ] ast-grep integration for pattern rules
- [ ] Result aggregation
- [ ] CI integration

### Phase 3: Intelligence (Week 3)
- [ ] Session caching (skip unchanged files)
- [ ] Severity tuning
- [ ] Suppression comments
- [ ] Interactive mode (suggest fixes)

### Phase 4: Council (Week 4)
- [ ] Integrate with discovery agents (requirements-discoverer)
- [ ] Parano → Severe → Expert pipeline
- [ ] Human-readable summary + JSON detail

---

## 11. Comparison: SDK vs Pure Claude Code

| Aspect | Claude Agent SDK | Pure Claude Code (CLI) |
|--------|-----------------|----------------------|
| **Programmatic control** | ✅ Full | ❌ None (interactive) |
| **CI/CD integration** | ✅ Designed for it | ⚠️ Requires wrapper |
| **Subagent management** | ✅ Built-in | ⚠️ Manual via skills |
| **Cost** | Per-token | Per-token (same) |
| **Streaming** | ✅ Yes | ⚠️ Limited |
| **Learning curve** | Medium | Low |
| **Maintenance** | SDK updates | Claude Code updates |

**For production CI/CD:** Claude Agent SDK
**For local development:** Claude Code CLI with skills

---

## 12. Conclusion

Building an agent-powered linter is **architecturally feasible** with both SDKs, but **Claude Agent SDK is the better fit** for this project because of:

1. Native subagent orchestration matching our `.claude/agents/` structure
2. Skills loading for rule integration
3. Session management for resumable analysis
4. CI/CD-first design

The hybrid approach (ast-grep for patterns + Agent for semantics) provides the right balance of speed and intelligence.

**Next step:** Build the `rules-checker` agent and single-rule CLI to validate the approach before scaling to multi-agent orchestration.

---

## Appendix: Key Resources

- [Claude Agent SDK Overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [Claude Agent SDK Subagents](https://code.claude.com/docs/en/agent-sdk/subagents)
- [Vercel AI SDK Agents](https://ai-sdk.dev/docs/agents/overview)
- [Existing `.claude/agents/`](file:///C:\Users\dpereira\Documents\github\server\.claude\agents)
- [Project rules](file:///C:\Users\dpereira\Documents\github\server\docs\rules)