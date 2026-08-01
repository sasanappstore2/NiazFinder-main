# Operationalization Roadmap — Cognitive Change Log (CGP A1 records)

**Status: Permanent, append-only change records per RFC-005 §10 (artifact A1). This is the first
document written under the CGP regime — the roadmap directive that commissioned this work is
treated as the owner's approval (A7-equivalent) for the changes below, and as the ADR-070
unfreeze approval for the specific flagged amendments each milestone names. Architecture remained
frozen: every change traces to an existing RFC section/ADR/audit finding; zero new architecture
was invented. No contradiction requiring an Architecture Decision Report was encountered.**

Change IDs follow RFC-005 §4. All six changes share one commission (the Operationalization
Roadmap) and one serialized author; they were implemented in strict dependency order.

---

## CGC-2026-001 — Persist Release Gate verdicts (M1)

- **Surface:** platform (CCQS I/O). **CIF issues:** closes Conformance Audit debt **T1/finding D1**.
- **Traces:** CCQS §1.6/§6 (versioned, immutable-once-published gate policies); RFC-005 §17 MEI-01
  ("an unpersisted verdict is no verdict"); CGP §11 (A6 as the canonical lineage join point).
- **Change:** new I/O module [persist-gate-verdict.ts](../src/ccqs/gate/persist-gate-verdict.ts)
  — get-or-create `CcqsGatePolicy` row (frozen thresholds; loud failure on in-place tampering),
  append-only `CcqsGateVerdict` insert — wired into the replay CLI. No UPDATE path exists.
- **Verification (real DB):** derived verdict for run `cmrc8md8x…` = `warn` (matches the V2
  report); persisted; joins resolve (policy `default-v1@1.0.0` ↔ engine
  `…prod-readiness-1`/rules `1.1.0` ↔ dataset `golden-dataset@v1`); policy row unique under
  repeated persists; tampered-policy tripwire rejects loudly. Verdict rows now exist for the
  historical V2 run (decidedAt = persistence time — a new decision event; history not fabricated).

## CGC-2026-002 — Runtime run-integrity guards (M2)

