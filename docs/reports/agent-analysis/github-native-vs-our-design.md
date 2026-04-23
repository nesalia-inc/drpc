# GitHub Native Code Quality vs Our Architecture

## Executive Summary

GitHub's native Code Quality feature is a powerful foundation — but it focuses on **reliability and maintainability** via CodeQL (security-style analysis). Our architecture addresses a **different problem space**: custom code quality rules for naming conventions, entity-oriented design, and domain logic that go beyond what static analysis can detect.

**Key insight:** GitHub + our custom rule engine = complementary, not competitive.

## What GitHub Already Does

### Core Capabilities (April 2026)

| Feature | Description |
|---------|-------------|
| **CodeQL Analysis** | Detects reliability/maintainability issues in Java, C#, Python, JS, Go, Ruby |
| **AI Analysis** | Analyzes recent pushes to default branch (language-agnostic) |
| **Bot Comments** | Posts from `github-code-quality[bot]` with Copilot autofix |
| **Scores** | Reliability + Maintainability (0-100 style) |
| **Rulesets** | Can block PRs based on quality thresholds |
| **Org Dashboards** | Aggregate view across repos |
| **Copilot Agent** | Can assign remediation work (requires license) |

### Metrics System

```
Excellent: No findings
Good: ≥1 Note
Fair: ≥1 Warning
Needs Improvement: ≥1 Error
```

### What It Doesn't Do

- Custom naming rules (no-generic-suffixes)
- Entity-oriented naming patterns
- Cross-file semantic clustering
- Learning from developer feedback
- Confidence scoring for uncertain findings
- Shadow code detection (missing abstractions)

## The Gap Analysis

### What We Do That GitHub Doesn't

| Capability | GitHub | Our Design | Why It Matters |
|------------|--------|------------|----------------|
| **Custom Naming Rules** | ❌ | ✅ | CodeQL doesn't detect "Manager" suffix as violation |
| **Graph-RAG Context** | ❌ | ✅ | Detects patterns across files, not just within |
| **Confidence Scoring** | ❌ | ✅ | Prevents linting fatigue (0.80-0.85 → quiet task) |
| **Jurisprudence** | ❌ | ✅ | System learns from every dev decision |
| **Shadow Code** | ❌ | ✅ | Finds *missing* abstractions, not just violations |
| **Temporal Logic** | ❌ | ✅ | Detects sequences (tx open → no external calls) |
| **Game Theory Reputation** | ❌ | ✅ | Rule weights adjust based on TP/FP rate |
| **Quiet Tasks** | ❌ | ✅ | Lead dev review for low-confidence findings |

### Where GitHub Excels

1. **Security Vulnerabilities** — CodeQL is best-in-class for CVE detection
2. **Copilot Autofix** — One-click fixes for detected issues
3. **Scale** — Org-wide dashboards and rulesets
4. **Zero Setup** — One-click enablement
5. **CI Integration** — Native Actions integration

### Where We Add Value

1. **Domain Logic** — Rules that CodeQL can't express (naming conventions)
2. **Cross-File Patterns** — Graph-RAG detects duplication across unrelated files
3. **Adaptive Learning** — Jurisprudence makes the system smarter over time
4. **Uncertainty Handling** — Quiet tasks instead of noisy comments
5. **Missing Abstraction Discovery** — Shadow Code finds logical debt

## Complementary Integration

Instead of replacement, our system should **integrate with GitHub Native**:

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHub CODE QUALITY                        │
│                  (CodeQL + Copilot Autofix)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 OUR CUSTOM RULE ENGINE                       │
│              (docs/rules/ → agent-based analysis)            │
│                                                             │
│  Graph-RAG Context                                          │
│  Confidence Scoring                                         │
│  Jurisprudence Feedback                                     │
│  Shadow Code Detection                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SARIF + BOT COMMENTS                       │
│              (github-code-quality[bot] posts)               │
└─────────────────────────────────────────────────────────────┘
```

### Unified SARIF Upload

Both GitHub's findings and our custom rules can upload to SARIF:

```yaml
# GitHub Action: Upload both sources
- name: Upload Code Quality SARIF
  uses: github/code-scanning-action@v4
  with:
    sarif_file: combined-findings.sarif
    category: "code-quality"
    upload: always

- name: Upload Custom Rules SARIF
  uses: github/code-scanning-action@v4
  with:
    sarif_file: custom-rules.sarif
    category: "custom-rules"
    upload: always
