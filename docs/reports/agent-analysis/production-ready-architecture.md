# Production-Ready Architecture: Cost & Scale

## The Scale Trap

Previous architecture: 3 Sonnet subagents × 10 files × 50 devs = **$22k/month in token costs**

This is not acceptable. We need a system that costs **< $1k/month** while maintaining quality.

---

## The Six Corrections

### Correction 1: Model Tiering — Token Bankruptcy Prevention

**Problem:** 3 Sonnet subagents = $22k/month

**Solution:** Aggressive model tiering based on task complexity

```
┌─────────────────────────────────────────────────────────────┐
│                    MODEL TIERING                            │
│                                                             │
│  Task Complexity → Model Assignment                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ COMPLEX (Sonnet 4.5) - Run once per PR max          │  │
│  │ - Shadow Code detection                              │  │
│  │ - Temporal logic violations                          │  │
│  │ - Architecture pattern analysis                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MEDIUM (Sonnet 4) - Parallel for independent tasks   │  │
│  │ - Pattern detection (imports, dependencies)           │  │
│  │ - Cross-file consistency checks                      │  │
│  │ - Jurisprudence retrieval                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SIMPLE (Haiku) - Parallel, fast, cheap              │  │
│  │ - Naming suffix detection (Manager, Handler, etc.)   │  │
│  │ - Comment entropy analysis                           │  │
│  │ - Import order validation                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Cost Analysis:**

| Agent | Model | Tokens/PR | Cost/PR | Monthly (50 devs) |
|-------|-------|-----------|---------|-------------------|
| Naming | Haiku | 5k | $0.0003 | $15 |
| Pattern | Sonnet | 15k | $0.45 | $675 |
| Shadow | Sonnet | 30k | $0.90 | $1,350 |
| **Total** | | **50k** | **$1.35** | **$2,025** |

**Optimized Architecture:**
```typescript
// Naming: Haiku only (suffix detection is pattern matching, not reasoning)
const namingAgent = new ToolLoopAgent({
  model: "anthropic/claude-haiku-4",
  instructions: `Detect generic suffixes. Pattern match only. Return JSON.`,
  tools: { grep: grepTool },  // No LLM needed for regex
});

// Shadow Code: Sonnet, once per PR (not per file)
const shadowCodeAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4-5",
  instructions: `Detect missing abstractions across the PR. Run once.`,
  tools: { read: readFilesTool, cluster: clusterTool },
});

// Pattern: Sonnet, but batch all files into single call
const patternAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4",
  instructions: `Analyze all files for pattern violations. Single call.`,
  tools: { read: batchReadTool },
});
```

**Shadow Code Frequency Gate:**
```typescript
// Only run Shadow Code agent if PR complexity exceeds threshold
const diffComplexity = await measureDiffComplexity(diff);
if (diffComplexity.linesAdded > 100 || diffComplexity.filesChanged > 10) {
  await shadowCodeAgent.analyze(prFiles);
} else {
  // Skip shadow code for simple PRs
  logger.info("PR below complexity threshold, skipping shadow analysis");
}
```

---

### Correction 2: Context Injection — No Redundant Reads

**Problem:** Each subagent calls `read(file)` = 3x input token cost

**Solution:** Orchestrator reads once, passes Mini-Context-Map to subagents

```
┌─────────────────────────────────────────────────────────────┐
│                    WRONG: ROAMING SUBAGENTS                 │
│                                                             │
│  Agent 1: read(file1) → analyze                            │
│  Agent 2: read(file1) → analyze  ← DUPLICATE READ         │
│  Agent 3: read(file1) → analyze  ← DUPLICATE READ         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    RIGHT: CONTEXT INJECTION                 │
│                                                             │
│  Orchestrator: read(file1) → create MiniContextMap          │
│                      │                                      │
│          ┌──────────┼──────────┐                            │
│          ▼          ▼          ▼                            │
│  NamingAgent    PatternAgent   ShadowAgent                  │
│  (map only)     (map only)     (map only)                   │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface MiniContextMap {
  files: Map<string, {
    content: string;
    ast: AST;
    imports: string[];
    exports: string[];
    namingCandidates: string[];  // Pre-extracted for Haiku
    lineCount: number;
  }>;
  diff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  graph: {
    dependencies: Edge[];
    semanticClusters: Cluster[];
  };
}

