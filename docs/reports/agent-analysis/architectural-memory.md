# Architectural Memory: Beyond Linting

## The Paradigm Shift

**CodeQL is a linter.** It has no memory — it scans, detects, forgets.

**GitHub Code Quality is a scanner.** It flags issues, offers fixes, moves on.

**We must build something different: an Architectural Memory.**

The value is not in detecting `UserManager` — it's in remembering that 6 months ago, the Lead Architect decided `StripeWebhookHandler` was an acceptable exception. It remembers, learns, and never repeats the same debate twice.

---

## The Seven Corrections

### Correction 1: From "Critic" to "Coder" — Suggested Changes

**Problem:** Text comments are noise. "Apply fix" buttons are productivity.

**Solution:** Use GitHub Suggested Changes (multi-line diff blocks).

```markdown
💡 **no-generic-suffixes** | Confidence: 0.94

`UserManager` uses forbidden suffix `Manager`.

<details>
<summary>💬 Suggestion (click to apply)</summary>

```diff
- export const UserManager = { ... }
+ export const UserAPI = { ... }
```

</details>

> Click "Commit suggestion" to apply or edit before committing.
```

**Format:**
```typescript
interface SuggestedChange {
  path: string;
  lines: { startLine: number; endLine: number };
  replacement: string;  // Multi-line diff
}

const suggestion = {
  body: "Violation details...",
  suggestions: [
    {
      path: "src/services/user.ts",
      lines: { startLine: 3, endLine: 5 },
      replacement: `export const UserAPI = {\n  create: (input: UserInput) => { },\n}`
    }
  ]
};
```

**Result:**
- ❌ Before: "Rename UserManager to UserAPI" (dev ignores)
- ✅ After: Dev clicks "Commit suggestion" → code changes → PR merged

### Correction 2: Stop Trying to Unify — Use Check Runs

**Problem:** GitHub bot is a black box. Edit races cause CI slowness.

**Solution:** Don't compete. Use Check Runs for custom rules.

```
PR opened
    │
    ├─→ GitHub Code Quality (standard findings)
    │       └── Posted as PR comments + Security tab
    │
    └─→ @deesse-code-quality (custom rules)
            └── Posted as CHECK RUN (not PR comment)

Check Run tab contains:
├── Naming violations (with suggested changes)
├── Shadow Code suggestions
├── Architecture Score
└── Jurisprudence exceptions
```

**Check Run Benefits:**
1. Separate from PR conversation (no clutter)
2. Has its own tab in PR UI
3. Can be required status check (blocks merge)
4. Native GitHub infrastructure (no race conditions)

**Check Run Summary Format:**
```markdown
## Deesse Code Quality Analysis

### Custom Rules (3 violations)
| Rule | File | Severity | Action |
|------|------|----------|--------|
| no-generic-suffixes | src/services/user.ts | Error | 1 suggestion |
| entity-pattern | src/api/users.ts | Warning | Review |

### Shadow Code (1 suggestion)
- **Missing Abstraction:** 3 files share CRUD pattern → GenericCRUD<T>

### Confidence Summary
- 🔴 High (≥0.90): 2 → Suggested fixes available
- 🟡 Verify (0.85-0.90): 1 → Review requested

[View details] [Apply all fixes] [Dismiss]
```

### Correction 3: Graph-RAG Requires Stateful Backend — Use AI SDK Memory

**Problem:** Rebuilding Vector DB + Dependency Graph on every PR = CI bill disaster.

**Solution:** Vercel AI SDK Memory providers handle persistence natively.

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL AI SDK MEMORY                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Mem0    │  │   Letta     │  │  Custom     │        │
│  │ (cloud)    │  │(self-hosted)│  │   Tool      │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │               │
│         ▼                ▼                ▼               │
│  Semantic search    Core + Archival   Your storage        │
│  across conversations Memory           format              │
└─────────────────────────────────────────────────────────────┘
```

**Memory Provider Comparison:**

| Provider | Persistence | Search | Self-hosted | Best For |
|----------|-------------|--------|-------------|----------|
| **Mem0** | ✅ | Semantic | ❌ | Cloud-first, fast setup |
| **Letta** | ✅ | Core + Archival | ✅ | Self-hosted, full control |
| **Custom Tool** | ✅ | Structured | ✅ | Specific formats, no lock-in |

**Integration Pattern:**
```typescript
import { Mem0Memory } from "@ai-sdk/memory-provider-mem0";

