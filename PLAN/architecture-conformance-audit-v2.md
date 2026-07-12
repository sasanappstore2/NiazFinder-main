# Architecture Conformance Audit — Version 2

**Status: Permanent audit document, successor to
[architecture-conformance-audit-v1.md](architecture-conformance-audit-v1.md) (which remains
byte-untouched, per the report-series discipline). Produced immediately after the
Operationalization Roadmap's implementation (change records: CGC-2026-001…006 in
[operationalization-change-log.md](operationalization-change-log.md)). This is a DELTA audit: it
re-verifies every v1 row the roadmap touched and re-renders the verdict; v1 rows not restated
here stand unchanged. Evidence tags follow v1's convention — `[empirical]` rows below cite real
run/row IDs produced during this cycle, not projections.**

---

## 1. Per-milestone conformance deltas

### After M1 — Gate verdict persistence (CGC-2026-001)

| v1 row | v1 status | v2 status | Evidence |
|---|---|---|---|
| CCQS §1.6 (gate policy: named, versioned, immutable rows) | Differently + Partial — tables never written/read (finding **D1**) | **Implemented** | `[empirical]` `CcqsGatePolicy` row for `default-v1@1.0.0` created once, reused across persists; tampering with in-code thresholds against the frozen row fails loudly (tripwire tested); `CcqsGateVerdict` rows exist and join to run/manifest/dataset |
| Debt **T1** (Critical) | Open | **Closed** | Same |
| Dead architecture **D1** | Dead | **Alive** | Same |

### After M2 — Run-integrity guards (CGC-2026-002)

| v1 row | v1 status | v2 status | Evidence |
|---|---|---|---|
| Replay skip handling ("complete runs distinguishable from incomplete") | Missing | **Implemented** | Replay CLI refuses gate evaluation on undisclosed skips (exit 2); `--disclose-skips` is the explicit acknowledgment path; scheduled runs never self-disclose (an unattended dirty run is a signal, not a judgment call) |
| `compareReplayRuns` datasetRef assumption (Audit v1 §3 row 5) | Not checked | **Checked** | `[empirical]` compare CLI prints `[MEI-03] OK` on the V1/V2 pair; mismatched refs exit 2 before any numbers print |
| Debt **T3** (High) | Open | **Closed** at the CLI enforcement point | CGP MEI-02/03 now have real executors |

### After M3 — PVW runtime (CGC-2026-003)

| v1/PVW item | Before | After | Evidence |
|---|---|---|---|
| **G1** (no production signal into CCQS) | Missing | **Runtime closed** — Pillar B bucketer + snapshot store + alert evaluator exist and ran against real data | `[empirical]` bucket run over 2026-07-07 honestly reported "41 raw, 0 usable" (pre-SEE-rewire events); a real LLM-backed stamped event flowed route-sequence → reader → bucketer with agreement metrics computed |
| **G3** (no time dimension) | Missing | **Closed** — `CcqsMetricSnapshot` time series + deterministic trend detector (explicit `asOf`; input-order-insensitive, verified) | `[self-test]` 25/25 incl. determinism-under-reordering and asOf-exclusion checks |
| **G4** (unstamped shadow events) | Missing | **Closed** — publish route stamps `engineVersion{label, cognitive, rules, comparator}` (approved PVW §2.4 amendment) | `[empirical]` stamped event read back with label `cognitive-engine-v1-phase4-…+rules-…` |
| **G6** (no metrics cache) | Missing | **Closed** — append-only Derived-View cache table, pillar-discriminated | `[empirical]` golden + production rows exist |
| **G7** (no alerting) | Missing | **Mostly closed** — versioned alert policy (`pvw-default@1.0.0`), pure evaluator (6 alerts per PVW §5), append-only `CcqsAlertEvent` store. The *standing scheduler* that invokes it is deployment infrastructure, out of scope by PVW §2.2's own design | `[self-test]` fire/no-fire/floor-suppression paths all tested |
| **G9** (`'scheduled'` never used) | Dead | **Alive** | `[empirical]` run `cmrdv8t8c0002s5is500hwgat` has `triggeredBy: 'scheduled'` |
| **G2** (per-category/city breakdowns) | Missing | **Still missing — by decision, not omission**: requires the flagged `QualityMetricSnapshot` shape amendment, which this roadmap did not approve | Remains the top open PVW gap |
| CCQS §8 / D6 (stats with no consumer) | Dead | Partially alive — Pillar B is now a real consumer of shadow events; the human-facing dashboard remains unbuilt (still out of scope) | |

