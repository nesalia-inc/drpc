# GitHub Code Quality Bot Design

## Overview

A GitHub bot that analyzes pull requests for code quality violations and posts review comments. Inspired by CodeQL but focused on **custom code quality rules** rather than security vulnerabilities — with **confidence scoring**, **quiet tasks for uncertain findings**, and **shadow code suggestions**.

```
┌─────────────────────────────────────────────────────────────┐
│                    PR OPENED / UPDATED                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  GITHUB ACTION TRIGGER                       │
│                                                             │
│  on:                                                       │
│    pull_request:                                            │
│      types: [opened, synchronize, reopened]                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    STEP 1: GET PR DIFF                       │
│                                                             │
│  gh pr diff $PR_NUMBER > diff.patch                        │
│  → List of changed files                                    │
│  → Line-by-line changes                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  STEP 2: RUN RULE ENGINE                     │
│                                                             │
│  analyze --diff --format json                                │
│  → Structured violations with confidence scores             │
│  → Shadow code findings                                      │
│  → Rule reputation weights                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                STEP 3: CONFIDENCE ROUTING                     │
│                                                             │
│  Confidence ≥ 0.90  → POST COMMENT (high confidence)         │
│  Confidence 0.85-0.90 → POST with "verify" label           │
│  Confidence 0.80-0.85 → QUIET TASK (lead dev review)        │
│  Confidence < 0.80  → LOG ONLY (no comment)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────────┐
                            │                                 │
                            ▼                                 ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│    STEP 4A: POST COMMENTS       │  │   STEP 4B: QUIET TASKS        │
│   (high confidence violations)   │  │  (low confidence → lead dev)   │
└─────────────────────────────────┘  └─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 5: POST SHADOW CODE SUGGESTIONS                │
│                                                             │
│  💡 "Missing abstraction detected..."                       │
│  (high confidence shadow code findings)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                STEP 6: POST SUMMARY COMMENT                  │
│                                                             │
│  🔍 Code Quality Analysis                                    │
│  5 violations found (2 high, 3 verify)                      │
│  1 shadow code suggestion                                   │
│  [View details in Security tab]                            │
└─────────────────────────────────────────────────────────────┘
```

## Confidence-Based Comment Routing

### The Problem with Uncalibrated AI Linters

An uncalibrated AI linter finds 4000 "violations" and developers disable it. The solution: **confidence scoring** with routing based on certainty.

### Confidence Thresholds

| Confidence | Action | Output Type |
|------------|--------|-------------|
| ≥ 0.90 | Post immediately as PR comment | `comment-high` |
| 0.85-0.90 | Post with "verify" label | `comment-verify` |
| 0.80-0.85 | Create quiet task, notify lead | `quiet-task` |
| < 0.80 | Log only to SARIF, no comment | `log-only` |

### Routing Logic

```typescript
interface RoutedFinding {
  finding: Violation | ShadowCodeFinding;
  confidence: number;
  action: "post-comment" | "post-verify" | "quiet-task" | "log-only";
  routingReason: string;
}

function routeFinding(finding: Violation): RoutedFinding {
  const { confidence } = finding;

  if (confidence >= 0.90) {
    return { finding, confidence, action: "post-comment", routingReason: "High confidence" };
  }
  if (confidence >= 0.85) {
    return { finding, confidence, action: "post-verify", routingReason: "Medium confidence, verify before acting" };
  }
  if (confidence >= 0.80) {
    return { finding, confidence, action: "quiet-task", routingReason: "Low confidence, lead review needed" };
  }
  return { finding, confidence, action: "log-only", routingReason: "Below threshold, logged only" };
}
```

### Comment Types by Confidence

**High Confidence (≥ 0.90):**
```markdown
🔴 **no-generic-suffixes** | Confidence: 0.94

`UserManager` uses forbidden suffix `Manager`.

**Suggestion:** Rename to `UserAPI` or `UserCommands`

> Rule: [docs/rules/no-generic-suffixes.md](link)
> Context: Similar pattern found in 3 other files
```

**Medium Confidence (0.85-0.90) with verify:**
```markdown
🟡 **no-generic-suffixes** [VERIFY] | Confidence: 0.87

`CacheHandler` uses suffix `Handler` — but this might be acceptable for stdlib patterns.

**Suggestion:** Review manually

> This is a medium-confidence finding. If this is a legitimate exception, use `/jurisprudence contest` to record the decision.
```