const memory = new Mem0Memory({
  apiKey: process.env.MEM0_API_KEY,
  userId: "code-quality-bot",
});

async function remember(code: string, context: string): Promise<void> {
  await memory.add({
    content: `Exception: ${code} under rule ${context.rule}`,
    metadata: { decision: context.decision, date: new Date() }
  });
}

async function recall(code: string): Promise<Memory[]> {
  return memory.search({ query: code, limit: 5 });
}
```

**For Graph-RAG — custom tool with structured storage:**
```typescript
const graphRAGMemory = tool({
  description: "Persistent graph storage for cross-file patterns",
  inputSchema: z.object({
    action: z.enum(["store", "search", "update"]),
    file: z.string().optional(),
    embedding: z.array(z.number()).optional(),
    pattern: z.string().optional(),
  }),
  execute: async ({ action, ...params }, { abortSignal }) => {
    switch (action) {
      case "store":
        await db.files.upsert({ hash: params.file, ... });
        await db.edges.insertMany(params.edges);
        return "Stored";
      case "search":
        const results = await db.files.similar(params.embedding, 5);
        return JSON.stringify(results);
      case "update":
        await reindexIfNeeded(params.file);
        return "Updated";
    }
  },
});
```

**No State = No Graph-RAG.** Use AI SDK Memory providers instead of building custom persistence.

**AI SDK Embeddings for Graph-RAG:**
```typescript
import { embed, embedMany, cosineSimilarity } from "ai";

const { embedding } = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: fileContent,
});

// Batch embed for semantic clustering
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: allFiles.map(f => f.content),
});

// Search similar files
const similar = await cosineSimilarity({
  vector1: embedding,
  vector2: targetEmbedding,
});
```

**AI SDK Structured Output (Zod) for Violations:**
```typescript
import { generateText, Output } from "ai";
import { z } from "zod";

const ViolationSchema = z.object({
  rule: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  file: z.string(),
  line: z.number(),
  message: z.string(),
  confidence: z.number().min(0).max(1),
  suggestion: z.string().optional(),
});

const result = await generateText({
  model: anthropic("claude-sonnet-4-5"),
  prompt: `Analyze code quality violations in ${files.join(", ")}`,
  output: Output.object({
    schema: z.object({
      violations: z.array(ViolationSchema),
      shadowCode: z.array(z.object({
        pattern: z.string(),
        files: z.array(z.string()),
        confidence: z.number(),
        suggestion: z.string(),
      })),
    }),
  }),
});

// result.output.violations is fully typed
```

### Correction 4: Subagent Architecture — Parallel Analysis

**Problem:** Single agent doing naming + patterns + shadow code = context overflow, slow execution.

**Solution:** Use AI SDK Subagents for parallel, specialized analysis.

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN ORCHESTRATOR                        │
│                      (Router Agent)                         │
└─────────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Naming Agent   │ │  Pattern Agent  │ │ Shadow Code     │
│  (Subagent)     │ │  (Subagent)     │ │ (Subagent)      │
│                 │ │                 │ │                 │
│  - Suffix check │ │  - Import graph │ │  - Duplication  │
│  - Entity match │ │  - Dependencies │ │  - Missing abs  │
│  - Confidence   │ │  - Clusters     │ │  - Kolmogorov   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MERGER + RANKER                          │
│  - Combine results                                          │
│  - Apply confidence thresholds                              │
│  - Route to Check Run or Quiet Task                        │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
import { ToolLoopAgent } from "ai";

const namingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4-5",
  name: "naming-analyst",
  instructions: `Analyze naming conventions for generic suffixes.
    Flag: Handler, Manager, Executor, Service, etc.
    Return: { violations: [], suggestions: [] }`,
  tools: { read: readFileTool, grep: grepTool },
});

const patternAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4-5",
  name: "pattern-analyst",
  instructions: `Analyze code patterns and dependencies.
    Look for: import chains, circular deps, unused exports.
    Return: { patterns: [], anomalies: [] }`,
  tools: { read: readFileTool, graph: graphQueryTool },
});

const shadowCodeAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4-5",
  name: "shadow-code-analyst",
  instructions: `Detect missing abstractions.
    Look for: semantic duplication across files, low gap ratio.
    Return: { findings: [], estimatedSavings: string }`,
  tools: { read: readFileTool, cluster: semanticClusterTool },
});

const analyzeCodeQuality = tool({
  description: "Run full code quality analysis",
  inputSchema: z.object({ files: z.array(z.string()) }),
  execute: async ({ files }, { abortSignal }) => {
    const [naming, patterns, shadow] = await Promise.all([
      namingAgent.generate({ prompt: `Analyze: ${files.join(", ")}`, abortSignal }),
      patternAgent.generate({ prompt: `Analyze: ${files.join(", ")}`, abortSignal }),
      shadowCodeAgent.generate({ prompt: `Analyze: ${files.join(", ")}`, abortSignal }),
    ]);
    return mergeResults(naming, patterns, shadow);
  },
});
```

