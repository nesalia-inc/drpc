# Code Quality Evaluation Benchmarks

## Purpose

Before every deploy, we run our code quality engine against a **golden dataset** of known PRs with expected violations. If precision/recall drops below threshold, we abort the deploy.

**This is test-driven development for AI systems.**

**We use [Evalite](https://v1.evalite.dev/)** — a TypeScript evaluation framework built on Vitest with a local web UI for exploring traces and scores.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| **[Evalite](https://v1.evalite.dev/)** | Evaluation runner with UI at localhost:3006 |
| **Vitest** | Test runner (Evalite is built on it) |
| **AI SDK** | `wrapAISDKModel()` for streaming integration |
| **SQLite** | Results stored in `node_modules/.evalite` |

---

## Quick Start

```bash
# Install Evalite
pnpm add -D evalite@beta vitest

# Run evaluations (dev mode with UI)
pnpm eval:dev

# Run CI mode (headless)
pnpm eval:run

# View results UI
open http://localhost:3006
```

---

## Directory Structure

```
docs/benchmarks/
├── golden-prs/                    # Test cases
│   ├── pr-001-clean-with-violations/
│   │   ├── diff.patch
│   │   ├── files/
│   │   ├── expected-violations.json
│   │   └── expected-shadow-code.json
│   ├── pr-002-false-positive-test/
│   │   └── expected-empty.json
│   └── ...
├── evals/                         # Evalite test files
│   ├── code-quality-rules.eval.ts
│   └── shadow-code-detection.eval.ts
├── evaluation-results/            # Historical (Evalite exports here)
│   └── ...
└── README.md
```

---

## Evalite Test Format

### Basic Structure

```typescript
// evals/code-quality-rules.eval.ts
import { defineConfig, countMatches } from 'evalite';
import { wrapAISDKModel } from 'evalite/ai-sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { loadGoldenPR, scoreViolation } from './helpers';

export default defineConfig({
  name: 'code-quality-rules',

  // AI SDK model wrapper for streaming
  model: wrapAISDKModel(anthropic('claude-sonnet-4-5')),

  // Task: what to evaluate
  task: async ({ input, model }) => {
    const { files, expected } = loadGoldenPR(input.prId);
    const result = await model.invoke(`Analyze: ${files.join(', ')}`);
    return JSON.parse(result.text);
  },

  // Scorers: how to evaluate
  scorers: [
    // Precision: did we find correct violations?
    async ({ output, expected }) => {
      const tp = countMatches(output.violations, expected.violations, {
        keys: ['rule', 'file', 'line'],
      });
      const fp = output.violations.length - tp;
      return {
        precision: tp / (tp + fp),
        tp, fp,
      };
    },

    // Recall: did we miss any?
    async ({ output, expected }) => {
      const tp = countMatches(output.violations, expected.violations, {
        keys: ['rule', 'file', 'line'],
      });
      const fn = expected.violations.length - tp;
      return {
        recall: tp / (tp + fn),
        fn,
      };
    },
  ],

  // Threshold: fail build if below
  threshold: {
    precision: 0.75,
    recall: 0.80,
    f1: 0.80,
  },

  // Data: golden PRs
  data: goldenPRs.map(pr => ({
    input: { prId: pr.id },
    expected: pr.expectedViolations,
  })),
});
```

### Scorers Available

```typescript
import {
  answerCorrectness,   // Full answer accuracy
  answerRelevancy,     // Relevance to question
  answerSimilarity,    // Semantic similarity
  contains,            // Does output contain expected?
  exactMatch,         // Exact string match
  faithfulness,       // Faithful to context
  levenshtein,        // Edit distance
  noiseSensitivity,   // Ignore noise
  toolCallAccuracy,   // Tool calls correct
} from 'evalite/scorers';
```

### Custom Scorer Example

```typescript
import { createScorer } from 'evalite';

const f1Score = createScorer({
  name: 'f1-score',
  run: async ({ output, expected }) => {
    const { precision, recall } = output.scores;
    return {
      f1: 2 * (precision * recall) / (precision + recall),
    };
  },
});
```

---

## Golden PR Format

### `expected-violations.json`

```json
{
  "prId": "pr-001",
  "description": "Should detect 3 no-generic-suffix violations",
  "expectedCount": {
    "error": 2,
    "warning": 1,
    "info": 0
  },
  "violations": [
    {
      "rule": "no-generic-suffixes",
      "file": "src/services/user.ts",
      "line": 3,
      "severity": "error",
      "messageContains": "Manager suffix"
    }
  ]
}
```

### `expected-shadow-code.json`

```json
{
  "prId": "pr-003",
  "description": "Should detect 1 missing abstraction",
  "shadowCode": [
    {
      "pattern": "CRUD duplication",
      "files": ["src/user/manager.ts", "src/order/manager.ts"],
      "confidence": 0.85,
      "estimatedSavings": "120 lines"
    }
  ]
}
```

---

## CI Integration

```yaml
# .github/workflows/evaluate.yml
name: Code Quality Evaluation

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Evalite (CI mode)
        run: pnpm eval:run
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evalite-report
          path: .evalite/export.html

      - name: Upload results DB
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: evalite-db
          path: node_modules/.evalite/db
```

---

## Metrics

| Metric | Formula | Minimum | Target |
|--------|---------|---------|--------|
| **Precision** | TP / (TP + FP) | 0.75 | 0.85 |
| **Recall** | TP / (TP + FN) | 0.80 | 0.90 |
| **F1 Score** | 2×P×R / (P+R) | 0.80 | 0.90 |
| **Shadow Code Acceptance** | Accepted / Total | 0.50 | 0.70 |

---

## Evalite UI

When running `pnpm eval:dev`, Evalite provides:

- **localhost:3006** — Web UI for exploring traces
- **Scores table** — Pass/fail per golden PR
- **Traces** — Input → Output → Score for each case
- **Streaming logs** — Real-time execution

```
┌─────────────────────────────────────────────────────────────┐
│  Evalite Results — code-quality-rules                       │
├─────────────────────────────────────────────────────────────┤
│  PR-001 │ 0.95 │ ✓ Pass │ precision: 0.92, recall: 0.98   │
│  PR-002 │ 0.88 │ ✓ Pass │ precision: 0.85, recall: 0.91   │
│  PR-003 │ 0.72 │ ✗ Fail │ precision: 0.70, recall: 0.74   │
├─────────────────────────────────────────────────────────────┤
│  F1: 0.85 │ 3/3 passing │ Threshold: 0.80                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Adding New Golden PRs

1. Add folder under `docs/benchmarks/golden-prs/`
2. Create `expected-violations.json` with expected findings
3. Run `pnpm eval:dev` to verify
4. If scoring passes, commit the golden PR

```bash
# Verify new golden PR
pnpm eval:dev --filter "pr-020*"
```

---

## Helper Functions

```typescript
// evals/helpers.ts
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadGoldenPR(prId: string) {
  const prDir = join(__dirname, '../golden-prs', prId);
  const expected = JSON.parse(
    readFileSync(join(prDir, 'expected-violations.json'), 'utf-8')
  );
  const diff = readFileSync(join(prDir, 'diff.patch'), 'utf-8');
  return { ...expected, diff };
}

export function countMatches(
  output: any[],
  expected: any[],
  { keys }: { keys: string[] }
): number {
  return output.filter(o =>
    expected.some(e => keys.every(k => o[k] === e[k]))
  ).length;
}
```
