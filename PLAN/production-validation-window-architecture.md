# Production Validation Window — Architecture (Design Only, Not Implemented)

**Status: Permanent architecture document, alongside the RFCs. Design-only per explicit
instruction — no code was written to produce this document. Phase 8 (authoritative cutover) is
explicitly NOT being started by this document or as a result of it.**

**Scope discipline verified while writing this**: SEE (`src/semantic-evaluation-engine/`), CCQS's
existing modules (`src/ccqs/`), the Release Gate (`default-v1`), and the Golden Dataset
(`src/ccqs/golden-dataset/v1.ts`) were read, not modified, in producing this document. Every claim
below about "what exists today" was verified by reading the actual current source file, not
recalled from memory of earlier sessions — memory can go stale; the code cannot.

---

## 0. Framing: what this document is answering

Sasan asked for a Principal-Engineer-grade final production-readiness review, structured as: review
→ design a Production Validation Window (PVW) → design permanent metrics → design trend detection
→ design alerts → evaluate Replay Platform evolution → render a cutover verdict. This document
follows that exact order. Section 7's verdict is the payload; everything before it is the evidence
that verdict rests on.

**One architectural framing decision made up front, because it shapes every section after it**:
PVW is designed as **CCQS's continuous/production-facing extension, not a fourth independent
layer**. CCQS's own founding principle was "never reimplement comparison logic — orchestrate SEE."
PVW extends that principle one level up: it never reimplements metric/gate logic — it orchestrates
CCQS's existing `aggregateQualityMetrics`/`evaluateGate`/`compareReplayRuns` over *time* and over
*production data*, neither of which CCQS was ever built to see. Concretely: new code lives under
`src/ccqs/pvw/` (a new subdirectory of the existing CCQS module), not a new top-level module. This
is a recommendation for confirmation, not a unilateral decision — flagged explicitly per the "if a
previous decision should change, say so" instruction, since it does add scope to something
declared "frozen." Nothing about CCQS's existing frozen surface (types, `evaluateGate`,
`compareReplayRuns`, the `default-v1` policy) is changed by this framing — PVW only *adds* new
modules that call the existing ones.

---

## 1. Architecture review — what exists today, verified against the real code

| System | What it actually does today (verified) | Where |
|---|---|---|
| **Cognitive Engine** | `runCognitivePipeline(rawText, opts)` — Evidence (LLM, temperature=0.1) → Grounding (rules+LRE) → Decision → CNO → State → Readiness. Called from two places: `runGoldenReplay` (CCQS) and `scheduleCognitiveEngineShadowComparison` (real publish route). | `src/cognitive-engine/pipeline/run-cognitive-pipeline.ts` |
| **SEE** | `compareSnapshots` (Layer 1, pure) + `applyScoringPolicy` (Layer 2, pure). Called identically by both CCQS's replay and the live publish route — genuinely one comparison implementation, not two. | `src/semantic-evaluation-engine/` |
| **CCQS** | `runGoldenReplay` — runs the Cognitive Engine over the **33-case static golden dataset only**, persists `CcqsComparisonRecord`s. `aggregateQualityMetrics` — pure, single-scalar accuracy per field, confidence histograms, ontology-reasonCode counts, rule coverage. `evaluateGate` — pure, pairwise-optional gate over one `QualityMetricSnapshot`. `compareReplayRuns` — pure, **exactly two** runs at a time. | `src/ccqs/` |
| **Replay Platform** | = `runGoldenReplay`. Sequential, whole-dataset, no sampling, no filtering, no scheduling. `triggeredBy: 'manual' \| 'ci' \| 'scheduled'` is typed but `'scheduled'` has never been wired to an actual scheduler — verified: no cron/queue trigger calls it anywhere in the codebase. | `src/ccqs/replay/run-golden-replay.ts` |
| **Release Gate** | `evaluateGate(metrics, policy, opts)` — evaluated once per manual replay invocation, against one `QualityMetricSnapshot`, no time dimension. | `src/ccqs/gate/evaluate-gate.ts` |
| **Shadow Evaluation** | `scheduleCognitiveEngineShadowComparison` fires on **every real publish**, fire-and-forget, compares legacy vs. cognitive via the same SEE comparator, writes a `CognitiveEngineShadowComparison` event. This is real, continuous, production-volume data — but it compares **legacy vs. cognitive**, never **cognitive vs. ground truth** (there is no ground truth in production). | `src/app/api/need-intake/publish/route.ts:102-150` |
| **Golden Dataset** | 33 git-tracked cases, `tags: string[]` (loose, e.g. `'real-estate'`) but **no structured `expectedCategory`-derived grouping key, no city-slug field** — `expectedLocationCity` is free Persian text. | `src/ccqs/golden-dataset/v1.ts`, `src/ccqs/types/golden-case.ts` |
| **IntakeMigrationEvent** | Generic `{type, payload: Json string, createdAt}` event log, already indexed `[type]`, `[createdAt]`, `[type, createdAt]` — i.e. **already shaped correctly to be a time-series store**, just never queried as one for cognitive-engine data (`getCognitiveEngineShadowStats(since)` does one cumulative count over a window, not a bucketed series). | `prisma/schema.prisma:538-547`, `src/intake/migration/events.ts` |