**Benefits:**
- Parallel execution (3x faster)
- Isolated contexts (no cross-contamination)
- Specialized tools per agent
- Streaming progress to UI

**Existing Correction:** Persistent Graph Service with Delta Indexing (DEPRECATED — use AI SDK Memory instead)

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN BRANCH STATE                         │
│  (Persistent Graph Service - container/MCP server)          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Vector DB  │  │ Dependency  │  │ Semantic    │        │
│  │ (embeddings)│  │    Graph    │  │  Clusters   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │               │
│         ▼                ▼                ▼               │
│  "Similar files"    "Who imports"   "Patterns"           │
└─────────────────────────────────────────────────────────────┘
         │                       ▲
         │   Delta sync         │
         ▼                       │
┌─────────────────────────────────────────────────────────────┐
│                    PR CHANGES (ephemeral)                    │
│                                                             │
│  Only changed files analyzed                                │
│  Queried against persistent main graph                      │
│  Results combined → violations + suggestions                │
└─────────────────────────────────────────────────────────────┘
```

**Delta Indexing Strategy:**
```typescript
interface DeltaIndexRequest {
  prNumber: number;
  changedFiles: string[];
  baseCommit: string;
}

// On PR open:
// 1. Get changed files list
// 2. For each changed file: re-index only if hash changed
// 3. Query main graph for cross-file context
// 4. Return analysis + suggestions

// Main graph updated only on merge to main
// PR analysis is READ-ONLY against main graph
```

**Persistence Architecture:**
```yaml
# Option A: MCP Server (recommended for simplicity)
services:
  graph-rag-server:
    image: deessejs/graph-rag-server
    environment:
      GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
      DB_PATH: /data/graph.db
    volumes:
      - graph-data:/data
    ports:
      - 3001:3000

# Option B: Container with persistent volume
# - Graph rebuilt on main merge (not on PR)
# - PR only queries, doesn't rebuild
```

**No State = No Graph-RAG.** A stateless GitHub Action cannot maintain graph context.

### Correction 5: Jurisprudence via Thread Resolution, Not Commands

**Problem:** Typing `/jurisprudence reject` in 2026 = 2015 ChatOps.

**Solution:** Use GitHub native interactions.

```
Developer finds bot comment
        │
        ▼
Developer clicks "Resolve thread"
        │
        ├─ Fixed code → Bot detects fix → records VALIDATED
        │
        └─ No code change + resolves → Bot prompts:
                │
                ▼
        ┌─────────────────────────┐
        │ False Positive?         │
        │ [Yes] → Jurisprudence    │
        │ [No] → Dismissed        │
        └─────────────────────────┘
```

**Resolution Flow:**
```typescript
interface ThreadResolution {
  action: "fixed" | "false_positive" | "contested";
  rule: string;
  file: string;
  line: number;
  commentId: string;
  resolutionTime: Date;
}

