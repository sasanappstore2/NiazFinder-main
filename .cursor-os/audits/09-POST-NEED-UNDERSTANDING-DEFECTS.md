# Audit 09 — `/post` Need-Understanding Defects

**Date:** 2026-07-12  
**Method:** Code-backed adversarial audit (single model; best-of-n aborted on usage limits)  
**Confidence:** ~88  
**Scope:** Persian need understanding quality — not Typesense browse

---

## Executive summary

Near-perfect understanding is blocked mainly by **silent geo mis-resolution**, **asymmetric confidence gates** (category gated, location/draft not), and **ambiguity detected but never blocking auto-apply**, while **goldens are too thin/loose** to catch regressions.

---

## Critical

### C1 — Location auto-apply has no confidence gate
- **Evidence:** `NeedIntakePanel` `onDraft` → `applyDetectedLocationFromDraft`; location-resolver can fill neighborhood at ~0.65 while `status: 'ambiguous'`.
- **Impact:** Wrong شهر/محله painted silently; matching/publish geo wrong.
- **Fix:** Gate location like category (≥0.85 / only `resolved`); never write when candidates ≥ 2.

### C2 — Auto-filled city re-scopes the next analyze
- **Evidence:** `intakeAnalyzeCityHint` uses `location.selectedCity` → `useIntakeIntelligence` citySlug/cityName.
- **Impact:** Wrong first city becomes confirmational bias for later entities.
- **Fix:** Pass only URL/user-locked city as analyze scope until lock or high-conf accept.

---

## High

### H1 — Category gate only blocks form leaf; draft always ingested
- `setNeedDraft(d)` unconditional; `applyCategorySlug` only if ≥0.85; template leaf can still fall back to draft entities.
- **Fix:** Strip below-gate category/dependent entities before draft write, or confidence-aware merge.

### H2 — Ambiguity resolved by picking a winner; UI never asks
- Engine emits candidates/gaps; live panel mounts no ambiguity prompts (by product choice).
- **Fix:** Prefer **refuse to write** when ambiguous (keep calm UX without chip theater).

### H3 — Dual-pipeline merge unused on draft path
- `mergeIntakeSources` feeds proposals only; `onDraft` bypasses; soft-fill may ignore `pickNeighborhoodSoftFill`.
- **Fix:** Route compose writes through merge + real source sig; fix or remove soft-fill.

### H4 — Overconfident defaults
- `?? 0.7/0.75/0.8`, hybrid city-disambig **0.82** hardcoded; registry override **0.78** &lt; UI 0.85.
- **Fix:** Ban inflated defaults; require evidence for conf ≥0.75; align override with 0.85.

### H5 — Golden/corpus gaps
- Hybrid 54 cases, substring asserts, 85% bar; rules-disambig only 4; corpus ≪ 1000.
- **Fix:** Exact leaf/city/hood expects; 100% on critical packs; adversarial ambiguity corpus.

---

## Medium

| ID | Issue |
|----|--------|
| M1 | Evidence chain optional; UI ignores evidence |
| M2 | Stale: chips hide on re-analyze; prior auto-fills remain |
| M3 | Threshold asymmetry (category 0.85 vs other fields 0.75 + ungated location) |
| M4 | Abort/new text doesn’t invalidate applied auto-fills |
| M5 | Governance: unsigned ADR-0006; panel complexity debt |

---

## Top 5 leverage fixes (ordered)

1. Location parity with category + no analyze re-scope from auto city  
2. Confidence-aware `setNeedDraft` (no below-gate category pollution)  
3. Ambiguity ⇒ **no write** (not necessarily new chips)  
4. Evidence-required high-conf writes; kill `??0.7+` inflation  
5. Harden goldens (exact asserts, critical 100%, Persian ambiguity cases)

---

## Product note (aligned with Freeze)

Calm compose UX (no ambiguity theater) remains valid **if and only if** the system **refuses to guess** when ambiguous. Silent wrong auto-apply is the real defect — not the absence of chips.

---

## Remediation status (2026-07-12)

| ID | Status | Evidence |
|----|--------|----------|
| C1 | Fixed | location-resolver refuse-to-write; `mayAutoApplyLocation` ≥0.85; `applyDetectedLocationFromDraft` gated |
| C2 | Fixed | `intakeAnalyzeCityHint` only URL / `cityLockedByUser` |
| H1 | Fixed | `sanitizeDraftForComposeAutoApply` before `setNeedDraft` |
| H2 | Fixed | ambiguity ⇒ strip / no write (no chip theater) |
| H3 | Fixed | `pickNeighborhoodSoftFill` wired; soft-fill min 0.85 |
| H4 | Fixed | no `??0.7+` on engine merge; registry override 0.85; city-disambig evidence |
| H5 | Fixed | rules golden 6/6 @ 100%; compose-auto-apply + calm-ux fixtures |
| M2/M3/M4 | Fixed | stale clear on refuse; unified thresholds in `compose-auto-apply.ts` |

RFC: [RFC-0004](../rfc/RFC-0004-compose-auto-apply-discipline.md)
