# Audit 10 — Compose Auto-Apply Baseline

**Date:** 2026-07-12  
**RFC:** [RFC-0004](../rfc/RFC-0004-compose-auto-apply-discipline.md) (Accepted)  
**Purpose:** Pre-remediation baseline for Audit 09 waves

| Script | Result |
|--------|--------|
| `test:intake-merge-policy` | PASS |
| `test:intake-location-priority` | PASS |
| `test:post-pipeline` | PASS (153/153) |
| `test:rules-disambiguation-golden` | PASS (4/4) |
| `test:intake-calm-ux` | FAIL — module missing (`src/intake/fixtures/run-intake-calm-ux-self-test.ts`) |
| `test:hybrid-intake-golden` | Skipped at baseline (optional LLM); run in Wave 4 |

## Notes

- Calm-ux script path in `package.json` is broken; Wave 4/5 may restore a minimal refuse-to-write self-test under a correct path.
- Proceeding to Waves 1–5 under RFC-0004.
