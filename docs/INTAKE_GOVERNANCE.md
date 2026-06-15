# Intake Autonomous Quality & Governance

**Release tag:** `intake-governance-v1` (Phase 50)

## Enable

```bash
INTAKE_GOVERNANCE_ENABLED=true
INTAKE_AUTO_MOD_PASS_THRESHOLD=70
INTAKE_AUTO_MOD_CONFIDENCE_MIN=0.75
INTAKE_MODERATION_SLA_HOURS=24
INTAKE_CANARY_NEED_TYPES=experimental-need-type
INTAKE_PUBLISH_ANOMALY_Z_THRESHOLD=3
INTAKE_CONFORMANCE_RECERT_DAYS=90
```

## Components

| # | Module | Role |
|---|--------|------|
| 50.1 | `intake-auto-moderation-policy.ts` | Confidence thresholds for auto-approve |
| 50.2 | `intake-moderation-sla.ts` | Human review queue SLA (default 24h) |
| 50.3 | `intake-quality-feedback-loop.ts` | Quality score ? threshold suggestion |
| 50.4 | `intake-partner-api-audit-log.ts` | Public API audit trail |
| 50.5 | `docs/rfc/SCHEMA_GOVERNANCE_BOARD.md` | Schema change governance |
| 50.6 | `intake-canary-publish-policy.ts` | Force review for canary needTypes |
| 50.7 | `intake-publish-anomaly-detector.ts` | Velocity spike detection |
| 50.8 | `GET /api/super-admin/intake-governance` | Usage + SLA dashboard |
| 50.9 | `intake-conformance-recertification.ts` | Quarterly partner recert |
| 50.10 | `intake-governance-release.ts` | Release registry + year-5 retro |

## Publish flow (wired)

```
publish route / v1 publish
  ? resolveIntakeGovernancePublish()
      ? anomaly check
      ? canary hold
      ? quality feedback
  ? ServiceRequest create
  ? enqueueRequestModerationJob (if not auto-approved)

internal/request-moderation
  ? evaluateRequestModeration()
  ? passesIntakeAutoModerationGate()
```

## Dashboard

`GET /api/super-admin/intake-governance` returns moderation SLA, partner audit summary, quality feedback, and recert status.

## Tests

```bash
npm run test:intake-governance
npm run verify:intake-phase -- --phase 50
npm run verify:intake-all-phases
```