**Low Confidence (0.80-0.85) — Quiet Task:**
```markdown
⚪ **no-exported-classes** [LEAD REVIEW] | Confidence: 0.82

This class export might violate the rule, but context is unclear.

**Assigned to:** @lead-dev

> This finding is below the confidence threshold for automatic comment.
> Please review and either fix or contest via `/jurisprudence`.
```

## GitHub Action Definition

```yaml
name: Code Quality Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

jobs:
  code-quality:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      security-events: write
      repository-projects: write  # For quiet tasks

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get PR info
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            return {
              number: pr.number,
              sha: pr.head.sha,
              title: pr.title,
              author: pr.user.login
            };

      - name: Run Code Quality Analysis
        id: analyze
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx @deessejs/code-quality-analyzer \
            --pr-number ${{ steps.pr.outputs.number }} \
            --pr-sha ${{ steps.pr.outputs.sha }} \
            --output results.json \
            --format json

      - name: Parse and Route Findings
        id: route
        run: |
          node -e "
            const results = require('./results.json');
            const { routeFindings } = require('@deessejs/code-quality-analyzer/router');
            const routed = routeFindings(results);
            console.log(JSON.stringify(routed, null, 2));
          " > routed-findings.json

      - name: Post High Confidence Comments
        if: steps.route.outputs.highCount > 0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx @deessejs/code-quality-analyzer \
            --post-comments \
            --pr-number ${{ steps.pr.outputs.number }} \
            --input routed-findings.json \
            --filter confidence:0.90+

      - name: Post Verify Comments
        if: steps.route.outputs.verifyCount > 0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx @deessejs/code-quality-analyzer \
            --post-comments \
            --pr-number ${{ steps.pr.outputs.number }} \
            --input routed-findings.json \
            --filter confidence:0.85:0.90

      - name: Create Quiet Tasks
        if: steps.route.outputs.taskCount > 0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx @deessejs/code-quality-analyzer \
            --create-tasks \
            --pr-number ${{ steps.pr.outputs.number }} \
            --input routed-findings.json

      - name: Upload to GitHub Security
        uses: github/code-scanning-action@v4
        with:
          sarif_file: results.sarif
          category: "code-quality"
          upload: always
```

## Comment Posting Strategy

### High Confidence Comment (≥ 0.90)

```typescript
const highConfidenceComment = {
  body: `🔴 **no-generic-suffixes** | Confidence: 0.94

\`UserManager\` uses forbidden suffix \`Manager\`.

**Suggestion:** Rename to \`UserAPI\` or \`UserCommands\`

| Attribute | Value |
|-----------|-------|
| Confidence | 0.94 |
| Rule Weight | 0.91 (90% TP rate) |
| Context | Found in 3 similar files |

> Rule: [docs/rules/no-generic-suffixes.md](link)
> Jurisprudence: 12 validated, 2 contested`,
  path: "src/services/user.ts",
  line: 3,
  side: "RIGHT"
};
```

### Verify Comment (0.85-0.90)

```typescript
const verifyComment = {
  body: `🟡 **no-generic-suffixes** [VERIFY] | Confidence: 0.87

\`CacheHandler\` uses suffix \`Handler\`.

This might be acceptable — \`Handler\` is standard for event/stdlib patterns.

**Action needed:** Either:
- ✅ Confirm: "This is valid, ignore" (records Jurisprudence)
- ❌ Reject: "This violates the rule" (records Jurisprudence + fix)

> If this is a legitimate exception, use the \`/jurisprudence accept\` command to prevent future alerts.`,
  path: "src/cache/redis.ts",
  line: 5,
  side: "RIGHT"
};
```

### Grouped Comments (Same File + Same Rule)

```typescript
const groupedComment = {
  body: `🔴 **no-generic-suffixes** (3 violations) | Confidence: 0.92-0.95

| Line | Name | Suggestion |
|------|------|------------|
| 3 | \`UserManager\` | \`UserAPI\` |
| 7 | \`OrderManager\` | \`OrderCommands\` |
| 12 | \`ProductManager\` | \`ProductCommands\` |

[View all violations in Security tab](link)`,
  path: "src/services/user.ts",
  line: 1,
  side: "RIGHT"
};
```

## Shadow Code Suggestions

Shadow Code findings are **suggestions, not violations** — no blame, just observation.

### Suggestion Format

```markdown
💡 **Shadow Code: Missing Abstraction** | Confidence: 0.89