### After M4 — Catalog axis + determinism (CGC-2026-004)

| v1/audit item | Before | After | Evidence |
|---|---|---|---|
| Audit §2 readdirSync ordering | Drift DR6 | **Closed** (sorted, unconditionally) | `[empirical]` full golden replay after the change: **improved=0 regressed=0** vs the V2 baseline — behavior-neutral as predicted (the blast-radius prediction was "ties only; golden set has no cross-pack tie") |
| Audit §2 unordered catalog query | Drift DR6 | **Closed** (ordered at every nesting level) | Same replay evidence; locationAccuracy byte-identical (0.9091) |
| Audit §3 unversioned location catalog / CCQS manifest incompleteness | Missing axis | **Closed** — `location-catalog: 1.0.0+db` carried in the manifest's existing `ontologyVersions` map (zero frozen-schema change); the `+db`/`+json-fallback` suffix makes the audit's fallback finding visible per run | `[empirical]` new run's persisted manifest shows the axis |
| Audit §6 D-narrow item 2 (replay LLM pinning) | Missing | **Closed** — `COGNITIVE_REPLAY_DETERMINISTIC=true` → temp 0 + seed 42, set only by the two replay npm scripts; production sampling untouched at 0.1 | `[code-read]` + the scheduled run executed under it |
| MEI-04 version-bump obligation | — | **Honored**: `RULES_REGISTRY_VERSION` → 1.1.1, `ENGINE_VERSION` → `…-ops-1` | Persisted in the new manifest |
| Debt **T4** (High) | Open | **Closed** | |

### After M5 — Replay Verification (CGC-2026-005)