### Critical gaps found (not assumed — each verified against the code above)

| # | Gap | Evidence | Severity |
|---|---|---|---|
| **G1** | **No connection between CCQS and real production traffic at all.** CCQS's gate verdict is entirely a statement about 33 static, curated cases. Production shadow events are written but never fed into `aggregateQualityMetrics`/`evaluateGate`. A passing Release Gate today says nothing about what is happening on real `/post` traffic right now. | `runGoldenReplay` only iterates `opts.dataset` (the golden dataset); `scheduleCognitiveEngineShadowComparison` never calls anything in `src/ccqs/`. | **Critical** |
| **G2** | **No per-category or per-city breakdown is computed by any code path.** Baseline Report V1's "Category Analysis" and "Location Analysis" tables were assembled **by hand**, reading raw case data — not produced by a reusable, versioned CCQS function. There is no way to ask "is `apartment-rent` degrading" or "is `تهران` degrading" without a human re-doing that manual work every time. | `aggregate-quality-metrics.ts` computes exactly one scalar per field (`categoryAccuracy`, `locationAccuracy`) — no `Record<categorySlug, ...>` or `Record<citySlug, ...>` anywhere in `QualityMetricSnapshot`. | **Critical** |
| **G3** | **No time dimension anywhere in CCQS.** `compareReplayRuns` is pairwise (exactly 2 runs). There is no concept of "the last 7 runs" or "this week vs last week." Trend questions ("is quality drifting," "did today's deploy hurt us") are structurally unanswerable with today's code, not just unautomated. | `compare-replay-runs.ts` signature takes exactly `runAId`/`runBId`. | **Critical** |
| **G4** | **Production shadow events carry no version stamp.** `CognitiveEngineShadowComparison` payload has `templateId`/`equal`/`diffs`/`readinessLevel`/`comparisonReport`/`finalEvaluation` — no `engineVersion`/`rulesRegistryVersion`/`comparatorEngineVersion`. You cannot group real-traffic events by which code version produced them, which is a prerequisite for "did today's deployment reduce quality" or "is a model upgrade safe" — both require comparing production behavior **before vs. after a specific version boundary**, and today that boundary can only be approximated by a timestamp, which silently breaks if a deploy is rolled back or two versions briefly coexist. | `publish/route.ts:137-145` (payload literal, no version field). | **High** |
| **G5** | **Replay determinism is unverified, and by construction is not guaranteed.** RFC-000's own ADR-012 ("temperature-sensitive model behavior SHALL NOT determine business outcomes") is aspirational here: the Evidence-extraction LLM call runs at `temperature: 0.1` (nonzero), confirmed in both `local-chat-client.ts:109` and `openai-compatible-adapter.ts:46`. SEE's own Historical Record contract (§16.1, INV-17) assumes "Replay Verification: re-run with original pinned versions MUST reproduce the old answer" — this has never actually been tested end-to-end against the real LLM. If it doesn't hold, every `CcqsComparisonRecord` is a snapshot of one non-repeatable sample, which materially weakens the meaning of "the gate passed." | `local-chat-client.ts:109`, `openai-compatible-adapter.ts:46`; no self-test anywhere re-runs the same case twice and diffs the result. | **High** — previously undocumented. |
| **G6** | **`QualityMetricSnapshot` is a Derived View that is recomputed, never cached**, despite its own doc comment stating the caching philosophy. There is no persisted metrics-history table — trend queries would need to re-parse every historical `CcqsComparisonRecord`'s JSON blob on every read. Fine at 33 records; not fine once production-scale history accumulates. | `quality-metrics.ts:1-5` doc comment vs. Prisma schema — no `CcqsMetricSnapshot` table exists. | Medium |
| **G7** | **No alerting of any kind exists.** The gate is evaluated on-demand by a human running a CLI script; nothing observes it continuously or flags a regression proactively. | No alert types/evaluators found anywhere under `src/ccqs/` or `src/intake/migration/`. | Medium (compounds G1/G3) |
| **G8** | **`Ontology Distance Distribution` data already exists but is discarded.** `scalar-ontology.ts:42` already writes `reasonParams.distance` into every persisted `ComparisonReport`, and `CcqsComparisonRecord.comparisonReport` stores that verbatim, forever — but `aggregateQualityMetrics` never reads it. This is the cheapest gap to close (pure aggregation over already-persisted history, zero new instrumentation, fully retroactive over every past replay run). | `scalar-ontology.ts:42`; absent from `aggregate-quality-metrics.ts`. | Low (cheap fix, but flagged because "retroactively computable" changes its priority relative to G4/G5, which are not retroactive). |
| **G9** | **No scheduled replay trigger exists** despite the type already allowing for one (`triggeredBy: 'scheduled'`). Every ReplayRun to date has been `'manual'`. Without a recurring trigger, "did today's deployment reduce quality" cannot be answered same-day — it requires a human to remember to run the CLI. | `run-golden-replay.ts`'s `RunGoldenReplayOptions.triggeredBy` type vs. zero call sites passing `'scheduled'`. | Medium |

**These 9 gaps are the actual justification for this document** — none were assumed; each traces
to a specific, cited line of real code.

---

## 2. Production Validation Window — design

