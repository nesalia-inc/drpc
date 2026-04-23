# Rule Lifecycle Pipeline: From Learnings to Enforcement

## Concept

A closed-loop system where real-world discoveries become enforceable rules, violations trigger feedback, and feedback generates new discoveries — but more importantly, where **the system learns from every human decision**.

```
┌─────────────────────────────────────────────────────────────┐
│                       DISCOVERY LAYER                        │
│                                                             │
│  Learnings (markdown docs)                                   │
│  - Raw observations                                          │
│  - Project-specific insights                                 │
│  - Edge cases discovered                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Human judgment
┌─────────────────────────────────────────────────────────────┐
│                        RULE LAYER                           │
│                                                             │
│  Rules (machine-readable)                                   │
│  - Codified standards                                        │
│  - Enforceable patterns                                      │
│  - Clear violations                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Engine
┌─────────────────────────────────────────────────────────────┐
│                     ENFORCEMENT LAYER                        │
│                                                             │
│  - Local CLI (analyze)                                       │
│  - GitHub Bot (PR reviews)                                   │
│  - CI/CD integration                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Feedback + Jurisprudence
┌─────────────────────────────────────────────────────────────┐
│                      FEEDBACK LAYER                          │
│                                                             │
│  - Developer pushback (validation/contestation)              │
│  - Few-shot examples (learned from decisions)               │
│  - Shadow Code discoveries (system improves itself)          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                       BACK TO
                       DISCOVERY
```

## The Four Layers

### Layer 1: Learnings

**Purpose:** Capture raw discoveries without immediately enforcing them.

**Location:** `docs/learnings/`

**Format:**
```markdown
# Learning: Generic Suffixes Cause Confusion

**Date:** 2026-04-15
**Author:** Dev team retrospective
**Context:** Code review of PR #456

## What We Observed

- `UserManager`, `OrderManager`, `ProductManager` all exported
- Impossible to know what each does without reading implementation
- Onboarding new dev took 3 hours to understand the pattern

## Examples

**Confusing:**
```typescript
const user = UserManager.find(id);
const order = OrderManager.get(id);
```

**Clearer alternatives:**
```typescript
const user = UserAPI.find(id);
const order = OrderQueries.get(id);
```

## Questions for Further Research

- Are there cases where "Manager" is appropriate?
- Should we distinguish between read vs write operations?
- What about other generic suffixes (Handler, Service)?

## Status

`candidate` | `promoted` | `rejected`

---

*This is a learning, not a rule. It may or may not become one.*
```

**When to create a learning:**
- Pattern observed in code review
- Retrospective finding
- Bug root cause discovered
- External research finding
- **Jurisprudence decision** (see below)

### Layer 2: Rules

**Purpose:** Transform learnings into enforceable, actionable rules.

**Location:** `docs/rules/`

**Format:**
```markdown
---
name: no-generic-suffixes
severity: error
category: naming
enforcement: agent
status: active
learnings:
  - docs/learnings/generic-suffixes-confusion.md
autoFixable: false
confidenceThreshold: 0.85
fewShotExamples: []  # Dynamically populated from Jurisprudence
tags:
  - naming
  - readability
  - api-design
---

# No Generic Suffixes Rule

## Rule

Do not use generic suffixes: `Handler`, `Manager`, `Service`, `Processor`, `Controller`, `Provider`, `Helper`, `Util`, `Wrapper`, `Adapter`, `Facade`, `Builder`.

## Why

[Explain the rationale]

## Anti-Patterns

[Examples from learnings, generalized]

## Correct Patterns

[Better alternatives]

## Enforcement

- **Confidence threshold:** 0.85 (below this, quiet task instead of comment)
- **Agent:** Claude Agent checks with few-shot examples injected

## Exceptions

[Known acceptable use cases, if any]
```

### Layer 3: Enforcement

**Purpose:** Automatically find violations with confidence scoring.

**Locations:**
- `analyze` CLI — Local development
- GitHub Bot — PR reviews
- CI/CD — Pre-merge gating

**Enforcement Matrix:**

| Enforcement | Speed | Accuracy | Cost |
|-------------|-------|----------|------|
| ESLint | <1s | Deterministic | Low |
| ast-grep | 1-3s | Deterministic | Low |
| Agent | 30s+ | Contextual + Confidence | High |
| Manual | N/A | Perfect | Infinite |

