---
title: "ADR-0004: Deterministic rules ranking for need→business match"
date: 2026-07-12
status: accepted
supersedes: []
superseded_by: null
---

# ADR-0004: Deterministic rules ranking for need→business match

## Context

After a need is published, businesses must be ranked for leads / VIP broadcast. Typesense already ranks **browse** by rating and text. Lead matching needs explainable Persian reasons and wallet/fee gates.

## Decision

1. Need→business matching uses **deterministic rule ranking** (`matchBusinessesForNeed` → `source: 'rules'`).
2. VIP qualification applies min score, wallet balance, private lead caps, active profile, alerts enabled.
3. Typesense is **not** the lead ranker (browse ≠ match).
4. ML / embedding re-rank is out of scope until a future RFC/ADR.

## Consequences

### Positive

- Testable, explainable (`matchReasonFa`)
- Independent of Typesense uptime for matching core
- Clear fee/qualify gates

### Negative / risks

- Recall/precision limited by candidate query rules
- Manual tuning of weights/thresholds

### Rollback

Revert ranking code; keep fee env defaults documented.

## Alternatives considered

| Option | Why not (now) |
|--------|----------------|
| Typesense-only match | Wrong document semantics; neighborhood gap |
| Pure LLM match | Non-deterministic; cost; hard CI |

## Implementation notes

- `src/lib/need-match/rank-businesses.ts`
- `src/lib/smart-matching/*`
- OS: `09_RANKING.md`

## Validation

- `test:smart-matching-stress`
- Manual qualify path with insufficient wallet excludes business
