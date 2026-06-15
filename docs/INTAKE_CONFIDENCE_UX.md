# Confidence-Driven Intake UX (Phase 33)

When AI extraction confidence is high, the location wizard hides already-filled fields so users see fewer redundant inputs.

## Behavior

| Signal | UX |
|--------|-----|
| Filled field + confidence ? skip threshold | Field hidden in location step |
| Missing field + low confidence | Higher priority in `missingFields` via `prioritizeMissingFieldsByConfidence` |
| Category confidence < 0.65 | `CategoryConfidenceBadge` + optional category suggestion chips |
| Ambiguous city/neighborhood | Single `IntakeLocationAmbiguityPrompt` question |

## Threshold

Default skip threshold: **0.75** (`NEXT_PUBLIC_INTAKE_CONFIDENCE_SKIP_THRESHOLD`).

A/B variants (`NEXT_PUBLIC_INTAKE_CONFIDENCE_AB_VARIANT`):

- `low` ? 0.6 (show fewer fields)
- `high` ? 0.85 (show more fields)

Low-confidence chip threshold: **0.65** (`INTAKE_LOW_CONFIDENCE_THRESHOLD`).

## Key modules

- `src/intake/scoring/confidence-driven-fields.ts` ? skip logic + missing-field boost
- `src/lib/need-intake/intake-confidence-config.ts` ? threshold + A/B flags
- `src/lib/need-intake/intake-confidence-metrics.ts` ? telemetry payload
- `src/hooks/use-intake-location-step.ts` ? orchestrator wiring

## Telemetry

Event: `intake_confidence_snapshot` (when location step visibility changes).

Payload: `visibleFieldCount`, `totalFieldCount`, `reductionPct`, `threshold`, per-field confidence.

## Verification

```bash
npm run test:intake-confidence
npm run verify:intake-phase -- --phase 33
npx tsc --noEmit
```

## Phases 31?33 retro

| Phase | Deliverable |
|-------|-------------|
| 31 | AI provider facade (`getDefaultIntakeAiProvider`) |
| 32 | `reconcileAnalysis` + user locks + LRE finalize |
| 33 | Confidence-driven field visibility + ambiguity UX |
