# Rule Engine Architecture

## Overview

The Rule Engine transforms codified rules into enforceable checks, producing structured violation reports. It bridges the gap between human-readable rules in `docs/rules/` and machine-executable analysis — but goes beyond traditional linting by incorporating **confidence scoring**, **cross-file context via Graph-RAG**, and **game-theoretic rule reputation**.

```
┌─────────────────────────────────────────────────────────────┐
│                        RULE ENGINE                           │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Rule Loader │───▶│  Executor   │───▶│  Reporter   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                │                 │               │
│         ▼                ▼                 ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ rules/*.md  │  │  Analysis   │  │  JSON/SARIF │     │
│  │ (source)    │  │  + Graph   │  │  + Trust    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Rule Loader

Loads and parses rules from `docs/rules/*.md`.

**Responsibilities:**
- Read all `.md` files in `docs/rules/`
- Parse YAML frontmatter for metadata
- Extract rule body (markdown) for agent prompts
- Validate rule structure
- Build rules index

**Output:**
```typescript
interface RuleIndex {
  rules: Rule[];
  categories: string[];
  lastUpdated: Date;
}

interface Rule {
  name: string;
  severity: "error" | "warning" | "info";
  category: string;
  enforcement: "agent" | "eslint" | "ast-grep" | "manual";
  astPattern?: string;
  eslintRule?: string;
  learnings: string[];
  autoFixable: boolean;
  confidenceThreshold: number;     // Minimum confidence to report
  reputation: RuleReputation;    // Game-theoretic weight
  fewShotExamples: FewShotExample[];  // From Jurisprudence
  examples: {
    anti: string[];
    good: string[];
  };
  created: Date;
  updated: Date;
}

interface RuleReputation {
  truePositive: number;   // Dev validated violation
  falsePositive: number;   // Dev contested violation
  weight: number;          // Calculated: TP / (TP + FP)
  lastUpdated: Date;
}
```

### 2. Executor

Routes rules to the appropriate enforcement mechanism.

**Execution Strategies:**

| Enforcement | Tool | Speed | Context | Confidence |
|-------------|------|-------|---------|------------|
| `eslint` | Native ESLint | Fast (<1s) | Stateless | 1.0 (deterministic) |
| `ast-grep` | ast-grep CLI | Fast (1-2s) | Stateless | 0.95-1.0 |
| `agent` | Claude Agent | Slow (30s+) | Stateful | 0.70-0.99 |
| `temporal` | Agent + LTL | Slow (60s+) | Stateful | 0.65-0.95 |
| `denotational` | Agent + Math | Slow (90s+) | Stateful | 0.60-0.90 |
| `manual` | None | N/A | Human review | N/A |

**Execution Flow:**
```
1. Load rule index + jurisprudence (few-shot examples)
2. Build/refresh Graph-RAG index (cross-file context)
3. Group rules by enforcement type
4. Execute eslint rules (parallel)
5. Execute ast-grep rules (parallel)
6. Execute agent rules with confidence scoring (parallel)
7. Execute temporal logic rules (if any)
8. Execute denotational semantics rules (if any)
9. Apply rule reputation weights
10. Collect all results with confidence scores
11. Filter by confidence threshold
12. Normalize to violation format
```

### 3. Reporter

Formats violations into standard output with confidence scores.

**Output Format:**

```typescript
interface ViolationReport {
  version: "1.0";
  analyzedAt: string;
  analyzedFiles: number;
  duration: number;  // ms
  rules: {
    name: string;
    violations: Violation[];
  }[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    avgConfidence: number;
    byRule: Record<string, RuleSummary>;
  };
  shadowCode: ShadowCodeFinding[];  // Analysis of absence
  metadata: {
    graphNodes: number;
    graphEdges: number;
    cacheHitRate: number;
    rulesWithJurisprudence: number;
  };
}

interface Violation {
  rule: string;
  severity: "error" | "warning" | "info";
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  confidence: number;         // 0.0 - 1.0
  reputationWeight: number;  // From rule reputation system
  escalated: boolean;         // True if elevated by reputation
  contextFiles: string[];    // Cross-file context (from Graph-RAG)
}

interface ShadowCodeFinding {
  type: "shadow-code";
  pattern: string;
  confidence: number;
  files: string[];
  suggestion: string;
  estimatedSavings: string;
  reasoning: string;
}
```

## Confidence Scoring

Every violation from an agent-based rule includes a confidence score (0.0 - 1.0).

### Confidence Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Pattern match clarity | 0.30 | How clearly code matches anti-pattern |
| Jurisprudence alignment | 0.25 | Matches examples in few-shot |
| Graph-RAG context | 0.20 | Cross-file patterns support finding |
| Rule reputation | 0.15 | Historical TP rate |
| Code complexity | 0.10 | Simple code = higher confidence |

### Confidence Thresholds

| Confidence | Action |
|------------|--------|
| ≥ 0.90 | Post immediately |
| 0.85-0.90 | Post with "verify" label |
| 0.80-0.85 | Quiet task for lead dev |
| < 0.80 | Log only, don't post |

### Rule Reputation (Game Theory)

Rule weight adjusts based on historical accuracy:

```typescript
interface ReputationUpdate {
  rule: string;
  outcome: "validated" | "contested";
}

// After each developer decision
function updateReputation(update: ReputationUpdate): void {
  const rule = getRule(update.rule);
  if (update.outcome === "validated") {
    rule.reputation.truePositive++;
  } else {
    rule.reputation.falsePositive++;
  }
  // Nash equilibrium: weight reflects true positive rate
  rule.reputation.weight =
    rule.reputation.truePositive /
    (rule.reputation.truePositive + rule.reputation.falsePositive);
  rule.reputation.lastUpdated = new Date();
}
```

**Effect:** A rule with 90% TP rate gets weight 0.90. A rule with 40% FP rate gets weight 0.40 and is automatically deprioritized.

## Enforcement Mechanisms

### ESLint (Deterministic Path)

For rules that map to existing ESLint rules:

```yaml
name: no-any
enforcement: eslint
eslintRule: "@typescript-eslint/no-explicit-any"
severity: error
confidence: 1.0  # Deterministic
```

**Confidence:** Always 1.0 (deterministic).

### ast-grep (Pattern Path)

For pattern-based rules:

```yaml
name: no-generic-suffixes
enforcement: ast-grep
astPattern: 'export const $NAME = ... where $NAME =~ /Handler$|Manager$|Service$/'
severity: error
confidence: 0.95
```

**Confidence:** 0.95-1.0 based on pattern specificity.

### Agent (Semantic Path)

For rules requiring LLM reasoning:

```yaml
name: comments
enforcement: agent
severity: warning
confidenceThreshold: 0.85
agentPrompt: |
  Check if comments explain WHY (not WHAT).
  Flag comments that state the obvious.
  Evaluate information entropy: does comment reduce uncertainty?
```

**Execution with Few-Shot:**
```typescript
const fewShotExamples = loadJurisprudence(ruleName);
const prompt = `
Rule: ${rule.markdown}

Examples of VALID violations (correctly flagged):
${validExamples.map(e => `- "${e.code}" // because: ${e.reasoning}`).join('\n')}

Examples of INVALID violations (false positives):
${invalidExamples.map(e => `- "${e.code}" // because: ${e.reasoning}`).join('\n')}

Analyze this code.
Output: { violations: [{ line, confidence, reasoning }] }
`;

const result = await query({
  prompt,
  options: { allowedTools: ["Read", "Glob", "Grep"] }
});
```

### Temporal Logic (LTL/CTL Path)

For rules about **sequences of events**:

```yaml
name: transactional-no-external-calls
enforcement: temporal
severity: error
temporalFormula: "G(transaction_open -> X(¬external_api U transaction_close))"
# Globally: if transaction opens, then no external API until transaction closes
```

**Use cases:**
- "After DB transaction opens, no external calls"
- "Mutex must be released in same function that acquired it"
- "API response must be validated before use"

### Denotational Semantics (Mathematical Path)

For detecting **hidden side effects**:

```yaml
name: deterministic-functional
enforcement: denotational
severity: warning
semanticCheck: true
# Translates code to mathematical denotation
# If denotation includes mutable state → violation
```

**How it works:**
1. Translate code fragment to λ-calculus-like representation
2. Extract "meaning" as mathematical object
3. If meaning includes global state dependency → non-deterministic
4. Confidence based on extraction accuracy

### Pragmatic Linguistics (Comment Path)

For analyzing **information entropy of comments**:

```yaml
name: meaningful-comments
enforcement: pragmatic
severity: info
entropyThreshold: 0.3
# Flag comments that add < 30% new information
```

**Analysis:**
- Compare comment content to code structure
- If comment merely restates code → low entropy → violation
- If comment explains WHY (context, trade-offs) → high entropy → valid

## Graph-RAG: Cross-File Context

A traditional linter sees files one at a time. **Graph-RAG** gives the agent a "God view" of the codebase.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GRAPH-RAG INDEX                         │
│                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌─────────────┐  │
│  │  Vector DB   │    │  Dependency   │    │   Semantic  │  │
│  │ (embeddings) │ +  │    Graph     │ +  │   Clusters  │  │
│  └───────────────┘    └───────────────┘    └─────────────┘  │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  "What does        "Who imports      "Which files          │
│   this module         what"           are similar"        │
│   semantically                                        │
│   similar to?"                                          │
└─────────────────────────────────────────────────────────────┘
```

### What It Stores

```typescript
interface GraphRAGIndex {
  // Vector embeddings for semantic similarity
  vectors: Record<string, number[]>;  // file → embedding

  // Dependency graph
  dependencies: Record<string, {
    imports: string[];
    importedBy: string[];
    calls: string[];         // Function-level
    calledBy: string[];
  }>;

  // Semantic clusters
  clusters: {
    id: string;
    files: string[];
    pattern: string;         // "CRUD operations"
    abstraction: string;     // "Could be GenericCRUD<T>"
    confidence: number;
  }[];

  // Built from: git history, AST analysis, embeddings
}
```

### How Agent Uses It

```typescript
// Before analyzing a file
async function getContext(file: string): Promise<Context> {
  const similar = await findSimilarFiles(file);      // Vector search
  const deps = await getDependencies(file);          // Graph traversal
  const cluster = await getSemanticCluster(file);    // Pattern match

  return {
    similarFiles: similar.slice(0, 5),
    dependencyContext: deps,
    semanticCluster: cluster,
    shadowCodeOpportunities: await findShadowCode(file)
  };
}

// Agent prompt includes context
const prompt = `
File: ${file}
Similar files (same pattern): ${context.similarFiles}
Dependency context: ${context.deps}
Shadow code opportunity: ${context.shadowCodeOpportunities}
`;
```

### Shadow Code Detection via Graph-RAG

Graph-RAG enables **Shadow Code** detection:

```typescript
interface ShadowCodeSignal {
  entityName: string;
  conceptualComplexity: number;  // How hard to describe?
  actualComplexity: number;      // Lines of code
  gapRatio: number;             // conceptual / actual
  // If gapRatio < 0.5: could be abstracted
  // If gapRatio < 0.3: MUST be abstracted
}

async function detectShadowCode(): Promise<ShadowCodeFinding[]> {
  const clusters = await semanticClustering.all();

  return clusters
    .filter(c => c.gapRatio < 0.5)
    .map(c => ({
      type: "shadow-code",
      pattern: c.pattern,
      files: c.files,
      confidence: 1 - c.gapRatio,  // Higher gap = lower confidence
      suggestion: `Extract to ${c.abstraction}`,
      estimatedSavings: `${c.totalLines} lines`
    }));
}
```

## Incremental Analysis with Graph-RAG

### Cache Strategy

```typescript
interface Cache {
  version: string;
  lastScan: string;
  files: Record<string, FileCache>;
  graphHash: string;           // Graph state hash
  jurisprudenceHash: string;   // Jurisprudence state hash
}

interface FileCache {
  hash: string;
  lastModified: string;
  violations: Violation[];
  rulesChecked: string[];
  graphSnapshot: string[];     // Files referenced by this file
}
```

### Incremental Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ANALYZE --incremental (default for PRs)                     │
│                                                             │
│  1. git diff --name-only (changed files)                     │
│         │                                                   │
│         ▼                                                   │
│  2. Check Graph-RAG cache                                  │
│     ├─ Graph unchanged? → Use cached graph                  │
│     └─ Graph changed? → Rebuild affected subgraphs           │
│         │                                                   │
│         ▼                                                   │
│  3. For each changed file:                                  │
│     ├─ Hash changed? → Re-run all applicable rules          │
│     ├─ File deleted? → Remove from cache + graph           │
│     └─ New file? → Run all + update graph                 │
│         │                                                   │
│         ▼                                                   │
│  4. Cross-file rules (Graph-RAG):                           │
│     ├─ Analyze only files in changed subgraph              │
│     └─ Propagate effects to dependent files                 │
│         │                                                   │
│         ▼                                                   │
│  5. Apply Jurisprudence (few-shot examples)                  │
│         │                                                   │
│         ▼                                                   │
│  6. Apply reputation weights                                │
│         │                                                   │
│         ▼                                                   │
│  7. Filter by confidence threshold                          │
│         │                                                   │
│         ▼                                                   │
│  8. Output: violations + shadow code findings               │
└─────────────────────────────────────────────────────────────┘
```

## Rule Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSING PIPELINE                       │
│                                                             │
│  Input: Files (via git diff or glob)                         │
│                                                             │
│  ┌─────────────┐                                           │
│  │   GROUPER   │  Group files by category                   │
│  └─────────────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │ REFRESH     │  Update Graph-RAG (if needed)             │
│  │ GRAPH-RAG   │                                           │
│  └─────────────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │ PARTITIONER │  Partition by enforcement type             │
│  │ - eslint    │                                           │
│  │ - ast-grep  │                                           │
│  │ - agent     │                                           │
│  │ - temporal  │                                           │
│  │ - denotational                                           │
│  └─────────────┘                                           │
│         │                                                   │
│         ├──────────────────┬────────────────┐               │
│         ▼                  ▼                ▼               │
│  ┌───────────┐      ┌───────────┐    ┌───────────┐          │
│  │  ESLINT   │      │ AST-GREP  │    │  AGENT    │          │
│  │  Runner   │      │  Runner   │    │  Runner   │          │
│  └───────────┘      └───────────┘    └───────────┘          │
│         │                  │                │               │
│         └──────────────────┼────────────────┘               │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │   MERGER +      │                       │
│                   │   CONFIDENCE    │                       │
│                   │   SCORING       │                       │
│                   └─────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │   GRAPH-RAG    │                       │
│                   │   PROPAGATION  │                       │
│                   └─────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │   SHADOW CODE   │                       │
│                   │   DETECTION     │                       │
│                   └─────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │   FILTER BY    │                       │
│                   │   THRESHOLD    │                       │
│                   └─────────────────┘                       │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │    REPORTER     │                       │
│                   │ JSON/SARIF/CLI │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## CLI Interface

```bash
# Full analysis (all files)
analyze

# Incremental (changed files only, default when on PR)
analyze --diff

# Full scan (ignore cache)
analyze --full

# Specific rules
analyze --rules no-generic-suffixes,no-any

# Specific files
analyze --files src/api/**/*.ts