const analyzeCodeQuality = tool({
  description: "Run full code quality analysis",
  inputSchema: z.object({ files: z.array(z.string()) }),

  execute: async ({ files }, { abortSignal }) => {
    // ORCHESTRATOR: Read all files ONCE
    const fileData = await Promise.all(
      files.map(async (f) => ({
        path: f,
        content: await readFile(f),
        ast: await parseAST(f),
        imports: await extractImports(f),
        namingCandidates: extractNamingCandidates(await readFile(f)),
      }))
    );

    // Create Mini-Context-Map
    const contextMap: MiniContextMap = {
      files: new Map(fileData.map(f => [f.path, f])),
      diff: await getGitDiff(),
      graph: await getGraphSnapshot(),
    };

    // PASS CONTEXT TO SUBAGENTS (no re-reading)
    const [naming, patterns, shadow] = await Promise.all([
      namingAgent.generate({
        prompt: `Analyze naming using this context: ${JSON.stringify(contextMap)}`,
        abortSignal
      }),
      patternAgent.generate({
        prompt: `Analyze patterns using this context: ${JSON.stringify(contextMap)}`,
        abortSignal
      }),
      shadowCodeAgent.generate({
        prompt: `Analyze abstractions using this context: ${JSON.stringify(contextMap)}`,
        abortSignal
      }),
    ]);

    return mergeResults(naming, patterns, shadow);
  },
});
```

**Result:** Input tokens reduced by **60-70%** (files read once, not 3 times)

---

### Correction 3: Shadow Code — Three-Strike Rule

**Problem:** Shadow Code agent over-engineers → dev mutes the bot

**Solution:** Memory stores rejections as heavily as approvals. Three dismissals = 6-month blacklist.

```typescript
interface ShadowCodeMemory {
  clusterId: string;          // Unique semantic cluster fingerprint
  suggestion: string;         // "Extract to GenericCRUD<T>"
  dismissedCount: number;     // Strike counter
  lastDismissedAt: Date;
  dismissedBy: string[];
  blacklistedUntil: Date | null;
}

async function recordShadowCodeRejection(
  cluster: ShadowCodeFinding,
  dismissedBy: string
): Promise<void> {
  const memory = await shadowCodeMemory.get(cluster.clusterId);

  if (!memory) {
    await shadowCodeMemory.create({
      clusterId: cluster.clusterId,
      suggestion: cluster.suggestion,
      dismissedCount: 1,
      lastDismissedAt: new Date(),
      dismissedBy: [dismissedBy],
      blacklistedUntil: null,
    });
    return;
  }

  // Increment strike
  memory.dismissedCount++;
  memory.lastDismissedAt = new Date();
  memory.dismissedBy.push(dismissedBy);

  // THREE STRIKES = BLACKLIST
  if (memory.dismissedCount >= 3) {
    memory.blacklistedUntil = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
    await notifyLeadDev(
      `Shadow Code suggestion "${memory.suggestion}" blacklisted for 6 months. ` +
      `${memory.dismissedCount} developers dismissed it.`
    );
  }

  await shadowCodeMemory.update(memory);
}

// Before suggesting, check blacklist
async function shouldSuggestShadowCode(cluster: Cluster): Promise<boolean> {
  const memory = await shadowCodeMemory.get(cluster.clusterId);

  if (!memory) return true;  // Never suggested = OK

  if (memory.blacklistedUntil && memory.blacklistedUntil > new Date()) {
    return false;  // Blacklisted
  }

  return true;  // Has suggestions but not blacklisted
}
```

**Memory Schema:**
```typescript
// Equal weight: approvals AND rejections
const shadowCodeMemorySchema = z.object({
  clusterId: z.string(),
  suggestion: z.string(),
  approvedCount: z.number().default(0),
  dismissedCount: z.number().default(0),
  approvedBy: z.array(z.string()).default([]),
  dismissedBy: z.array(z.string()).default([]),
  blacklistedUntil: z.date().nullable(),
  lastActivityAt: z.date(),
});