### 2.1 The core distinction this design is built on: ground-truth-bearing vs. ground-truth-free

This is the single most important architectural fact PVW must respect, and it was not explicit in
any prior document: **the Golden Dataset has ground truth; production traffic does not.**
Consequently, "accuracy" (a comparison against a known-correct answer) can only ever be measured on
the golden dataset. Production shadow comparison measures **agreement with the legacy pipeline**,
which is a *different, weaker* signal — legacy can be wrong too, so 100% agreement does not imply
100% accuracy, and a drop in agreement does not necessarily imply a drop in accuracy (it could mean
the Cognitive Engine started being *more* right while legacy stayed wrong — exactly the "refinement"
case SEE already knows how to name).

PVW is therefore built on **two independent pillars**, not one generic "run more replay" idea:

**Pillar A — Scheduled Golden Replay (ground-truth-bearing, low-volume, high-trust)**
Re-runs the existing `runGoldenReplay` against the unchanged 33-case dataset on a recurring cadence
(nightly) and on every deploy (`triggeredBy: 'scheduled'` / a new `'deploy'` value), rather than
only manually. Every run is a normal `CcqsReplayRun` — nothing new is invented at the data-model
level, only the trigger changes. This produces a genuine, replayable, ground-truth-anchored time
series of `QualityMetricSnapshot`s. **This pillar is what answers**: "did today's deployment reduce
quality," "is a model upgrade safe," "is replay still reproducible" (see §2.3), "is ontology
refinement increasing" (against known-correct labels, not just legacy agreement).

**Pillar B — Continuous Production Shadow Aggregation (ground-truth-free, high-volume, proxy-trust)**
Aggregates the *existing* `CognitiveEngineShadowComparison` events (already flowing, already
volume-representative of real usage) into time-bucketed, version-stamped, category/city-tagged
summaries. Cannot compute "accuracy" (no ground truth), but *can* compute every metric that doesn't
need a correct answer to be meaningful: ambiguity rate, confidence distribution, ontology-refinement
rate (refinement vs. mismatch, which SEE already classifies without needing to know which side is
"true" — a refinement is definitionally "more specific, not contradictory"), rule/evidence coverage,
top failure reason codes. **This pillar is what answers**: "is one category degrading in the wild,"
"is one city degrading," "is ambiguity increasing," "is confidence distribution changing" — at real
traffic volume and real geographic/category mix, which the 33-case golden dataset structurally
cannot represent.

Neither pillar substitutes for the other. A regression that only shows up in Pillar B (e.g. a rare
city name that never made it into the golden dataset) would be invisible to Pillar A; a subtle
accuracy regression that legacy also gets wrong would be invisible to Pillar B (agreement stays
high, but both are now wrong). **Recommendation: both pillars are required before Phase 8 can be
responsibly reconsidered** — this recommendation is substantiated in §7.

### 2.2 Component design

```
                     ┌─────────────────────────────────────────────┐
                     │         Production Validation Window          │
                     │              src/ccqs/pvw/                     │
                     │                                                 │
   Pillar A          │  ┌──────────────────┐   ┌────────────────────┐ │
   (scheduled)  ─────┼─▶│ Scheduled Replay  │──▶│  MetricSnapshot     │ │
   nightly/deploy     │  │ Trigger (thin)    │   │  Time Series Store  │ │
                     │  └──────────────────┘   │  (Pillar A + B,      │ │
                     │                          │   unified schema)    │ │
   Pillar B          │  ┌──────────────────┐   │                      │ │
   (continuous) ─────┼─▶│ Production Metric │──▶│                      │ │
   IntakeMigration    │  │ Bucketer (pure)   │   └──────────┬───────────┘ │
   Event stream       │  └──────────────────┘              │             │
                     │                                      ▼             │
                     │                          ┌────────────────────┐   │
                     │                          │  Trend Detector     │   │
                     │                          │  (pure, versioned)  │   │
                     │                          └──────────┬───────────┘   │
                     │                                      ▼               │
                     │                          ┌────────────────────┐     │
                     │                          │  Alert Evaluator    │     │
                     │                          │  (pure, versioned)  │     │
                     │                          └──────────┬───────────┘     │
                     │                                      ▼                 │
                     │                          ┌────────────────────┐       │
                     │                          │  AlertEvent store    │       │
                     │                          │  (append-only)        │       │
                     │                          └────────────────────┘       │
                     └─────────────────────────────────────────────┘
                     Reuses, never reimplements: CCQS's aggregateQualityMetrics/
                     evaluateGate/compareReplayRuns, SEE's compareSnapshots/applyScoringPolicy.
```

Five new modules, each pure except the two thin I/O triggers (matching CCQS's and SEE's own
"pure computation, I/O is the caller's job" discipline exactly):

1. **Scheduled Replay Trigger** (`src/ccqs/pvw/scheduled-replay-trigger.ts`, thin I/O) — calls the
   *existing, unchanged* `runGoldenReplay` with `triggeredBy: 'scheduled'` (or a new literal
   `'deploy'`, added to the existing string union — additive, not breaking). Invocation mechanism
   (cron, queue, CI step) is a deployment-infra decision, deliberately out of scope for this
   document — this module only needs to be *callable* from one.