// Bot monitors thread resolutions
// If resolved without code diff → prompt for feedback
// Feedback stored as Jurisprudence example
```

**Alternative: Reaction Triggers**
- 👍 on bot comment → Validate (rule is correct)
- 👎 on bot comment → Contest (false positive)
- 🎯 on bot comment → "This is an exception, remember it"

### Correction 6: Contextual Thresholding — Consistency Over Perfection

**Problem:** Flagging `UserManager` in a codebase with 50 existing Managers creates political war.

**Solution:** Check precedent before flagging.

```typescript
async function analyzeNaming(file: string, name: string): Promise<Finding> {
  // 1. Check Graph-RAG: what % of codebase uses this suffix?
  const suffixStats = await graphRAG.getSuffixFrequency(name);

  // 2. If >50% of codebase uses same suffix → don't flag as error
  if (suffixStats.percentage > 50) {
    return {
      type: "shadow-code",
      confidence: 0.7,  // Lower confidence = suggestion, not violation
      message: `Consider \`${name.replace(/Manager$/, 'API')}\` for consistency with new modules`,
      suggestion: "gradual migration, not immediate rename"
    };
  }

  // 3. If <20% uses it → flag as violation (low precedent)
  return {
    type: "violation",
    confidence: 0.9,
    message: `\`${name}\` uses generic suffix`,
    severity: "error"
  };
}
```

**Contextual Thresholding Matrix:**

| Codebase State | Suffix Usage | Action |
|----------------|--------------|--------|
| New codebase | <20% | Flag as violation (error) |
| Established | 20-50% | Flag with "consider migrating" (warning) |
| Legacy dominant | >50% | Suggest only (shadow code), no pressure |

**The Principle:** An AI linter should **adapt to existing patterns**, not impose ideal patterns on legacy codebases.

### Correction 7: The Rule of Silence — Automatic Rule Cooling

**Problem:** If a rule generates 3 quiet tasks that lead dev ignores, the bot gets uninstalled.

**Solution:** Automatic rule cooling based on false positive rate.

```typescript
interface RuleCoolingState {
  rule: string;
  falsePositiveRate: number;      // FP / total findings
  consecutiveIgnoredTasks: number; // Lead dev ignored count
  status: "active" | "cooling" | "draft";
  cooldownUntil: Date | null;
}

function checkRuleCooling(rule: string): void {
  const state = getRuleState(rule);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentFindings = getFindingsSince(rule, oneWeekAgo);

  const fpRate = recentFindings.falsePositives / recentFindings.total;

  // Rule Cooling Triggers
  if (fpRate > 0.20) {
    // >20% FP rate → move to cooling
    setRuleStatus(rule, "cooling");
    setCooldownUntil(rule, new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)); // 2 days
    postToLead("Rule '${rule}' paused: FP rate ${fpRate}% exceeds 20%");
  }

  if (state.consecutiveIgnoredTasks >= 3) {
    // Lead ignored 3+ → quiet warning
    postToLead("Rule '${rule}' has ${state.consecutiveIgnoredTasks} ignored tasks. Disable?");
  }
}
```

**Rule Cooling States:**

| Status | Meaning | Enforcement |
|--------|---------|-------------|
| `active` | Normal operation | Posts comments/suggestions |
| `cooling` | High FP detected | Logs only, no comments for 48h |
| `draft` | Auto or manual pause | No enforcement, requires review |

**Cooling Recovery:**
- After cooling period, rule auto-reactivates at lower confidence threshold
- If FP continues → moves to `draft` permanently until manually reviewed

### Correction 8: Phase Roadmap Revision

**Original:** Analysis → Memory → Judge (confusing value prop)

**Revised:** Fixer → Memory → Judge (clearer value prop)

```
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1: THE FIXER (Weeks 1-4)                 │
│                                                             │
│  Focus: GitHub Suggested Changes (not text comments)        │
│  Target: Dev clicks "Apply fix" → code changes              │
│  Success: Bot is a productivity tool, not a critic           │
│                                                             │
│  Deliverables:                                             │
│  - Suggested change blocks in PR comments                  │
│  - Check Run summary (not PR comment flood)                │
│  - Confidence filtering (no noise)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: THE MEMORY (Weeks 5-8)                │
│                                                             │
│  Focus: AI SDK Embeddings + Structured Output                │
│  Target: Vector search + typed violations                     │
│  Success: Bot remembers, types are enforced via Zod         │
│                                                             │
│  Deliverables:                                             │
│  - AI SDK Embeddings (not custom Vector DB)                  │
│  - Zod schemas for violations + shadow code                 │
│  - Subagent parallelization (3x speedup)                   │
│  - Streaming UI via useObject hook                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 3: THE JUDGE (Weeks 9-12)                │
│                                                             │
│  Focus: Jurisprudence RAG                                    │
│  Target: "Remember that exception from 6 months ago"        │
│  Success: Bot never repeats a decided debate                │
│                                                             │
│  Deliverables:                                             │
│  - Thread resolution → Jurisprudence capture               │
│  - Few-shot injection from exceptions                      │
│  - Contextual thresholding (consistency > perfection)      │
│  - Rule cooling (auto-disable high-FP rules)              │
└─────────────────────────────────────────────────────────────┘
```

**Phase 1 Success Metric:** >50% of violations are committed via Suggested Changes (not manual fix).

---

## The Architectural Memory Concept

### What It Remembers

```typescript
interface ArchitecturalMemory {
  // Naming decisions
  namingExceptions: Map<string, ExceptionRecord>;  // "StripeWebhookHandler" → approved