// Retrieval: check blacklist BEFORE semantic search
async function recallShadowCode(cluster: Cluster): Promise<Memory[]> {
  // 1. Check exact blacklist first (fast)
  const blacklistCheck = await memory.get(`shadow:blacklist:${cluster.clusterId}`);
  if (blacklistCheck?.blacklistedUntil > new Date()) {
    return [];  // Don't suggest
  }

  // 2. Then semantic search for similar (only if not blacklisted)
  return memory.search({
    query: cluster.pattern,
    filter: { type: "shadow-code" },
    limit: 5,
  });
}
```

---

### Correction 4: Interactive vs Automated Separation

**Problem:** `useObject` streaming for CI = wrong tool

**Solution:** Separate streams for Human UI vs Machine CI

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERACTIVE STREAM                       │
│                    (Developer Dashboard)                    │
│                                                             │
│  useObject hook → Real-time partial JSON → Loading spinner │
│  Use case: Lead Dev reviewing Quiet Tasks                  │
│  Format: streamObject for visual feedback only             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATED STREAM                         │
│                    (GitHub Check Run / CI)                  │
│                                                             │
│  generateObject → Blocking, valid SARIF/JSON → Final output │
│  Use case: CI/CD pipeline, SARIF upload                     │
│  Format: generateObject with Zod schema validation          │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// For CI/CD: BLOCKING, validated output
async function runCodeQualityCI(files: string[]): Promise<ViolationReport> {
  const result = await generateObject({
    model: anthropic("claude-sonnet-4-5"),
    output: Output.object({ schema: ViolationReportSchema }),
    prompt: `Analyze code quality: ${files.join(", ")}`,
  });

  // result.output is fully validated SARIF-ready JSON
  await uploadToSARIF(result.output);
  return result.output;
}

// For Dashboard: STREAMING, partial updates
function CodeQualityDashboard({ prNumber }: { prNumber: number }) {
  const { object, submit, isLoading } = useObject({
    api: `/api/code-quality/${prNumber}/stream`,
    schema: ViolationReportSchema,
  });

  return (
    <div>
      {isLoading && <Spinner>Analyzing...</Spinner>}
      {object.partial && (
        <Preview violations={object.partial.violations} />
      )}
      {object.finish && <FinalReport report={object.finish} />}
    </div>
  );
}
```

---

### Correction 5: Metadata-Locked RAG — No Semantic Drift

**Problem:** RAG might associate `StripeWebhookHandler` exception with `DatabaseManager`

**Solution:** Filter by RuleID BEFORE semantic similarity

