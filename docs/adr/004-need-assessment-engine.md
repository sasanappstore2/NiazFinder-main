# ADR-004: Need Assessment Engine (NAE)

## Status

Accepted ? 2026-06-08

## Context

Intake today validates publish readiness with **rules-only** checks (`getPublishReadiness`, listing preview guards). That answers ?are required fields filled?? but not:

- Semantic coherence (deal type vs title, budget vs transaction)
- Location ambiguity (city/neighborhood unsaid or contradictory)
- Listing fidelity (generic titles, description quality)
- Richness / matchability for business matching

ADR-001 states AI must not be the sole publish gate. Product now requires a **hard assessment gate** with deterministic fallback when MLX is unavailable.

## Decision

Introduce **Need Assessment Engine (NAE)** as a layered scorer on top of existing intake:

```
canPublish = rulesReady.canPublish
          && assessment.canPublish
          && !hasBlockingGaps
```

### Layers (always-on rules)

| Layer | Responsibility |
|-------|----------------|
| RulesLayer | `getPublishReadiness` structural checks |
| CoherenceLayer | deal?title, budget?rent, category semantics |
| LocationLayer | city/neighborhood completeness & ambiguity |
| ListingFidelityLayer | preview title/description vs entities |
| RichnessLayer | need text depth, priorities, matchability |

### Optional MLX layer

- `POST /v1/assess` on intake-mlx for narrative gaps and Persian questions
- Merged as `provenance: hybrid` when MLX returns valid JSON
- On MLX failure: **rules-only fallback** ? `provenance: rules`, score capped at 85

### Thresholds (env)

| Variable | Default | Meaning |
|----------|---------|---------|
| `NEED_ASSESSMENT_MIN_SCORE` | 72 | Minimum score when MLX available |
| `NEED_ASSESSMENT_RULES_ONLY_MIN_SCORE` | 65 | Minimum score when MLX off / fallback |
| `NEED_ASSESSMENT_BLOCK_CONTRADICTIONS` | true | Any `contradiction` gap with block severity ? `canPublish=false` |

### API & UI

- `POST /api/intake/assess` ? full `NeedAssessmentReport`
- `POST /api/intake/assess-chat` ? hybrid single-question completion (wizard stays primary)
- Debounced reassess in wizard (`use-need-assessment`, 800ms)
- `NeedAssessmentPanel`, `AssessmentGapChip`, shard bar dimensions `coherence` + `listing`

### Publish integration

- Server: `validatePublishRequestOnServer` awaits `assessBeforePublish`
- Client: `validatePublishRequest` accepts optional cached `assessmentReport` from store

## Consequences

### Positive

- Publish blocked on real contradictions (e.g. ???+????? with ?????? title)
- Actionable Persian gaps with UI scroll targets
- MLX optional ? intake remains usable when sidecar is down

### Negative / risks

- Extra latency on publish (mitigated: debounce + rules-only path)
- Stricter UX ? mitigated by lower rules-only threshold (65 vs 72)
- ADR-001 tension ? **rules remain necessary**; assessment is additive, documented here

## Compliance with ADR-001

Rules layer is always evaluated first. MLX never overrides required-field failures. When `NEED_INTAKE_LLM_ENABLED=false`, NAE runs rules-only with separate threshold.

## References

- `src/contracts/need-assessment.ts`
- `src/intake/assessment/need-assessment-engine.ts`
- `docs/adr/001-intake-ai-strategy.md`
