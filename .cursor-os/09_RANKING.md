# 09 — Ranking & Matching

## Current truth

Business ranking for a need is **deterministic rules**, not an ML ranker:

```ts
// src/lib/need-match/rank-businesses.ts
matchBusinessesForNeed(need, limit) → { businesses, source: 'rules' }
```

Pipeline:

1. Build `NeedMatchContext` from request (`buildNeedMatchContextFromRequest`)
2. `findCandidateBusinesses` (category/city/filters/distance candidates)
3. `toMatchedBusinessItems` ordered scores + Persian match reasons
4. VIP / lead qualification applies wallet + caps (`src/lib/smart-matching/business-matching.ts`)

---

## Smart-matching module

| File | Role |
|------|------|
| `business-matching.ts` | VIP qualify loop |
| `wallet-lead-fee.ts` / `env.ts` | Fee + min score + caps |
| `vip-broadcast.ts` / `send-vip-lead.ts` / `enqueue-vip-broadcast.ts` | Outreach |
| `need-visibility.ts` / `need-resolution.ts` / `need-chat-session.ts` | Access phases |
| `trust-score.ts` | Trust signals |
| `api-helpers.ts` / `errors.ts` | API glue |

Queue: `RABBITMQ_ROUTING_MATCHING` / `MATCHING_QUEUE` when Rabbit enabled.

---

## Qualification gates (VIP)

A business qualifies only if roughly:

- Match score ≥ `getLeadMinMatchScore()`
- Not the need owner
- Profile `ACTIVE` and lead alerts enabled
- Wallet available balance ≥ lead fee
- Private lead count under max

Tune via env helpers in `smart-matching/env.ts` — changing economics needs product/ADR care.

---

## Score semantics

- `matchScore` / `qualifyScore` — numeric
- `matchReasonFa` — Persian explanation for UI
- Source tagged `'rules'` today

**Target state (roadmap):** optional ML re-rank or Typesense-assisted candidate gen — requires RFC/ADR; do not silently swap.

---

## Relationship to Typesense

Typesense powers **business marketplace browse** (`/b/…`), not the core need→business lead ranker. Do not conflate browse sort (`rating|newest|name|popular`) with need match scores.

---

## Tests

- `test:smart-matching-stress` (+ `:direct` variant)
- Domain unit paths under need-match / smart-matching fixtures if present
- Wallet tests when fee logic changes

---

## Change checklist

- [ ] Keep reasons explainable in Persian
- [ ] Do not charge wallet without existing fee helpers
- [ ] Preserve owner exclusion
- [ ] Document env knobs
- [ ] Stress test for regressions