```
┌─────────────────────────────────────────────────────────────┐
│                    WRONG: GLOBAL RAG                       │
│                                                             │
│  Query: "Handler exceptions"                                │
│  ↓                                                         │
│  Semantic search across ALL memory                          │
│  ↓                                                         │
│  Returns: StripeWebhookHandler, DatabaseManager, etc.     │
│  (Drift: unrelated exceptions mixed together)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    RIGHT: METADATA-LOCKED RAG              │
│                                                             │
│  Query: "Handler exceptions for no-generic-suffixes"       │
│  ↓                                                         │
│  1. FILTER: ruleId = "no-generic-suffixes"                 │
│  2. SEMANTIC: similarity within filtered set               │
│  ↓                                                         │
│  Returns: StripeWebhookHandler ONLY                         │
│  (Precision: exact rule match)                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface JurisprudenceRecord {
  ruleId: string;              // MANDATORY filter
  code: string;                // Exact code snippet
  decision: "valid" | "invalid";
  reasoning: string;
  context: string;            // Why it was decided
  file: string;
  line: number;
  approvedBy: string;
  createdAt: Date;
  embeddings: number[];        // For semantic search within rule
}

// Search: ALWAYS filter by ruleId first
async function recallJurisprudence(
  code: string,
  ruleId: string,
  context: string
): Promise<JurisprudenceRecord[]> {
  // STEP 1: Strict metadata filter (no semantic drift possible)
  const candidates = await memory.getByMetadata({
    type: "jurisprudence",
    ruleId: ruleId,  // CRITICAL: must match exactly
  });

  if (candidates.length === 0) return [];

  // STEP 2: Semantic refinement within filtered set
  const queryEmbedding = await embedText(`${code} ${context}`);
  const reranked = await rerank({
    model: cohere.reranking("rerank-v3.5"),
    query: context,
    documents: candidates.map(c => c.code + " " + c.reasoning),
    topN: 3,
  });

  return reranked.ranking.map(r => candidates[r.index]);
}

// WRONG: Never do this (semantic drift)
async function badSearch(code: string): Promise<JurisprudenceRecord[]> {
  return memory.search({ query: code }); // NO RULE FILTER = DRIFT
}
```

---

### Correction 6: Golden Dataset — Evaluation-Driven Development with Evalite

**Problem:** No way to know if updates make the system better or worse