- **Surface:** platform (CCQS CLIs). **Traces:** CIF-INV-06/07 (RFC-004 §26); RFC-005 §17
  MEI-02/03; Replay Determinism Audit §3 ("an incomplete or drifted run is indistinguishable from
  a clean one" — the audit's central pattern, now distinguished at the only point CGP controls).
- **Change:** pure guard module [run-integrity.ts](../src/ccqs/gate/run-integrity.ts)
  (`checkRunCompleteness`, `checkDatasetRefEquality`) + wiring: replay CLI refuses gate evaluation
  on undisclosed skips (exit 2; `--disclose-skips` acknowledges explicitly); compare CLI refuses
  cross-`datasetRef` comparison (exit 2).
- **Verification:** 5/5 guard predicates correct; real compare invocation over the V1/V2 pair
  prints `[MEI-03] OK` and proceeds.

## CGC-2026-003 — PVW runtime (M3)

- **Surface:** platform (new `src/ccqs/pvw/` modules — the placement PVW §0 recommended) + one
  approved frozen-surface amendment. **Traces:** PVW §2.1 (two pillars), §2.2 (module set), §2.3
  (windowSpecVersion/alertPolicyVersion), §4 (deterministic trends, explicit `asOf`), §5 (alert
  policy, append-only alert store), §2.4 (shadow version stamping — **flagged amendment #1,
  approved by the roadmap directive**, closes gap **G4**). Closes gaps **G1, G3, G6, G7, G9**
  (G2's per-category/city breakdowns remain open — a flagged amendment NOT exercised by this
  roadmap, since it changes `QualityMetricSnapshot`'s frozen shape; recorded as remaining debt).
- **Change:** `CcqsMetricSnapshot` + `CcqsAlertEvent` tables (append-only; migration
  `20260709090000_pvw_metric_snapshots_and_alerts`, applied via targeted `prisma db execute`
  because `db push` would have dropped the out-of-schema `regional_filings` table with 3,605 live
  rows — refused); pure modules `types.ts`/`bucket-production-metrics.ts` (agreement metrics,
  never "accuracy" — PVW §2.1's naming discipline)/`detect-trends.ts`/`evaluate-alerts.ts`
  (policy `pvw-default@1.0.0`, six alerts per PVW §5); I/O `pvw-io.ts`; CLIs
  `pvw-scheduled-replay.ts` (Pillar A — first real `triggeredBy:'scheduled'` caller) and
  `pvw-production-window.ts` (Pillar B); route stamp `engineVersion` on shadow events.
- **Verification:** 25/25 pure self-tests (`test:ccqs-pvw`); Pillar B end-to-end with a real
  LLM-backed stamped event (raw/usable/excluded counts honest — the 41 pre-SEE-rewire events
  correctly read as "41 raw, 0 usable"); Pillar A validated by CGC-2026-004's replay run (one run
  serves both, by design).

## CGC-2026-004 — Location catalog axis + determinism fixes (M4)

- **Surface:** engine + infrastructure. **Traces:** Replay Determinism Audit §6 (D-narrow items
  1–3); RFC-004 §30 (locationCatalogVersion adoption); RFC-005 §17 MEI-04 (version bumps below).
- **Change:** (a) rule packs load in sorted filename order (`registry.server.ts` — always-correct,
  no mode); (b) location catalog query fully ordered at every nesting level
  (`location-fuse-index.ts` — always-correct); (c) new `LOCATION_CATALOG_VERSION` axis
  (`location-catalog-version.ts`), carried in the manifest through the **existing**
  `ontologyVersions` namespace map (`location-catalog: 1.0.0+db|+json-fallback` — source is part
  of catalog identity, per the audit's fallback finding) — zero frozen-schema change; (d)
  production/replay execution split for LLM sampling: `COGNITIVE_REPLAY_DETERMINISTIC=true`
  (replay CLIs only) pins temperature 0 + seed 42; production sampling untouched at 0.1.
- **Version bumps (MEI-04):** `RULES_REGISTRY_VERSION` 1.1.0 → **1.1.1** (patch: assembly order
  only, zero rule-content change); `ENGINE_VERSION` → **cognitive-engine-v1-phase4-ops-1**.
- **Verification:** tsc clean; grounding 2/2, decision 5/5, conformance 12/12, PVW 25/25; all 13
  production-readiness trace cases byte-consistent with the V2-era state (the two `[CHECK]` rows
  are inv-23 and inv-26 — the documented lateral move and Root Cause E, whose script expectations
  were stale at V2 time too; not regressions). Full-dataset validation: the CGC-2026-003/004
  scheduled ReplayRun (result recorded in Conformance Audit v2 upon completion).

## CGC-2026-005 — Replay Verification, INV-17 (M5)

- **Surface:** platform (new CLI; zero DB writes — grep-verifiable). **Traces:** SEE §16.1's
  second operation + INV-17 verbatim (recompute with pinned versions, diff, log to a **separate
  audit channel** — `reports/replay-verification-*.json` + stdout — never the primary event
  store); SEE §16.4 (a divergence is a determinism bug, exit 1); SEE §16.5 (pinned-version
  precondition enforced: records whose versionStamp differs from the current build report
  `version-vintage-mismatch` and are skipped, never silently verified against the wrong engine).
- **Change:** [replay-verification.ts](../scripts/ccqs/replay-verification.ts)
  (`npm run ccqs:verify-replay -- <runId>`): reconstructs both snapshots verbatim from each stored
  report's embedded field values, re-executes `compareSnapshots` + `applyScoringPolicy` with the
  original reportId/comparedAt, demands **byte-identity** (stable-stringify).
- **Verification — a platform first:** executed against the real V2 run `cmrc8md8x…`:
  **33/33 records byte-identical** (Layer 1 AND Layer 2), 0 divergent, 0 vintage-mismatched.
  SEE INV-01/INV-07 are now empirically proven on real historical records — previously only
  asserted (Conformance Audit v1 had classified INV-17 "Missing (in practice)" and INV-07
  "Partial"; both rows improve in Audit v2).

## CGC-2026-006 — CI wiring (M6)

- **Surface:** infrastructure (CI). **Traces:** RFC-005 §18/ADR-079 (automation implements
  mechanical duties, acquires no authority — zero governance-rule changes in this milestone);
  ADR-075 (these jobs block, never approve); RFC-005 §17 (the six diff-predicate MEIs).
- **Change:** [mei-guards.ts](../scripts/ci/mei-guards.ts) — MEI-04 (engine diff ⇒ version-axis
  bump), MEI-05 (instrument/engine path disjointness), MEI-08 (no UPDATE/DELETE against
  Historical Record tables), MEI-09 (insulation-file diff ⇒ determinism re-audit artifact),
  MEI-10 (dataset: no caseId removal, mandatory reasons), MEI-11 (threshold change ⇒ new
  policyVersion) — plus [cognitive-governance.yml](../.github/workflows/cognitive-governance.yml)
  running the guards + all 12 pure (no-DB, no-LLM) self-tests on PRs touching governed paths.
  Golden replay/gate deliberately stay on the local/scheduled CLIs (they need the LLM sidecar and
  project Postgres) — exactly the split RFC-005 §18's table prescribes.
- **Verification:** empty diff → 6/6 OK; the last pre-governance historical commit → correctly
  **BLOCKED** on MEI-04 (engine paths without a version bump — true of that commit's era). Both
  the pass path and the block path are demonstrated, not assumed.

---

## Remaining debt after this roadmap (honest close-out)

- **G2** (per-category/per-city metric breakdowns) — requires the flagged `QualityMetricSnapshot`
  shape amendment; not approved by this roadmap; still open.
- **MEI-12** (alert→issue SLA) — evaluable only once alerts flow on a schedule; the store and
  evaluator now exist, the standing monitor does not (invocation scheduling is deployment infra,
  PVW §2.2).
- **Rules-pack bloat / legacy-pack dedup (T5), publish schema mismatch (T8), multi-objective
  needs (T10)** and the rest of Audit v1's register — untouched by design: this roadmap closed
  *operational* debt only.

*Append-only: corrections to this log are new entries, never edits (CIF-INV-01).*