These 3 files share the same CRUD pattern with only type changes:
- `src/user/manager.ts`
- `src/order/manager.ts`
- `src/product/manager.ts`

**Estimated savings:** ~120 lines of duplicated code

**Suggestion:** Extract to `GenericCRUD<T>` abstraction

**Why this is a suggestion, not a violation:**
This follows the pattern, but could be simplified. Consider refactoring when convenient.

> This is an optional improvement. No action required.
```

## Quiet Tasks (Lead Dev Review)

For low-confidence findings (0.80-0.85), create GitHub Issues instead of comments:

```typescript
interface QuietTask {
  title: string;
  body: string;
  assignees: string[];  // Lead devs
  labels: string[];
  relatedFinding: Violation;
}

const quietTask = {
  title: "[Code Quality] Verify: potential no-exported-classes violation (0.82 confidence)",
  body: `## Lead Dev Review Needed

**Rule:** no-exported-classes
**File:** src/api/base.ts
**Line:** 12
**Confidence:** 0.82

\`\`\`typescript
export class BaseAPI { ... }
\`\`\`

**Context:** Agent is uncertain whether this class is part of the public API.

**Actions:**
- ✅ Accept: This is a violation, developer should fix
- ❌ Reject: This is a false positive, record as Jurisprudence

**Rule docs:** [docs/rules/no-exported-classes.md](link)`,
  assignees: ["@lead-dev"],
  labels: ["code-quality", "needs-review", "low-confidence"]
};
```

### Creating Quiet Tasks via GitHub Projects

```typescript
async function createQuietTask(
  finding: Violation,
  leadDevs: string[]
): Promise<void> {
  const issue = await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: `[Code Quality] Verify: ${finding.rule} (${finding.confidence} conf)`,
    body: formatQuietTaskBody(finding),
    assignees: leadDevs,
    labels: ["code-quality", "needs-review"]
  });

  // Link to PR
  await github.rest.issues.addComments({
    issue_number: issue.data.number,
    body: `Related PR: #${prNumber}`
  });
}
```

## Summary Comment

Posted once per PR, edited on subsequent runs:

```markdown
## 🔍 Code Quality Analysis

**PR:** #123 - Add user management
**Analyzed:** 22 files changed
**Duration:** 45s

### Confidence Summary

| Category | Count | Action |
|----------|-------|--------|
| 🔴 High confidence (≥0.90) | 2 | Posted as comments |
| 🟡 Verify (0.85-0.90) | 3 | Posted with verify label |
| ⚪ Lead review (0.80-0.85) | 1 | Created quiet task |
| 🔵 Logged only (<0.80) | 0 | No action |

### Violations by Rule

| Rule | High | Verify | Lead | Errors | Warnings |
|------|------|--------|------|--------|---------|
| `no-generic-suffixes` | 1 | 2 | 0 | 1 | 2 |
| `separate-types-from-functions` | 1 | 0 | 1 | 1 | 1 |
| `comments` | 0 | 1 | 0 | 0 | 1 |

### Shadow Code Suggestions

| Pattern | Files | Confidence | Action |
|---------|-------|------------|--------|
| CRUD duplication | 3 files | 0.89 | 💡 Suggestion posted |

### Jurisprudence Impact

| Rule | TP | FP | Weight |
|------|----|----|-------|
| `no-generic-suffixes` | 12 | 2 | 0.86 |
| `separate-types-from-functions` | 8 | 1 | 0.89 |

### Links

- [Full report (JSON)](link)
- [Security tab](link)
- [Quiet tasks](link)

---
*Generated by code-quality-analyzer v1.0*
```

## Comment Management

### Anti-Linting-Fatigue Rules

| Rule | Why |
|------|-----|
| Max 10 comments per PR per rule | Prevent spam |
| Group violations in same file | 1 comment vs 10 |
| Don't re-ping if no response | Respect developer time |
| High confidence only blocks PR | Medium/lead can be addressed later |

### Comment Lifecycle

```
PR opened → Analyze → Route findings → Post comments
    │
    ▼