**Solution:** Use [Evalite](https://v1.evalite.dev/) — TypeScript evaluation framework with local UI

```
┌─────────────────────────────────────────────────────────────┐
│                    EVALITE WORKFLOW                          │
│                                                             │
│  pnpm eval:dev → localhost:3006                             │
│      │                                                     │
│      ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Evalite UI: Traces, Scores, Pass/Fail               │   │
│  │ • View each golden PR result                         │   │
│  │ • Inspect input → output → score                     │   │
│  │ • Debug failed cases                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│      │                                                     │
│      ▼                                                     │
│  pnpm eval:run → CI mode (headless)                         │
│      │                                                     │
│      ▼                                                     │
│  Threshold check → PASS or FAIL deploy                      │
└─────────────────────────────────────────────────────────────┘
```

**Evalite Setup:**
```bash
pnpm add -D evalite@beta vitest
```

**Evalite Test File:**
```typescript
// evals/code-quality.eval.ts
import { defineConfig } from 'evalite';
import { wrapAISDKModel } from 'evalite/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';

export default defineConfig({
  name: 'code-quality-rules',

  // AI SDK integration
  model: wrapAISDKModel(anthropic('claude-sonnet-4-5')),

  // Task: analyze code quality
  task: async ({ input }) => {
    const { files } = loadGoldenPR(input.prId);
    return analyzeCodeQuality(files);
  },

  // Scorers with thresholds
  scorers: [
    { name: 'precision', ... },
    { name: 'recall', ... },
    { name: 'f1', ... },
  ],

  // Fail build if below threshold
  threshold: {
    precision: 0.75,
    recall: 0.80,
    f1: 0.80,
  },

  // Golden PRs
  data: goldenPRs.map(pr => ({
    input: { prId: pr.id },
    expected: pr.expectedViolations,
  })),
});
```

**Pre-Deploy Pipeline:**
```bash
#!/bin/bash
# CI mode (headless)
pnpm eval:run

# Exit code 1 if any threshold fails
# HTML report exported to .evalite/export.html
```

**Evalite UI Features:**
- **localhost:3006** — Interactive trace explorer
- **Scores table** — Per-golden-PR pass/fail
- **Streaming logs** — Real-time execution
- **SQLite storage** — `node_modules/.evalite/db`

**Continuous Monitoring:**
```typescript
// After each PR analysis, compare against golden
async function validateAnalysis(
  actual: ViolationReport,
  prId: string
): Promise<void> {
  const golden = await loadGoldenPR(prId);

  const tp = actual.filter(v =>
    golden.expectedViolations.some(g =>
      g.rule === v.rule && g.file === v.file && g.line === v.line
    )
  );

  const fp = actual.filter(v =>
    !golden.expectedViolations.some(g =>
      g.rule === v.rule && g.file === v.file && g.line === v.line
    )
  );

  const fn = golden.expectedViolations.filter(g =>
    !actual.some(v => v.rule === g.rule && v.file === g.file && v.line === g.line)
  );

  await logEvaluationResult({ prId, tp, fp, fn });
}
```

---

## Final Phase Roadmap (Production-Ready)

```
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1: THE FIXER (Weeks 1-4)                 │
│                                                             │
│  Focus: Model Tiering + Suggested Changes                    │
│  Target: <$2k/month for 50 developers                       │
│                                                             │
│  Deliverables:                                             │
│  - Haiku for naming (suffix detection)                      │
│  - Sonnet for patterns (imports, deps)                      │
│  - Sonnet for shadow code (once per PR, complexity gate)    │
│  - Context injection (read once, share with subagents)      │
│  - GitHub Suggested Changes blocks                          │
│  - Check Run summary (not PR comment)                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: THE MEMORY (Weeks 5-8)                 │
│                                                             │
│  Focus: Persistence + Metadata-Locked RAG                   │
│  Target: Stop repeating decided debates                     │
│                                                             │
│  Deliverables:                                             │
│  - Mem0/Letta for persistence                               │
│  - Jurisprudence with ruleId filter (no drift)              │
│  - Three-strike blacklist for Shadow Code                  │
│  - Equal weight: approvals + rejections in memory         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 3: THE JUDGE (Weeks 9-12)                  │
│                                                             │
│  Focus: Evaluation + Consensus + Cooling                     │
│  Target: Self-improving, self-correcting system             │
│                                                             │
│  Deliverables:                                             │
│  - Evalite integration (golden dataset + UI at :3006)       │
│  - Pre-deploy evaluation (F1 ≥ 80%, CI gate)                │
│  - Multi-pass consensus (2 Haiku → 1 Sonnet if disagree)    │
│  - Rule cooling (auto-pause >20% FP rules)                  │
│  - Rule cooling (auto-pause >20% FP rules)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Projection (Final)

| Phase | Configuration | Monthly Cost |
|-------|--------------|--------------|
| Current | 3 Sonnet subagents | $22,000 |
| Phase 1 | Tiered (Haiku/Sonnet) + Context injection | $2,025 |
| Phase 2 | + Memory persistence | $2,500 |
| Phase 3 | + Benchmarks + Cooling | $3,000 |

**Target achieved: 85% cost reduction**

---

## The Philosophy: Agent as Apprentice

> Do not treat the agent as a "God-like Architect." Treat it as a **diligent Junior Developer who has a perfect memory of every Lead Dev meeting.**

The agent doesn't decide what's "Good."

It remembers what **you** decided was "Good" and enforces it consistently.

**This is the move from a Linter to an Architectural Memory.**

---

## Related Documents

- [architectural-memory.md](./architectural-memory.md) — Previous corrections
- [github-bot-design.md](./github-bot-design.md) — Implementation details
- [rule-engine-architecture.md](./rule-engine-architecture.md) — Technical details
- [rule-lifecycle-pipeline.md](./rule-lifecycle-pipeline.md) — Learning system
- [GitHub Native vs Our Design](./github-native-vs-our-design.md) — Integration strategy
- [docs/benchmarks/README.md](../../benchmarks/README.md) — Evalite setup + golden PRs

## Technology Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Evaluation | **[Evalite](https://v1.evalite.dev/)** | Test runner with UI |
| Memory | Mem0/Letta | Persistent storage |
| Vectors | AI SDK Embeddings | Semantic search |
| Types | Zod | Validation |
| Streaming UI | useObject | Dashboard |
| Subagents | ToolLoopAgent | Parallel analysis |
| Reranking | Cohere | Memory search |
| CI | Vitest | Test runner |