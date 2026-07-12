# Audit Loop Iteration 1 — P0 + Hybrid + Clarification

**Date:** 2026-07-12  
**Status:** Complete (gates green)

## Delivered

### P0
- `src/lib/need-intake/intake-merge-policy.ts` — dual-pipeline authority (intel draft > smart proposals; stale sig discard)
- Wired in `NeedIntakePanel` (proposal-only smart path + neighborhood soft-fill hint)
- `use-realtime-extraction` uses `shouldAcceptSmartResponse` (request id + compose guard)
- Self-test: `npm run test:intake-merge-policy` OK

### P1 hardening
- `/api/intake/smart-extract`: rate-limit, 12KB body cap, `useAI` default false
- Fixed `area` false-positive (`intake-field-answered.ts` — city alone ≠ area answered)
- Billion/million: `ملیون`/`ملیارد` aliases in `parse-persian-amount.ts`
- Neighborhood soft-fill via merge proposals in live summary

### Hybrid
- Env already hybrid-on in `.env.local`
- `hybrid-runtime.ts` + analyze meta `hybridRuntime` (fallback when LLM down)
- Category slug hints: motorcycle, lost-found, locksmith, clinic→office-rent, clothing bags
- **hybrid-golden: 54/54 (100%)** (was 50/54 / 92.6%)

### Clarification UX
- `IntakeGapClarificationPrompt` wired on compose from `intakeIntelligence.gaps`
- Preview CTA uses `getPublishReadiness` (aligned with publishValidator)
- `alignProgressWithPublishGate` helper on progress tracker

### Vertical expansion
- `test:vertical-expansion` — 8/8 (services, lost-found, motorcycle, clothing, jobs)

## Gate results (this iteration)

| Suite | Result |
|-------|--------|
| post-pipeline | 153/153 |
| post-estate-scenarios | 62/62 |
| hybrid-intake-golden | **54/54 (100%)** |
| intake-merge-policy | OK |
| hybrid-runtime | OK |
| vertical-expansion | 8/8 |
| publish-validator | 4/4 |
| intake-progress-tracker | OK |
| smart-intake-smoke | 3/3 |

## Next loop tick
- Expand live 130-case accuracy toward ≥80% category
- Slim NeedIntakePanel (doc/product conformance)
- Monitor hybrid LLM health in production