# Output formats
analyze --format json
analyze --format sarif
analyze --format github-comment

# Severity + confidence threshold
analyze --min-severity error --min-confidence 0.85

# Include shadow code
analyze --include-shadow-code

# Debug (show confidence scores)
analyze --debug
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Full scan (100 files) | <60s | With Graph-RAG + agents |
| Incremental scan (5 files) | <10s | With graph delta |
| ESLint-only | <2s | Without agent |
| ast-grep-only | <3s | Without agent |
| Graph-RAG rebuild | <15s | Incremental updates much faster |
| Cache hit | <500ms | No re-analysis |

## Error Handling

| Error | Behavior |
|-------|----------|
| ESLint fails | Skip ESLint rules, warn |
| ast-grep fails | Skip ast-grep rules, warn |
| Agent fails | Retry once, then fail |
| Graph-RAG fails | Fall back to file-by-file analysis |
| Temporal logic timeout | Skip temporal rules, warn |
| Low confidence (agent) | Filter, don't report |

## Extensibility

### Adding a New Rule

1. Create `docs/rules/my-new-rule.md` with frontmatter
2. Set `enforcement` type
3. Rule appears in next analysis automatically
4. Graph-RAG updates automatically

### Adding a New Enforcement Type

```typescript
interface EnforcementRunner {
  type: string;
  name: string;
  run(rule: Rule, files: string[], context: GraphRAGContext): Promise<Violation[]>;
}

// Register new runner
registry.register("temporal", temporalRunner);
registry.register("denotational", denotationalRunner);
```

---

## Related Documents

- [GitHub Bot Design](./github-bot-design.md) — PR integration with confidence thresholds
- [Rule Lifecycle Pipeline](./rule-lifecycle-pipeline.md) — Jurisprudence, Shadow Code, feedback loop
