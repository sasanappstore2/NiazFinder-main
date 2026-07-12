# RFC-0004 — Compose Auto-Apply Discipline

| | |
|---|---|
| **Status** | **Accepted** |
| **Date** | 2026-07-12 |
| **Author** | Cursor agent (Audit 09 remediation) |
| **Approver** | Product (plan implement approval) |
| **Related** | Architecture Freeze v1 · Audit 09 · PHASE-03 Need Engine (bugfix under Freeze) |

## Problem

Compose auto-applies location and draft fields without parity to the frozen category gate (≥0.85). Ambiguous geo can write at ~0.65; auto city re-scopes the next analyze; weak category still pollutes `NeedDraft`. Calm UX (no chip theater) is frozen — silent wrong guesses are the defect.

## Decision

1. **Location parity:** Auto-apply city/neighborhood only when confidence ≥ **0.85**, status is `resolved` (not ambiguous), and candidates &lt; 2.
2. **Analyze city scope:** Pass only URL/`initialCity` or user-locked city to intelligence analyze — never auto-filled city.
3. **Confidence-aware draft write:** Strip category (and dependent leaf entities) below ≥0.85 before `setNeedDraft`; critical ambiguous fields are omitted (refuse-to-write).
4. **Ambiguity ⇒ no write** on critical fields (category, city, neighborhood). No reintroduction of verify/gap/location ambiguity prompt theater.
5. **No inflated defaults:** Ban using `?? 0.7+` to mint high confidence for auto-apply paths; registry override for auto-apply aligns to **0.85**; high-conf writes (≥0.75) should carry evidence when available.
6. **Goldens:** Critical ambiguity packs assert exact leaf/city/hood (or assert *no* write) at **100%**.

## Non-goals

- Reintroducing ambiguity/verify UI chips
- Lowering category auto-apply below 0.85
- Full Knowledge Model registry rewrite (Phase 02)
- Corpus 1000 expansion

## Freeze compliance

Extends existing immutable decision (category ≥0.85 + calm compose) to location/draft without changing architecture boundaries. Does not make LLM publish authority. Does not use Typesense for NLP.

## Implementation waves

See plan *Post Understanding Loop* and Audit 09. Exit when C1–C2 + H1–H5 remediated with green regression pack.

## Acceptance tests

- `test:intake-merge-policy`
- `test:post-pipeline`
- `test:intake-location-priority`
- `test:rules-disambiguation-golden`
- `test:intake-calm-ux`
- Adversarial refuse-to-write fixtures (new)