**Decision tree:**

```
Is there an ESLint rule for this?
├─ Yes → Use ESLint
└─ No
    │
    ├─ Is this a pattern match? (regex, AST)
    │   ├─ Yes → Use ast-grep
    │   └─ No → Agent required
    │
    └─ Does agent make sense here?
        ├─ Yes → Use Agent (with confidence scoring)
        └─ No → Manual (code review only)
```

### Layer 4: Feedback + Jurisprudence

**Purpose:** Close the loop AND make the system smarter over time.

> **Critical insight:** A classic linter is binary (pass/fail). An AI linter is probabilistic. Every time a human validates or contests an AI finding, that decision is pure gold — it becomes a **few-shot example** injected dynamically into future prompts.

#### Jurisprudence: The Learning-from-Decisions System

```
Violation reported by agent
         │
         ▼
Developer sees violation
         │
         ├─ Agrees → Fixes code → VALIDATED
         │
         └─ Disagrees → Contests → "This is a false positive because..."
                   │
                   ▼
         ┌─────────────────────────┐
         │  JURISPRUDENCE ENGINE  │
         │                         │
         │  Store this decision   │
         │  as a few-shot example │
         │                         │
         │  - Context (file, rule, code)  │
         │  - Decision (valid/invalid)     │
         │  - Reasoning (why)              │
         └─────────────────────────┘
                   │
                   ▼
         Future violations of same rule
         now include this example in prompt
```

**Why this matters:**
- Without Jurisprudence, the agent makes the same interpretation errors forever
- With Jurisprudence, the agent gets smarter with every human decision
- Over time, false positive rate approaches zero

**Few-Shot Example Format:**

```json
{
  "rule": "no-generic-suffixes",
  "context": {
    "file": "src/payment/handlers/stripe.ts",
    "code": "export class StripeWebhookHandler",
    "line": 3
  },
  "decision": "invalid",  // Human said: this is NOT a violation
  "reasoning": "StripeWebhookHandler is a standard naming for webhook processors in Stripe ecosystem. This is an exception case.",
  "validatedAt": "2026-04-22T10:00:00Z",
  "by": "senior-dev@company.com"
}
```

**Jurisprudence Storage:**

```
docs/jurisprudence/
├── no-generic-suffixes/
│   ├── 001-stripe-webhook-handler.json
│   ├── 002-event-emitter-acceptable.json
│   └── 003-database-manager-legacy.json
└── separate-types-from-functions/
    └── 001-query-builder-types.json
```

**How it works:**

```typescript
// Before analyzing with agent
const fewShotExamples = loadJurisprudence(ruleName);
// Inject into prompt
const prompt = `
Rule: ${rule.description}
Examples of VALID violations:
${validExamples.map(e => `- ${e.code}`).join('\n')}
Examples of INVALID violations (false positives):
${invalidExamples.map(e => `- ${e.code} // because: ${e.reasoning}`).join('\n')}
Analyze this code...
`;
```

**Calibration effect over time:**

| Month | False Positive Rate | Cause |
|-------|-------------------|-------|
| Month 1 | 40% | Agent has no examples |
| Month 2 | 25% | 10 decisions recorded |
| Month 3 | 15% | 30 decisions recorded |
| Month 6 | 5% | 100+ decisions, agent "learned" |
| Year 1 | <2% | System is highly calibrated |

---

## Shadow Code: Analysis of Absence

> **The deepest insight:** A classic linter finds what's wrong. The real power is finding what's **absent** — the logical duplications, the missing abstractions, the "shadow code" that haunts the codebase.

### What is Shadow Code?

Shadow Code is code that **should exist as an abstraction but doesn't**. It manifests as:

1. **Semantic duplication** — 3 files that do the same thing with different names
2. **Missing patterns** — code that could use an existing abstraction but doesn't
3. **Conceptual debt** — when the description of the project grows but the intent stays the same

### Why It's Powerful

```
Classic Linter: "This file has a violation: UserManager uses 'Manager' suffix"
AI Linter: "This code is missing an abstraction: You have UserManager, OrderManager, ProductManager
           all doing CRUD with 80% identical code. Extract to a GenericCRUD<T> abstraction."
```