  // Pattern precedents
  patternPrecedents: Map<string, PatternRecord>;    // Graph-RAG clusters with decisions

  // Rule calibration
  ruleCalibration: Map<string, CalibrationRecord>; // FP/TP rates, cooling state

  // Developer preferences
  developerPreferences: Map<string, PreferenceRecord>;  // Who prefers what
}

interface ExceptionRecord {
  code: string;           // "StripeWebhookHandler"
  rule: string;           // "no-generic-suffixes"
  approvedBy: string;      // "lead-architect@company.com"
  approvedAt: Date;
  context: string;         // "Standard Stripe pattern for webhook handlers"
  scope: "global" | "module" | "file";
}
```

### What CodeQL Cannot Do

| Capability | CodeQL | Architectural Memory |
|------------|--------|---------------------|
| Scan for vulnerabilities | ✅ | ❌ |
| Remember naming exceptions | ❌ | ✅ |
| Adapt to existing patterns | ❌ | ✅ |
| Learn from rejections | ❌ | ✅ |
| Auto-cool rules with high FP | ❌ | ✅ |
| Cross-file semantic clusters | ❌ | ✅ |

### The Value Proposition

**CodeQL:** "I found 5 security issues in this PR."

**Architectural Memory:** "I found 5 issues, including one that was debated 6 months ago and decided to be an exception. I also noticed this pattern exists in 3 other files — should we extract it?"

---

## Implementation Priorities

### Week 1-2: Suggested Changes
1. Implement GitHub Suggested Changes format
2. Replace text comments with diff blocks
3. Add "Commit suggestion" CTA to all violations

### Week 3-4: Check Runs
1. Move summary to Check Run (not PR comment)
2. PR comment only for blockers (high confidence violations)
3. Verify Check Run UI is accessible

### Week 5-8: AI SDK Memory + Subagents
1. Integrate AI SDK Embeddings for vector storage (instead of custom Vector DB)
2. Use AI SDK Structured Output (Zod schema) for violation reports
3. Implement subagent architecture (naming + pattern + shadow agents)
4. Parallel execution via Promise.all
5. Streaming UI for real-time progress via `useObject`

### Week 9-12: Jurisprudence
1. Thread resolution capture via GitHub API
2. Few-shot example injection into prompts
3. Rule cooling automation (auto-pause high-FP rules)
4. Use AI SDK Reranking for memory search results

---

## Related Documents

- [GitHub Bot Design](./github-bot-design.md) — Original implementation plan
- [Rule Engine Architecture](./rule-engine-architecture.md) — Technical details
- [Rule Lifecycle Pipeline](./rule-lifecycle-pipeline.md) — Learning system
- [GitHub Native vs Our Design](./github-native-vs-our-design.md) — Integration strategy
- **[Production-Ready Architecture](./production-ready-architecture.md)** — Cost optimization + Scale (MUST READ before implementation)

## Technology Stack (from Principal Engineer Review)

| Component | Solution | Why |
|-----------|----------|-----|
| Memory Persistence | AI SDK Memory (Mem0/Letta) | Managed, scalable |
| Vector Search | AI SDK Embeddings | Provider-agnostic |
| Violation Types | AI SDK Structured Output (Zod) | Type-safe, validated |
| Streaming UI | AI SDK `useObject` hook | Real-time partial results |
| Subagents | AI SDK ToolLoopAgent | Parallel execution |
| Memory Search | AI SDK Reranking (Cohere) | Improved relevance |