```

### Comment Strategy

| Finding Type | Source | Posted By |
|-------------|--------|-----------|
| Security/CVE | CodeQL | github-code-quality[bot] |
| Reliability issues | CodeQL | github-code-quality[bot] |
| Custom violations | Our engine | @deesse-code-quality (GitHub App) |
| Shadow Code | Our engine | @deesse-code-quality (suggestion, not violation) |
| Quiet Tasks | Our engine | GitHub Issue (assigned to lead) |

## Integration Architecture

### GitHub App vs Native Bot

| Aspect | GitHub Native | Our GitHub App |
|--------|--------------|----------------|
| **Attribution** | github-code-quality[bot] | Custom app (@deesse-code-quality) |
| **Permissions** | Granular | Full control |
| **Custom Rules** | Limited | Full flexibility |
| **Confidence Routing** | ❌ | ✅ |
| **Jurisprudence** | ❌ | ✅ |

**Recommendation:** Use both — GitHub Native for security/reliability, our app for custom code quality rules.

### Unified Dashboard Concept

```
Security and Quality Tab
├── Standard Findings (CodeQL)
│   ├── Reliability Score
│   └── Maintainability Score
│
├── Custom Rules (Our Engine)
│   ├── Naming violations
│   ├── Entity patterns
│   └── Shadow code suggestions
│
└── Code Quality Rating
    └── Combined: GitHub + Our Rules
```

## What We Should NOT Duplicate

GitHub already handles:
- ✅ CodeQL rule execution
- ✅ Copilot autofix
- ✅ Basic PR comments
- ✅ Org-wide dashboards
- ✅ Rulesets and blocking

**We should focus on what GitHub can't do:**
- ❌ Custom naming rules
- ❌ Graph-RAG context
- ❌ Jurisprudence learning
- ❌ Shadow code detection
- ❌ Confidence-based routing

## Strategic Recommendation

### Phase 1: Augment, Don't Replace
- Keep GitHub Code Quality enabled
- Add our custom rule engine as supplementary analysis
- Both upload to SARIF, appear in Security tab

### Phase 2: Unified Experience
- Our bot handles custom rules only
- GitHub bot handles standard findings
- Unified summary comment combining both

### Phase 3: Advanced Features
- Graph-RAG cross-file analysis (GitHub doesn't have this)
- Jurisprudence learning (GitHub doesn't have this)
- Shadow code discovery (GitHub doesn't have this)

## Architecture Comparison

### GitHub Native Flow

```
PR opened → CodeQL scan → Findings → SARIF → Security tab
                               │
                               ▼
                    github-code-quality[bot]
                               │
                               ▼
                       PR comment (with autofix)
```

### Our Architecture (Complementary)

```
PR opened → GitHub CodeQL scan → Standard findings
    │
    └─→ Our Rule Engine
            │
            ├─ Graph-RAG context
            ├─ Confidence scoring
            ├─ Custom rule analysis
            └─ Jurisprudence injection
                    │
                    ▼
            Combined SARIF + Bot comments
                    │
                    ▼
            Quiet tasks for uncertain findings
            Shadow code suggestions
```

### Combined Flow (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                        PR OPENED                             │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   GitHub Code Quality    │   │   Our Custom Rules      │
│   (CodeQL + Copilot)     │   │   (docs/rules/ engine) │
│                          │   │                         │
│  - Security vulns        │   │  - Naming conventions   │
│  - Reliability issues    │   │  - Entity patterns     │
│  - Copilot autofix        │   │  - Shadow code          │
│  - Maintainability        │   │  - Graph-RAG context    │
└─────────────────────────┘   └─────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌─────────────────────────┐
                │   COMBINED SARIF UPLOAD │
                │   (unified in Security) │
                └─────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ github-code-quality[bot] │   │ @deesse-code-quality    │
│ (standard findings)      │   │ (custom rules)          │
└─────────────────────────┘   └─────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                ┌─────────────────────────┐
                │   UNIFIED SUMMARY       │
                │   (single PR comment)   │
                └─────────────────────────┘
```

## Conclusion

GitHub's Code Quality is a solid **foundation, not a complete solution** for our needs:

| Dimension | GitHub | Our Design | Verdict |
|-----------|--------|------------|---------|
| Security/CVE | ✅ Best-in-class | Not our focus | Use GitHub |
| Custom rules | ❌ Limited | ✅ Full flexibility | Use ours |
| Cross-file analysis | ❌ File-level | ✅ Graph-RAG | Use ours |
| Learning from feedback | ❌ | ✅ Jurisprudence | Use ours |
| Autofix suggestions | ✅ Copilot | ❌ Manual | Use GitHub |
| Naming conventions | ❌ | ✅ Custom rules | Use ours |

**The winning strategy:** Enable GitHub Code Quality for security/reliability, add our custom rule engine for domain-specific code quality rules.

---

## Related Documents

- [GitHub Bot Design](./github-bot-design.md) — Our bot architecture
- [Rule Engine Architecture](./rule-engine-architecture.md) — Technical implementation
- [Rule Lifecycle Pipeline](./rule-lifecycle-pipeline.md) — Jurisprudence and Shadow Code