### Kolmogorov Complexity Signal

The system tracks **description length vs. intent**:

```typescript
interface ShadowCodeSignal {
  entityName: string;
  conceptualComplexity: number;  // How hard is it to describe?
  actualComplexity: number;        // How much code exists?
  gapRatio: number;               // conceptual / actual

  // If gapRatio < 0.5, code could be abstracted
  // If gapRatio < 0.3, code MUST be abstracted (debt)
}
```

### Shadow Code Detection Flow

```
1. Agent scans codebase
2. Groups code by semantic similarity (not file proximity)
3. For each group:
   ├─ Calculate Kolmogorov-like complexity signal
   ├─ If signal suggests duplication:
   │   ├─ Generate "Missing Abstraction" finding
   │   ├─ Calculate confidence
   │   └─ If confidence > 0.80 → Report as Shadow Code
   └─ If signal normal → Continue
```

### Shadow Code Example

```json
{
  "type": "shadow-code",
  "confidence": 0.87,
  "pattern": "CRUD operations with identical structure",
  "files": [
    "src/user/manager.ts",
    "src/order/manager.ts",
    "src/product/manager.ts"
  ],
  "suggestion": "Extract to GenericCRUD<T> abstraction",
  "estimatedSavings": "120 lines of duplicated code",
  "reasoning": "All three files have identical methods: create, read, update, delete with only type changes"
}
```

### Shadow Code in the Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                  SHADOW CODE DETECTION                       │
│                                                             │
│  Agent analyzes:                                            │
│  - Semantic clusters (what code does)                      │
│  - Dependency graph (who uses whom)                        │
│  - Complexity signals (is it compressible?)                │
│                                                             │
│  Output:                                                   │
│  - Missing abstractions                                    │
│  - Logical duplications                                    │
│  - Conceptual debts                                       │
│                                                             │
│  These become LEARNINGS (not violations)                   │
│  - No blame, no friction                                   │
│  - "Consider abstracting this"                             │
└─────────────────────────────────────────────────────────────┘
```

### Confidence-Based Routing for Shadow Code

| Confidence | Action | Comment Type |
|------------|--------|-------------|
| > 0.90 | Post as PR suggestion | "💡 Missing abstraction detected..." |
| 0.80-0.90 | Post as draft PR | "🤔 Consider reviewing this..." |
| < 0.80 | Log to shadow-code backlog | No comment, lead dev review |

---

## The Complete Feedback Workflow

```
Violation found (confidence: 0.92)
         │
         ├─≥ 0.85 → POST COMMENT
         │           │
         │           ├─ Dev agrees → VALIDATED
         │           │            └─ → Jurisprudence: valid example
         │           │
         │           └─ Dev disagrees → CONTESTED
         │                        └─ → Jurisprudence: invalid example
         │                        └─ → Dev explains why
         │
         └─< 0.85 → QUIET TASK
                     │
                     └─ Lead dev reviews
                     └─ Decision becomes Jurisprudence example

Shadow Code found (confidence: 0.87)
         │
         └─ ≥ 0.80 → POST SUGGESTION (not violation)
                     └─ "💡 Consider extracting..."
                     └─ No blame, just observation
```

---

## Linting Fatigue: The Calibration Score

> **The danger:** An uncalibrated AI linter finds 4000 "violations" and developers disable it.

### Confidence Thresholds

| Threshold | Meaning | Action |
|-----------|---------|--------|
| ≥ 0.90 | High confidence | Post comment |
| 0.85-0.90 | Medium confidence | Post with "verify" label |
| 0.80-0.85 | Low confidence | Quiet task for lead |
| < 0.80 | Too uncertain | Don't post, log only |

### Calibration Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                   CALIBRATION METRICS                        │
│                                                             │
│  Rule: no-generic-suffixes                                   │
│  ─────────────────────────────────                          │
│  Total violations reported: 47                              │
│  Validated by dev: 41 (87%)                                 │
│  Contested by dev: 6 (13%)                                  │
│                                                             │
│  Confidence distribution:                                    │
│  ████████████████████░░░░  ≥0.90 (35)                      │
│  ████████░░░░░░░░░░░░░░░  0.85-0.90 (8)                   │
│  ███░░░░░░░░░░░░░░░░░░░░░  0.80-0.85 (3)                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░  <0.80 (1)                      │
│                                                             │
│  False positive rate: 13%                                    │
│  Target: <10%                                               │
│  Status: ⚠️ Needs calibration                              │
└─────────────────────────────────────────────────────────────┘
```