2. **Production Metric Bucketer** (`src/ccqs/pvw/bucket-production-metrics.ts`, pure) — reads
   already-recorded `CognitiveEngineShadowComparison` events for a time window (I/O by the caller,
   same convention as `aggregateQualityMetrics`), and produces a `ProductionMetricSnapshot`
   (§3) per bucket (hour/day). Ground-truth-free metrics only (§2.1).
3. **MetricSnapshot Time Series Store** — closes G6: a new, append-only Prisma model,
   `CcqsMetricSnapshot`, one row per (Pillar-A replay run OR Pillar-B bucket), storing the
   already-computed `QualityMetricSnapshot`/`ProductionMetricSnapshot` JSON plus its version stamp
   and a `pillar: 'golden' | 'production'` discriminator. This is a genuine Derived View **cache**
   (mechanically reproducible from `CcqsComparisonRecord`/`IntakeMigrationEvent` at any time,
   exactly like SEE §16.2) — never a second source of truth. Makes trend queries O(buckets), not
   O(all historical records' JSON re-parsed).
4. **Trend Detector** (`src/ccqs/pvw/detect-trends.ts`, pure) — §4.
5. **Alert Evaluator** (`src/ccqs/pvw/evaluate-alerts.ts`, pure) — §5, writes to a new append-only
   `CcqsAlertEvent` table (never a second, competing alerting system — this table is the "alert
   fired" historical record; delivery/integration is explicitly out of scope per the user's
   instruction).

### 2.3 Versioning (per explicit requirement: "the architecture must be versioned")

PVW adds exactly two new version axes on top of the existing five/six (SEE's
`ComparatorVersionStamp`/`EvaluationVersionStamp`, CCQS's `EngineVersionManifest`), never
duplicating them:

- **`windowSpecVersion`** — stamps the *definition* of a time bucket (bucket width, which metrics
  are included, which pillar). If the bucketing definition itself changes (e.g. hourly → daily),
  old `CcqsMetricSnapshot` rows remain valid history under their original `windowSpecVersion`; they
  are never recomputed or reinterpreted under the new definition (mirrors SEE's INV-11 — upgrades
  never retroactively alter old evaluations).
- **`alertPolicyVersion`** — stamps the alert threshold set active when an `AlertEvent` fired (same
  discipline as CCQS's `CcqsGatePolicy`/`CcqsGateVerdict` — every fired alert points at the exact
  policy version, not just "current policy," so a later threshold change doesn't retroactively
  change what a past alert meant).

Every `CcqsMetricSnapshot` row also carries the *existing* `EngineVersionManifest` fields (for
Pillar A, populated identically to today's `runGoldenReplay`; for Pillar B, this requires closing
**G4** — adding a version stamp to the `CognitiveEngineShadowComparison` payload, the one concrete,
explicitly-flagged amendment to an existing "frozen" surface this document proposes; see §2.4).

### 2.4 Explicit proposed amendment (flagged, not applied): version-stamp production shadow events

**Recommendation**: add `engineVersion: {label, cognitiveEngineVersion, rulesRegistryVersion,
comparatorEngineVersion}` to the `CognitiveEngineShadowComparison` payload written in
`publish/route.ts:137-145`. This is additive (new field, existing readers — `getCognitiveEngineShadowStats`
— are unaffected since they only read `equal`/`diffs`) and is a hard prerequisite for Pillar B to
answer "did today's deployment reduce quality" rather than merely "did quality change around
roughly this time." Flagged explicitly, per instruction, as a change to code the Production
Readiness pass treated as out-of-scope/frozen — this document recommends it, does not apply it.

### 2.5 Answering the 9 required questions directly

| Question | Answered by | How |
|---|---|---|
| Is quality drifting over time? | Pillar A + Trend Detector | Rolling comparison of `categoryAccuracy`/`locationAccuracy` across the `CcqsMetricSnapshot` series (golden pillar). |
| Is one category degrading? | Pillar A + Pillar B, per-category breakdown (§3, closes G2) | New `accuracyByCategory: Record<slug, RatioStat>` (Pillar A) and `statusRateByCategory` (Pillar B, no accuracy but status mix). |
| Is one city degrading? | Same as above, per-city (closes G2) | Requires golden dataset to gain a normalized city-slug field (currently free text — a small, additive `GoldenCase` schema extension, flagged not applied) plus Pillar B's `templateId`-style tagging extended to city. |
| Did today's deployment reduce quality? | Pillar A, triggered on deploy + Trend Detector's release-comparison mode | Compare the first post-deploy scheduled run against the rolling pre-deploy baseline — requires G9 (scheduled trigger) and G4 (version stamps) closed. |
| Is ambiguity increasing? | Pillar B (ground-truth-free) | `ambiguousRate`-equivalent computed directly from `comparisonReport.fieldResults` status mix in shadow events — no ground truth needed, since "ambiguous-but-plausible" is a status SEE assigns independent of which side is truth. |
| Is confidence distribution changing? | Pillar B | Same confidence-histogram logic `aggregateQualityMetrics` already has, applied per time bucket. |
| Is ontology refinement increasing? | Pillar B (rate) + Pillar A (correctness-anchored) | Pillar B: raw refinement-vs-mismatch rate in the wild. Pillar A: refinement rate specifically among cases with known ground truth (catches Root Cause E — refinement counted as "good" when it's actually under-specification, per Baseline V1 §3E — a real pre-existing measurement blind spot this document does not fix, only surfaces again). |
| Is replay still reproducible? | New **Replay Stability** metric (§3), Pillar A only | Re-run a small deterministic subset N times, measure agreement — directly targets **G5**. |
| Is a model upgrade safe? | Pillar A, release-comparison mode, run *before* the upgrade is promoted to production | Exactly today's manual Production-Readiness-pass workflow, minus the "manual" and "ad hoc" — same `compareReplayRuns` call, triggered automatically pre/post a candidate version. |

---

## 3. Permanent production metrics

Legend: **Pillar** = `Golden` (needs ground truth, Pillar A only), `Production` (ground-truth-free,
Pillar B only), `Both` (meaningful computed both ways, different meaning each time — flagged where
so). **New data?** = whether the underlying signal already exists in persisted records (§1's G8
finding matters here — "already exists" metrics are retroactively computable over ALL history the
day they ship; "new instrumentation" metrics only start accumulating history from the day they
ship).

| Metric | Pillar | Definition | Why it exists | How computed | Storage | Replay compatibility | Versioning |
|---|---|---|---|---|---|---|---|
| **Category Accuracy** | Golden (exists today, scalar only) | `GOOD_STATUSES` fraction of comparable category fields | Core correctness signal | Exists: `aggregateQualityMetrics`. Extend: also group by `caseId`'s category tag → `accuracyByCategory` | `CcqsMetricSnapshot.metrics` JSON | Fully replayable (pure fn of persisted `CcqsComparisonRecord`s) | `evaluationReportVersion` |
| **Location Accuracy** | Golden (exists, scalar only) | Same, location field | Same | Same, extend by city | Same | Same | Same |
| **Refinement Rate** | Both | `refinement` status ÷ comparable | Distinguishes "engine more specific" from wrong | New: `count(status='refinement')/comparable`, per pillar | Same | Replayable (Golden); Production is a live proxy, re-aggregatable from stored events, not "replayable" in the ground-truth sense | Same |
| **Sibling Rate** | Both | `ONTOLOGY.SIBLING` reasonCode ÷ ontology-reaching comparisons | Adjacent-wrong vs. wild-wrong, per Baseline V1 §5's "no `unrelated` outcomes" finding | New: filter `ontologyRefinementStats` by reasonCode | Same | Same | Same |
| **Mismatch Rate** | Both | `mismatch`+`contradiction-detected` ÷ comparable | Direct wrongness signal | New: derivable from `statusCountsByField` (already computed, just never surfaced as a named rate) | Same | Same | Same |
| **Ontology Distance Distribution** | Both | Histogram of `reasonParams.distance` across ontology-reaching comparisons | Finer-grained than reasonCode alone (closes **G8**) | New aggregation, **but retroactively computable over ALL existing history today** — `distance` is already in every stored `comparisonReport` | Same | Same, and uniquely: this one can backfill every past run | Same |
| **Confidence Distribution** | Both | Existing decile histogram, per field | Exists already (`confidenceHistogramByField`) | Exists | Same | Same | Same |
| **Confidence Calibration** | Golden only (needs ground truth to define "calibrated") | Correlation between confidence bucket and actual `GOOD_STATUSES` rate within that bucket | Baseline V1 §4 named this as unmeasured; "confidence is not currently meaningful as an absolute number" — this metric is how you'd eventually prove/disprove that changed | New: bucket comparable cases by confidence decile, compute accuracy within each bucket | Same | Replayable | Same |
| **Ambiguity Rate** | Both (exists for Golden, extend to Production) | `ambiguous-but-plausible` ÷ comparable | Exists (Golden). Production version needs no ground truth — ambiguity is a property of the candidate set, not of correctness | Exists (Golden); new bucketer for Production | Same | Golden: replayable. Production: not replayable, but reproducible from stored raw events | Same |
| **Unknown Rate** | Both | `snapshotB.state === 'unknown'` ÷ total | Distinct from "missing" — "the engine never even tried" vs. "the engine tried and found nothing" | New — not currently surfaced separately from `not-comparable` | Same | Same | Same |
| **Missing Rate** | Both | `snapshotB.state === 'missing'` ÷ total | Same distinction, other half | New | Same | Same | Same |
| **Replay Stability** | Golden only, new capability | Fraction of N repeated runs of the *same* case (same pinned version) that reproduce the *same* comparison status | Directly targets **G5** — currently zero evidence replay is deterministic under `temperature=0.1` | New: a dedicated stability-check mode of `runGoldenReplay` (run each case in a small fixed subset K times instead of once) | New table or reuse `CcqsComparisonRecord` tagged `replayMode: 'stability-check'` | By definition, this metric's *purpose* is to measure replay-compatibility, not assume it | New `stabilityCheckVersion` (which subset, K) |
| **Version Drift** | Both, comparative | `compareReplayRuns`'s existing `improvedCount`/`regressedCount`/metric deltas, applied across N historical runs, not just 2 | Exists pairwise; extend to N via Trend Detector (§4), not a new metric definition | Reuses `compareReplayRuns` unchanged, called pairwise across the rolling window | `CcqsMetricSnapshot` series | Replayable | Same |
| **Rule Coverage** | Both (exists for Golden) | Exists: unique rules matched, zero-candidate case ids | Exists | Exists | Same | Same | `rulesRegistryVersion` |
| **LLM Coverage** | Both, new | Fraction of cases where Evidence-extraction actually returned usable evidence (vs. timeout/empty/error, silently falling back to rules-only) | Not currently tracked as a first-class rate — only visible today as a raw pipeline error causing a `skippedCaseIds` entry, which conflates "LLM failed" with "pipeline threw for any reason" | New: `runCognitivePipeline`'s Diagnostics (Phase 6, `CognitiveContract`) already carries this signal per-case; needs a dedicated counter | Same | Replayable | `cognitiveEngineVersion` |
| **Evidence Coverage** | Both, new | Fraction of Evidence types (`IDENTITY`/`ACTION`/`CONTEXT`/`CONSTRAINT`) actually populated per case, vs. the RFC-001 grammar's full set | Surfaces silent grammar gaps (e.g. `CONSTRAINT` evidence is free text today, per Phase 4's honestly-documented gap) | New: count populated `EvidenceType`s ÷ total defined types, per case | Same | Replayable | `semanticContractVersion` |
| **Average Reason Codes per Case** | Both, new | Mean count of distinct `reasonCode`s per case's `ComparisonReport` | A rough complexity/ambiguity proxy independent of any single status | New, trivial aggregation | Same | Replayable | Same |
| **Top Failure Reasons** | Both, new | Ranked `reasonCode` frequency among `mismatch`/`contradiction-detected` only | Directly actionable — this is what every root-cause investigation this whole session started from, done manually each time | New: filter+rank, reusing the registry's reason codes (already a closed, versioned set per SEE §14) | Same | Replayable | `comparatorEngineVersion` |
| **Top Category Regressions** | Golden, comparative | Categories whose `accuracyByCategory` decreased release-over-release, ranked by magnitude | Directly what §7's readiness review needed and had to hand-assemble | New, built on the per-category breakdown (closes G2) + `compareReplayRuns`'s existing diff machinery | `CcqsMetricSnapshot` series comparison | Replayable | Same |

**Explicit non-goal, stated plainly**: no "Cognitive Engine Health Score" composite is added to this
list, for the exact reason Baseline Report V1 §8 already gave — no versioned, documented formula
exists, and inventing one here would violate the same "do not invent numbers" discipline. If one is
ever designed, it belongs in a dedicated document with its own review, not smuggled in here.

---

## 4. Trend detection

**Deterministic by construction, not by discipline alone**: every function in this section takes an
explicit `asOf: string` (ISO timestamp) parameter and an explicit list of `CcqsMetricSnapshot`s to
consider — it never calls "now" internally. Given the same snapshot set and the same `asOf`, the
output is always byte-identical. This matters concretely: it means a trend report itself becomes a
replayable, versioned artifact (same discipline as everything else in this system), not a live
dashboard query that can't be reproduced tomorrow.

### 4.1 Windows

Three fixed, named windows, computed the same way regardless of pillar:

- **Last Day** — Pillar B only (Pillar A doesn't run more than once/day by design in §2.1).
- **Last Week** — both pillars. Golden: however many scheduled runs occurred (nightly → ~7).
  Production: 7 daily buckets.
- **Last Month** — both pillars, same logic, 30 buckets/runs.

Each window reports: the metric's value at window start vs. window end, the delta, and — for
Production only, where volume is high enough to be meaningful — a **rolling average** (mean of the
last N daily buckets, N configurable per `windowSpecVersion`) to smooth single-day noise before
comparing.

### 4.2 Release comparison

A distinct mode from the rolling windows above: not "the last N days" but "the last scheduled Golden
run before a given deploy timestamp" vs. "the first scheduled Golden run after it." This is a
direct, thin wrapper around the *already-existing* `compareReplayRuns` — the "trend" here is really
just "pick the right two runIds automatically instead of a human pasting two cuids into a CLI,"
which is honest about how little new logic this needs (the hard work, `compareReplayRuns`, already
exists and is already correct).

### 4.3 Control charts — recommendation, not a blanket "yes"

The user's brief explicitly says "control charts if appropriate" — this needs an honest answer, not
a reflexive one. **Recommendation: not appropriate for Pillar A yet, appropriate as a future option
for Pillar B once real volume is proven.** Reasoning: a Shewhart/EWMA control chart needs enough
samples per bucket for its variance estimate to mean anything; Pillar A's golden dataset produces
exactly one `categoryAccuracy` number per scheduled run (n=33 cases, but the *metric itself* is one
scalar per run) — a control chart over a series of single scalars degenerates into the same rolling
comparison already described in §4.1, adding statistical machinery without adding information.
Pillar B's daily production buckets, by contrast, will have real per-bucket sample counts (however
many publishes happen that day) once it's built — a proper control chart (e.g. 3-sigma bands on the
daily ambiguity rate) becomes meaningful *there*, but only after enough days of real Pillar-B data
exist to estimate a stable baseline variance. **This document designs the data shape to support
adding control charts later (§3's per-bucket storage) without designing the chart itself now** —
building one today, before any real Pillar-B history exists to validate it against, would be
exactly the kind of premature, unvalidated statistical claim the whole session's "do not invent
numbers" discipline exists to prevent.

---

## 5. Production alerts

Architecture only, per explicit instruction — no delivery integration. An `AlertPolicy` (versioned,
mirrors `CcqsGatePolicy`'s shape exactly) + a pure `evaluateAlerts(snapshot, priorSnapshots, policy)
→ AlertEvent[]` function + an append-only `CcqsAlertEvent` table (fired alerts are historical
record, never mutated or "resolved" in place — a resolution is a *new* event referencing the
original, same non-destructive discipline as everywhere else in this system).

| Alert | Trigger | Threshold (starting point, undertuned like every other `default-v1` value in this system) | Severity | Recommended action |
|---|---|---|---|---|
| Category accuracy drop | Pillar A, release comparison, `categoryAccuracy` delta | drop > 3 percentage points vs. pre-deploy baseline | **Critical** | Block/flag the deploy for review before it's treated as the new baseline; re-run the reproduce→trace→root-cause cycle from the Production Readiness pass on the specific regressed case ids `compareReplayRuns` already names. |
| Confidence distribution shift | Pillar B, rolling week vs. prior week, histogram distance (e.g. total-variation distance between decile histograms) | shift > 0.15 TV-distance | Warning | Investigate whether an upstream model/prompt change occurred; not automatically a quality problem (confidence isn't accuracy, per Baseline V1 §4), but worth a human look. |
| Ambiguity spike | Pillar B, daily bucket vs. rolling 7-day average | daily value > 1.5× the rolling average | Warning | Check whether a specific category/city is driving it (per-category/per-city breakdown, §3) before assuming a global regression. |
| Ontology mismatch spike | Pillar B, `mismatch` rate daily vs. rolling average | > 2× rolling average, or > `maxFalsePositiveRate`-equivalent absolute floor | **Critical** | Same reproduce→trace cycle as this session's whole Production Readiness pass, but production-triggered instead of manually noticed. |
| Location failures increase | Pillar B, `locationAccuracy`-equivalent proxy (agreement rate on the location field specifically) dropping | drop > 5 percentage points week-over-week | Warning | Check LRE resolver logs; this is the one domain where Root Cause C (Baseline V1) is already known and unresolved — an alert firing here may just be that known issue getting worse, not new. |
| Rule regression | Any golden case that was `match` in the immediately-prior scheduled run and is `mismatch`/`ambiguous-but-plausible` in the current one | any single occurrence (n is small enough that any regression here is significant, unlike production-volume metrics) | **Critical** | This is exactly `compareReplayRuns`'s `regressedCount` — already computed, just needs to be *read* automatically instead of manually via `npm run ccqs:compare`. |

**Explicit non-goal**: no notification channel (Slack/email/webhook) is designed here, per
instruction — `CcqsAlertEvent` rows are the entire deliverable; wiring a channel to read them is a
separate, later, explicitly-scoped decision.

---

## 6. Replay Platform evolution

Each proposed capability evaluated on its own, since they don't all belong in the same place —
lumping them together would repeat this document's own opening mistake-to-avoid (treating "Need
Validation" and "Business Readiness" as automatically the same thing, an error the very first
Cognitive Engine plan explicitly had to correct).

| Capability | Belongs in | Why |
|---|---|---|
| **Category replay** (run only golden cases tagged with a given category) | **Replay Platform** (CCQS) | Golden cases already carry `tags: string[]`; this is a pure filter over `opts.dataset` before the existing loop in `run-golden-replay.ts` — zero new architecture, just an optional filter parameter. Directly useful: this session's own scratchpad scripts (`verify-production-readiness-fixes.ts` etc.) manually re-implemented an ad hoc version of exactly this during the Production Readiness pass — this capability would have made those one-off scripts unnecessary. |
| **City replay** | **Replay Platform** (CCQS) | Same reasoning, blocked today only by the Golden Dataset's free-text `expectedLocationCity` lacking a normalized slug to filter on — a small, additive schema extension (flagged, not applied). |
| **Reason-code replay** (re-run only cases whose *previous* run produced a specific reasonCode, e.g. re-check every past `ONTOLOGY.SIBLING` case after a fix) | **Replay Platform** (CCQS) | Also a pure filter, but over the *previous run's results* rather than the static dataset — needs one join (case ids from a prior `CcqsComparisonRecord` query) before calling the existing replay loop. Still fundamentally "replay a subset," not a new capability class. |
| **Targeted replay** (arbitrary case-id list) | **Replay Platform** (CCQS) | The general case of the three above — `opts.dataset` already accepts `readonly GoldenCase[]`; the three above are just named, common filters over it. Recommend implementing this as the one primitive (`filterDataset(dataset, predicate)`), with category/city/reason-code as three named predicates built on it, rather than three separate code paths. |
| **Partial replay** (run N of 33, e.g. for a fast feedback loop while iterating on a fix) | **Replay Platform** (CCQS) | Same primitive as above (a predicate is just "first N" or "random N seeded"). Directly matches this session's own workflow this turn — I traced individual cases with tiny scratchpad scripts specifically to avoid the ~14-minute full-dataset cost before committing to a full replay; a first-class partial-replay mode would make that a supported, permanent tool rather than a disposable script. |
| **Sampling** | **Not Replay Platform — belongs to Pillar B (Production Metric Bucketer) instead** | "Sampling" in the production context named by the user's brief is not "replay a subset of ground truth" (there is no ground truth in production to replay against) — it means "what fraction of real publish traffic should also pay the cost of running the full shadow comparison." That is a load/cost-management decision about live traffic, architecturally unrelated to the Replay Platform's job of re-running a static, curated dataset. Recommend: a `shadowSampleRate` config in the *existing* `cognitiveEngineShadowEnabled` feature-flag family (`src/intake/migration/feature-flags.ts`), not a Replay Platform feature. Flagged as a proposed amendment, not applied. |

**One challenge to a previous decision, surfaced by this review**: `runGoldenReplay`'s current
signature (`dataset: readonly GoldenCase[]`) already technically supports every filtering capability
above with zero type changes — the gap is entirely the *absence* of filter-construction helpers and
CLI flags, not a missing architectural seam. This is good news, not a finding requiring a redesign:
it means Replay Platform evolution is additive, low-risk tooling on top of an already-correct
interface, not a rework.

---

## 7. Cutover Readiness Review

**Verdict: NOT READY.**

This verdict is evidence-based, per instruction, and rests entirely on §1's 9 gaps and §2.1's
ground-truth/ground-truth-free distinction — not on any new concern invented for this section.

### Why NOT READY, not READY WITH CONDITIONS

"READY WITH CONDITIONS" would be the right verdict if the conditions were minor, non-blocking
polish. They are not: the core capability Phase 8 requires — **the ability to detect, in production,
that an authoritative cutover has degraded quality, promptly and specifically enough to act on** —
does not exist today, in any form. Today, if the Cognitive Engine's decisions were made binding on
real traffic and quality silently degraded for a specific category or city, the only way anyone
would find out is a human manually noticing (support complaints, a manual spot-check) or manually
re-running the golden replay CLI and thinking to compare it against a prior run. That is a real,
material, unmitigated production risk for a system serving real users — not a checklist gap.

### Blockers (every one directly traces to a numbered gap in §1)

1. **No production quality signal exists** (G1) — passing the golden-dataset gate today provides
   zero information about live traffic quality.
2. **No per-category/per-city degradation detection exists** (G2) — even if Pillar B existed today,
   a category-specific regression would be invisible in an aggregate scalar.
3. **No time-series/trend capability exists** (G3) — even with per-category production data, there
   is no mechanism to notice a change over time versus a one-off outlier.
4. **Production events cannot be attributed to a specific engine version** (G4) — cutover
   fundamentally means "make one version's decisions binding"; without version-stamped production
   data, a post-cutover regression cannot even be cleanly attributed to the cutover itself versus
   something else changing at the same time.
5. **Replay reproducibility is unverified and, by the `temperature=0.1` finding, not guaranteed**
   (G5) — this weakens confidence in every prior gate-passing result, not just future ones; it
   should be resolved (or at minimum, measured and accepted with eyes open) before treating any
   gate pass as a strong signal.
6. **No alerting exists** (G7) — even with everything else built, nothing would proactively surface
   a regression; a human would still have to remember to look.

### What would need to be true for a future review to say READY

Not "build 100% of this document" — a future review should re-assess once, at minimum: Pillar A is
running on a real recurring schedule with at least several weeks of history (closes G3/G9 for the
ground-truth-bearing side); Pillar B is live with version-stamped events and at least basic
per-category/per-city bucketing (closes G1/G2/G4); the Replay Stability metric has been run at least
once and its result is known and accepted, whatever it turns out to be (closes G5, even if the
answer is "not perfectly deterministic, and here's why that's acceptable" rather than "fixed to be
deterministic" — either is a legitimate resolution, silence is not); and at least the "rule
regression" and "category accuracy drop" alerts from §5 are wired to actually evaluate on a
schedule, even with no delivery channel yet (closes G7 in the sense that matters for readiness —
someone/something is looking, even if it isn't yet paging anyone).

### What is explicitly NOT a blocker

Confidence calibration, control charts, and the full 19-metric table in §3 are valuable but not
gating — Phase 8's core risk is "can we detect a regression after cutover," which the six blockers
above address directly. The remaining metrics refine *how well* you understand a regression once
detected, not *whether* you can detect one at all.

---

## Closing note

No code was written to produce this document, per explicit instruction. SEE, CCQS's existing
frozen surface, the Release Gate thresholds, and the Golden Dataset were read for evidence and are
otherwise unchanged. Three concrete amendments to previously-"frozen" surfaces were identified and
explicitly flagged for separate sign-off, not applied: (1) version-stamping
`CognitiveEngineShadowComparison` payloads (§2.4), (2) extending `QualityMetricSnapshot` with
per-category/per-city breakdowns (§3, closes G2), (3) a normalized city-slug field on `GoldenCase`
(§6). The next decision is Sasan's: which PVW components (if any) to authorize for implementation,
and in what order — this document deliberately stops short of proposing that order as a fait
accompli, since "no implementation until the design is finished" was the explicit instruction this
turn.