Developer sees comment
    │
    ├─ Agrees → Fixes code → MARK RESOLVED
    │
    └─ Disagrees → Types /jurisprudence reject
                      │
                      ▼
             Records decision
                      │
                      ▼
             Agent learns → Future FP rate decreases
```

### Jurisprudence Integration

When developer contests via `/jurisprudence`:

```markdown
/jurisprudence reject --rule no-generic-suffixes --file src/cache/redis.ts:5 --reason "Handler is acceptable for event handlers in Node.js stdlib"
```

This stores the decision and injects it as a few-shot example for future analysis.

## SARIF Upload

All findings (including low-confidence log-only) go to SARIF:

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "code-quality-analyzer",
        "version": "1.0.0",
        "rules": [
          {
            "id": "no-generic-suffixes",
            "properties": {
              "confidence": "high",
              "precision": "high",
              "tags": ["naming", "readability"]
            }
          }
        ]
      }
    },
    "results": [
      {
        "ruleId": "no-generic-suffixes",
        "level": "error",
        "confidence": 0.94,
        "message": { "text": "UserManager uses forbidden suffix 'Manager'" },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "src/services/user.ts" },
            "region": { "startLine": 3 }
          }
        }],
        "properties": {
          "confidence": 0.94,
          "reputationWeight": 0.91,
          "routingAction": "post-comment",
          "shadowCode": false
        }
      }
    ]
  }]
}
```

## Bot User vs GitHub App

### GitHub App (Recommended)

```yaml
- name: Create GitHub App token
  uses: actions/create-github-app-token@v1
  id: app-token
  with:
    app-id: ${{ secrets.APP_ID }}
    private-key: ${{ secrets.APP_PRIVATE_KEY }}

- name: Post comments
  env:
    GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
  run: gh pr comment $PR_NUMBER --body "..."
```

**Pros:** Official attribution, granular permissions, issues + projects access

## Configuration

### Per-Repository Config

`.github/code-quality.yml`:

```yaml
rules:
  - name: no-generic-suffixes
    enabled: true
    severity: error
    confidenceThreshold: 0.85
  - name: separate-types-from-functions
    enabled: true
    severity: warning
    confidenceThreshold: 0.80
  - name: comments
    enabled: false  # Too noisy, manual review only

commenting:
  maxCommentsPerPR: 10
  maxCommentsPerRule: 5
  groupByFile: true
  dismissOnFix: true

confidenceThresholds:
  postImmediately: 0.90
  postWithVerify: 0.85
  quietTask: 0.80
  logOnly: 0.0

quietTasks:
  enabled: true
  assignTo: ["@lead-dev"]
  createIssue: true
  addToProject: true

shadowCode:
  enabled: true
  minConfidence: 0.85
  postAsSuggestion: true
```

### Per-PR Config (Labels)

| Label | Effect |
|-------|--------|
| `code-quality:full` | Full scan, not diff |
| `code-quality:skip` | Skip entirely |
| `code-quality:strict` | Errors block merge |
| `code-quality:relaxed` | Errors are warnings |

## Metrics & Monitoring

### Calibration Dashboard Data

```typescript
interface CalibrationMetrics {
  rule: string;
  period: string;  // "2026-W16"

  // Raw counts
  totalFindings: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;

  // Developer responses
  validated: number;      // Dev agreed, fixed
  contested: number;       // Dev disagreed

  // Calculated
  falsePositiveRate: number;  // contested / total
  truePositiveRate: number;  // validated / total

  // Reputation
  reputationWeight: number;

  // Trend
  trend: "improving" | "stable" | "degrading";
}
```

### SARIF Properties for Metrics

```json
{
  "results": [{
    "properties": {
      "confidence": 0.94,
      "routingAction": "post-comment",
      "jurisprudenceUsed": true,
      "contextFilesCount": 3,
      "shadowCode": false
    }
  }]
}
```

---

## Related Documents

- [Rule Engine Architecture](./rule-engine-architecture.md) — Core analysis engine with confidence scoring
- [Rule Lifecycle Pipeline](./rule-lifecycle-pipeline.md) — Jurisprudence, Shadow Code, feedback loop