### Anti-Linting-Fatigue Rules

1. **Never flood PRs** — Max 10 comments per PR for same rule
2. **Group intelligently** — 50 violations in 1 file = 1 comment
3. **Respect silence** — If dev doesn't respond, don't re-ping
4. **Prioritize** — Only block on high-confidence violations

---

## Rule Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      RULE LIFECYCLE                          │
│                                                             │
│  ┌─────────┐                                                │
│  │ draft   │ ← New learning, not yet active                │
│  └─────────┘                                                │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────┐                                                │
│  │ active  │ ← Enforced by bot                            │
│  └─────────┘                                                │
│       │                                                     │
│       ├─→ deprecated ← Rule no longer relevant             │
│       │                                                     │
│       └─→ paused ← Context-dependent, disabled by default │
└─────────────────────────────────────────────────────────────┘
```

### Status Definitions

| Status | Meaning | Enforcement |
|--------|---------|-------------|
| `draft` | Being discussed, not active | None |
| `active` | Approved, being enforced | Bot + CI |
| `deprecated` | No longer relevant | Warning only |
| `paused` | Disabled temporarily | None |

---

## Governance

### Who Can Create a Learning?

Anyone. Learnings are lightweight observations.

### Who Can Create a Rule?

Anyone, but requires approval:
- Self-service for rules with `enforcement: manual`
- PR review for rules with `enforcement: agent` or `enforcement: ast-grep`

### Who Can Modify a Rule?

PR approval required for any active rule change.

### Who Can Dismiss Feedback?

Team lead or rule author.

---

## Tooling Requirements

### Jurisprudence Storage

```bash
# Store a decision
jurisprudence add --rule no-generic-suffixes \
  --context "src/payment/stripe.ts:3" \
  --decision invalid \
  --reasoning "Standard Stripe pattern, exception"

# View jurisprudence for a rule
jurisprudence view no-generic-suffixes

# Export few-shot examples
jurisprudence export no-generic-suffixes --format prompt
```

### Shadow Code Backlog

```bash
# View shadow code findings
shadow-code list

# Promote to learning
shadow-code promote --id 001

# Dismiss (with reason)
shadow-code dismiss --id 001 --reasoning "Not applicable"
```

### Learning Management

```bash
# Create learning
learnings new "generic-suffixes-confusion"

# List learnings
learnings list --status candidate

# Promote to rule
learnings promote generic-suffixes-confusion
```

### Rule Management

```bash
# Enable rule
rules enable no-generic-suffixes

# Disable rule
rules disable no-generic-suffixes

# Add exception
rules add-exception no-generic-suffixes --pattern "EventHandler"

# Check rule status
rules status

# View calibration
rules calibration no-generic-suffixes
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|------------|
| Learning to rule time | <2 weeks | Timestamp diff |
| Rule coverage | >80% learnings enforced | Active rules / total learnings |
| False positive rate | <10% | Contested / violations |
| Jurisprudence examples | >50 per active rule | Count |
| Shadow code detections | >10/month | System finds opportunities |
| Developer satisfaction | >70% find useful | Survey |
| PRs with violations | <50% | Bot report |
| Violations fixed | >80% | Bot report |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|-------------|---------|----------|
| Rule without learning | Top-down rules people ignore | Start with learnings |
| Learning without rule | Discoveries never enforced | Review learnings periodically |
| Rule without enforcement | Lip service only | Activate in bot |
| Enforcement without feedback | One-way street | Always accept pushback |
| No confidence scoring | Spammy, ignored | Threshold at 0.85 |
| No Jurisprudence | Same errors forever | Learn from decisions |
| No Shadow Code | Only finds bad, not missing | Add analysis of absence |
| Too many rules | Noise, ignored | Prioritize, batch |

---

## Related Documents

- [Rule Engine Architecture](./rule-engine-architecture.md) — Technical enforcement with confidence scoring
- [GitHub Bot Design](./github-bot-design.md) — PR integration with quiet tasks