| v1 row | v1 status | v2 status | Evidence |
|---|---|---|---|
| SEE INV-17 / §16.1 Replay Verification | **Missing (in practice)** — never executed, no audit channel (finding **D7**) | **Implemented and executed** — separate audit channel (`reports/*.json`), zero DB writes, pinned-vintage precondition enforced | `[empirical]` V2 run: **33/33 byte-identical**; new scheduled run: **33/33 byte-identical**; 0 divergent, 0 vintage-skipped |
| SEE INV-01/INV-07 (comparator determinism/replayability) | Implemented `[unverified as byte-identity]` / Partial | **Empirically proven** on real historical records — twice | Same |
| SEE §16.5 (old engine builds stay executable) | Missing | **Still missing** — no build archival; today's verification succeeded because no vintage has diverged from the current build yet. Honest note: the first comparator/ontology version bump will make older records `version-vintage-mismatch` until an archival strategy exists | Open, low urgency until the first such bump |
| Debt **T7** (Medium) | Open | **Half-closed** (verification exists; archival doesn't) | |

### After M6 — CI wiring (CGC-2026-006)

| v1/CGP item | Before | After | Evidence |
|---|---|---|---|
| RFC-005 §17 MEI-04/05/08/09/10/11 | Defined, unenforced | **Enforced as merge-blocking diff guards** | `[empirical]` both paths demonstrated: empty diff → 6/6 green; the last pre-governance commit → correctly BLOCKED on MEI-04 |
| RFC-004/005 "practiced but unenforced" (v1 blocker 4) | No tooling | **Tooling exists** for every diff-checkable invariant + the runtime guards of M1/M2; RFC-004/005 are adopted normatively (the roadmap directive names them frozen architecture — freezing IS adoption) | |
| Debt **T6** (insulation unguarded) | Open | **Closed** — MEI-09 blocks `SEE_FIELD_SPECS`/`cognitive-to-snapshot.ts` diffs lacking a determinism re-audit artifact | |
| MEI-12 (alert→issue SLA) | — | Store + evaluator exist; the standing monitor that would evaluate the SLA does not (scheduling = deployment infra) | Open |

---

## 2. The validation run (one run, three purposes)

ReplayRun **`cmrdv8t8c0002s5is500hwgat`** (`triggeredBy: 'scheduled'`, engine
`cognitive-engine-v1-phase4-ops-1`, rules `1.1.1`, ontologies
`{category: 1.0.0, location-catalog: 1.0.0+db}`, dataset `golden-dataset@v1`, deterministic
replay sampling active):

- **Metrics:** categoryAccuracy **0.9394**, locationAccuracy **0.9091**, ambiguousRate **0.0455**
  — byte-identical to the V2 baseline. Gate verdict **warn** (same locationAccuracy margin as V2,
  unchanged, disclosed), **persisted** as `CcqsGateVerdict cmrdvrbc4001ys5isi3zgu4ax` (MEI-01
  live). Golden `CcqsMetricSnapshot cmrdvrbc9001zs5isornxjfs9` (Pillar A time series begins).
- **Release comparison vs `cmrc8md8x…`:** improved=0, regressed=0 — M4 behavior-neutral across
  the entire dataset; correspondingly, **no alerts fired** (the correct outcome, produced by the
  real alert path, not by its absence).
- **INV-17 verification:** 33/33 byte-identical.

---

## 3. Updated ratings

| Dimension | v1 | v2 | What changed |
|---|---|---|---|
| Implementation completeness | Medium-High (core) / Low (ops) | **High (core) / Medium-High (ops)** | PVW runtime, verdict persistence, INV-17, CI — built and exercised; standing schedules + operating history remain |
| Architectural consistency | High | **High** | Zero contradictions encountered during implementation (no Architecture Decision Report was needed); every change traced to an existing section |
| Governance maturity | Medium (paper only) | **Medium-High** | Diff-checkable invariants enforce at merge; runtime invariants enforce at the CLIs; RFC-004/005 adopted. Still single-person, hats-not-headcount |
| Replay maturity | Medium | **High** | INV-17 executed twice at 33/33; all manifest axes complete; run-integrity enforced; deterministic replay sampling. Open: §16.5 old-build archival |
| Operational maturity | Low | **Medium** | The machinery exists and ran end-to-end on real data; what's missing is *time* — standing schedules and accumulated history, not engineering |
| **Overall** | Medium — "measurement-grade, not operations-grade" | **Medium-High — "operations-capable, operations-young"** | |

## 4. Verdict

**Can this architecture be considered architecturally complete? — YES WITH MINOR DEBT.**

The v1 verdict's five blockers, re-examined: (1) gate-decision record — **closed**; (2) production
half unbuilt — **built** (G1/G3/G4/G6/G7/G9 closed or runtime-closed; G2 open by explicit
decision); (3) replay guarantees promissory — **collected on**: INV-17 executed, byte-identity
proven twice, catalog axis versioned, integrity enforced, insulation CI-guarded (open: old-build
archival); (4) governance unadopted/unenforced — **adopted and tooled**; (5) D-narrow items open
by instruction — **closed**.

Remaining minor debt, named exactly: **G2** (per-category/city breakdowns — awaits the frozen
`QualityMetricSnapshot` amendment), **SEE §16.5** (old-build archival — dormant until the first
comparator/ontology version bump), **MEI-12's standing monitor** (a cron entry, not code), plus
the v1 register items this roadmap explicitly did not target (T5 pack bloat/dedup, T8 publish
schema mismatch, T10 multi-objective needs, T11 semver style, T13/T14).

**What this verdict is NOT:** cutover readiness. PVW §7's READY conditions require *operating
history* — several weeks of scheduled Pillar-A runs and version-stamped Pillar-B volume — which no
amount of engineering can fast-forward. Architecture-complete means the machinery to earn that
history now exists and is proven; Phase 8 remains a separate, future, evidence-gated decision,
exactly as every prior document has insisted.

---

*End of Audit v2. Successor audits append as v3. Produced alongside — never modifying — Audit v1.*
