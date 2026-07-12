# Continuous Cognitive Quality System (CCQS) — Architecture Specification

**Status: Architecture approved for implementation. Design-first per instruction; implementation
proceeds incrementally on top of this document. Not part of the Cognitive Engine. Not part of the
Semantic Evaluation Engine (SEE, `PLAN/semantic-comparator-architecture.md`). CCQS is the permanent
quality platform that surrounds both.**

## 0. Why this exists, and why it is a third layer

This session's own investigation is the motivating case study: a real regression (the "موتور
سیکلت" category-rules bug) was found, fixed, and validated by hand — spawning three research
agents, writing one-off scratchpad scripts, manually re-running a 30-fixture batch twice, and
manually comparing two JSON dumps line by line. That process was correct, but it was **not
repeatable, not automated, and not permanent** — the next Cognitive Engine change gets no benefit
from any of that work. CCQS turns this one-off investigation into permanent infrastructure: the
golden cases this session discovered become forever-protected regression tests, the manual
before/after comparison becomes an automatic report, and the question "did this change make things
better or worse" becomes answerable in minutes, forever, for every future change.

**Three layers, three distinct responsibilities:**

| Layer | Answers | Owns |
|---|---|---|
| **Cognitive Engine** | "What does this need mean?" | Evidence → Grounding → Decision → CNO → State → Readiness |
| **SEE** | "How do these two answers differ, and why?" | `compareSnapshots` / `applyScoringPolicy` — a generic, reusable, source-agnostic comparator (already built, Steps 1-7) |
| **CCQS (this document)** | "Is the Cognitive Engine getting better or worse over time, and is a given release safe to ship?" | Curated ground truth, replay orchestration, historical persistence, trend aggregation, release gating |

**CCQS does not reimplement comparison logic.** Every metric in this document is computed by
orchestrating SEE — producing pairs of `SemanticSnapshot`s and calling `compareSnapshots`/
`applyScoringPolicy` exactly as any other consumer would — then persisting and aggregating SEE's
own structured output (`ComparisonReport`, `FinalEvaluation`) at scale, across time and versions.
If CCQS ever needs a NEW comparison capability SEE doesn't have, the SEE architecture gets a change
request through its own process (§14-16 of that document) — CCQS never duplicates or bypasses it.

---

## 1. Core Concepts & Data Model

```
GoldenCase (git-tracked, human-curated ground truth)
       │
       ▼
EngineVersionManifest ──┐
       │                │  (pins: cognitive engine version, SEE contract/comparator
       ▼                │   version, ontology provider versions, rules-registry version)
  ReplayRun ◄───────────┘
       │
       │  for each GoldenCase: run the Cognitive Engine, build two SemanticSnapshots
       │  (ground truth + engine output), call SEE's compareSnapshots + applyScoringPolicy
       ▼
ComparisonRecord[]  (one per case: ComparisonReport + FinalEvaluation + rule trace — Historical Record, frozen forever)
       │
       │  pure aggregation, computed on demand or cached (Derived View, per SEE §16.2's own
       │  Historical-Record-vs-Derived-View discipline, applied consistently here)
       ▼
QualityMetricSnapshot  (accuracy %, confidence distribution, ontology stats, coverage, ...)
       │
       ├──► VersionComparisonReport (vs. another ReplayRun's QualityMetricSnapshot + records)
       └──► GateVerdict (vs. a QualityGatePolicy's configurable thresholds)
```

### 1.1 `GoldenCase`

A permanent, version-controlled, human-verified test case — the "ground truth" SEE compares engine
output against. **Lives in git, not only a database row** — ground truth must be reviewable in a
PR diff, attributable to a person/reason, and immune to silent runtime mutation.

```ts
interface GoldenCase {
  caseId: string;                        // stable, never reused even if deprecated
  rawText: string;                       // the exact input text
  expectedCategory: string | null;       // canonical category slug, or null (genuinely no category — e.g. a control case)
  expectedLocationCity: string | null;   // raw city text; null means "no location expected"
  tags: string[];                        // e.g. ['vehicle-collision', 'p3-regression-guard']
  addedAt: string;
  reason: string;                        // WHY this case exists — mandatory, never "just because"
  deprecated: boolean;                   // never deleted, only deprecated (mirrors SEE's reason-code lifecycle, §14.5)
}
```

`expectedCategory`/`expectedLocationCity` deliberately mirror exactly two of SEE's already-active
fields (category, location) — `expectedIntent` is NOT added yet, because no intent classifier
exists to be measured against (§3.3 is explicit about this rather than fabricating a field nothing
can honestly populate).

### 1.2 `EngineVersionManifest`

Identifies a specific, reproducible configuration of everything that can affect a decision —
extending SEE's own versioning axes (§6 of the SEE doc) with the one axis SEE doesn't track because
it isn't SEE's concern: the category rules registry.

```ts
interface EngineVersionManifest {
  label: string;                          // human label, e.g. "post-P1-P3-fix-2026-07-08"
  cognitiveEngineVersion: string;
  semanticContractVersion: string;        // from SEE
  comparatorEngineVersion: string;        // from SEE
  ontologyVersions: Record<string, string>; // from SEE's OntologyProvider.version, per namespace
  rulesRegistryVersion: string;           // NEW — see §2 below, did not exist before this document
  gitCommit: string | null;
  createdAt: string;
}
```

**Gap found and closed while designing this**: the category rules registry
(`src/intake/rules/legacy-bridge.ts` + `*.pack.json`) had no version identifier at all — exactly
the kind of change this session's own Priority 3 fix made, with no way to say "which rules version
produced this decision." `RULES_REGISTRY_VERSION` is added as part of this implementation (§2).

### 1.3 `ReplayRun`

One execution of a dataset against one `EngineVersionManifest`.

```ts
interface ReplayRun {
  id: string;
  engineVersion: EngineVersionManifest;
  datasetRef: string;          // e.g. 'golden-dataset@v1', or a production-shadow time window
  status: 'running' | 'completed' | 'failed';
  triggeredBy: 'manual' | 'ci' | 'scheduled';
  startedAt: string;
  completedAt: string | null;
}
```

### 1.4 `ComparisonRecord` — Historical Record, frozen forever

```ts
interface ComparisonRecord {
  id: string;
  replayRunId: string;
  caseId: string;                 // GoldenCase.caseId, or a production requestId
  comparisonReport: ComparisonReport;   // SEE's own type, verbatim
  finalEvaluation: FinalEvaluation;     // SEE's own type, verbatim
  ruleTrace: RuleTraceEntry[];    // CCQS-only data SEE doesn't carry — see §2
  createdAt: string;
}
```

Per SEE §16.2's discipline, applied consistently here: once written, a `ComparisonRecord` is never
edited. A new `EngineVersionManifest` always produces a new `ReplayRun` with its own new
`ComparisonRecord`s — never an in-place update of history (INV-16 applies transitively).

### 1.5 `QualityMetricSnapshot` — Derived View, cached for convenience

Everything in §3 (the 14 required capabilities) is a field on this type, computed by pure
aggregation over one `ReplayRun`'s `ComparisonRecord`s. Like SEE's `counts`/`perField` fields
(§16.2), this is mechanically re-derivable from Historical Record data with zero information loss
— cached for query convenience, never treated as more authoritative than the records it summarizes.

### 1.6 `QualityGatePolicy` / `GateVerdict`

Mirrors SEE's `ScoringPolicy` governance exactly (same immutable-once-published discipline, §14.4
of the SEE doc, reused here rather than reinvented): a named, versioned, configurable set of
thresholds; evaluating a `QualityMetricSnapshot` against one produces a `GateVerdict`.

```ts
interface QualityGatePolicy {
  policyId: string;
  policyVersion: string;
  thresholds: {
    minCategoryAccuracy: number;         // e.g. 0.90
    minLocationAccuracy: number;
    maxAmbiguousRate: number;
    maxNewMismatchCaseIds: number;       // count of previously-passing golden cases now failing
    maxFalsePositiveRate: number;
  };
  isActive: boolean;
}

interface GateVerdict {
  replayRunId: string;
  gatePolicyId: string;
  gatePolicyVersion: string;
  verdict: 'pass' | 'fail' | 'warn';
  reasons: Array<{ thresholdKey: string; actual: number; required: number; met: boolean }>;
  decidedAt: string;
}
```

---

## 2. Rule Coverage — the one place CCQS needs data SEE doesn't carry

SEE's `cognitive-to-snapshot.ts` adapter intentionally discards `matchedRules` (per its own
disclosed, documented loss — "Potential Semantic Losses" in the SEE doc §15.3) because
per-candidate provenance detail has no home in the generic `SemanticValue` contract, and adding one
there would be a SEE-contract change out of proportion to one consumer's need. CCQS legitimately
needs this data for rule-coverage analysis, so **CCQS collects it itself, at replay time, as its
own concern** — calling `matchCategoryCandidatesFromRules` once more during replay (cheap: pure,
already-cached rule data, no LLM) to capture `matchedRules: string[]` per case, stored in
`ComparisonRecord.ruleTrace`, never touching SEE's contracts.

```ts
interface RuleTraceEntry {
  fieldId: 'category';
  matchedRuleIds: string[];
}
```

Aggregating `ruleTrace` across a `ReplayRun`'s cases yields: which rules fired at least once
(utilization), which never fired across the entire golden dataset (candidate dead rules — relevant
context for the separately-tracked 1.24M-rule volume issue, `task_954ab24b`), and — the direct,
permanent generalization of this session's Priority 3 investigation — which golden cases produced
**zero** matched rules for a field that should have one (an automatic, ongoing "موتور سیکلت
class" detector, never again requiring a manual investigation to notice).

`RULES_REGISTRY_VERSION` (new, `src/intake/rules/registry-version.ts`) is a manually-bumped string
constant, incremented whenever `legacy-bridge.ts` or a `*.pack.json` file's *matching behavior*
changes — mirrors exactly how `CATEGORY_ONTOLOGY_VERSION` (SEE, Step 2) is maintained.

---

## 3. The Fourteen Required Capabilities

| # | Capability | Concrete definition | Data source |
|---|---|---|---|
| 1 | Golden evaluation dataset | `GoldenCase[]`, git-tracked, §1.1 | New: `src/ccqs/golden-dataset/` |
| 2 | Historical replay framework | `runGoldenReplay(engineVersion)` — §4 | New: `src/ccqs/replay/` |
| 3 | Version-to-version comparison | `compareReplayRuns(runA, runB)` — §5 | Two `ReplayRun`s' `ComparisonRecord`s |
| 4 | Drift trend monitoring | Time series of `QualityMetricSnapshot` across `ReplayRun`s, keyed by `createdAt` — golden-dataset runs AND production-shadow-window runs (§7) both feed the same series | `CcqsReplayRun` rows over time |
| 5 | Confidence distribution analysis | Histogram of engine-side `SemanticFieldValue.confidence`, bucketed (e.g. deciles), per field | `ComparisonRecord.comparisonReport.fieldResults[].snapshotBValue.confidence` |
| 6 | Category accuracy metrics | `match ∪ refinement ∪ semantic-equivalent` count ÷ comparable count, for `fieldId='category'`, golden-dataset runs only (has real ground truth) | Same |
| 7 | Location accuracy metrics | Same formula, `fieldId='location'` | Same |
| 8 | Intent accuracy metrics | **Explicitly N/A today** — no intent classifier exists in the Cognitive Engine (documented gap, `canonical-need.ts`'s `primaryIntent` is raw ACTION evidence, not a classification). Metric is defined and wired to report `null`/"not yet measurable" rather than a fabricated number. Activates automatically the day a real classifier exists — no CCQS change needed then, since it already speaks SEE's generic per-field format. | — |
| 9 | Ontology refinement statistics | Group `fieldResults` where `reasonCode` starts with `ONTOLOGY.` by exact code, count per `ReplayRun` | `ComparisonRecord.comparisonReport.fieldResults[].reasonCode` |
| 10 | False-positive / false-negative tracking | FP: engine `state='resolved'` but `status='mismatch'`/`'contradiction-detected'` (confidently wrong) — golden-dataset only. FN: engine `state∈{'missing','unknown'}` but ground truth `state='resolved'` (should have found something, golden-dataset only — production shadow has no ground truth for this) | `snapshotBValue.state` + `status`, cross-referenced against `snapshotAValue` = ground truth |
| 11 | Ambiguous case tracking | Rate of `status='ambiguous-but-plausible'` + engine `state='ambiguous'`; also which `caseId`s repeat across consecutive `ReplayRun`s (a case ambiguous for 3+ versions running is a standing rules/ontology gap, not noise) | `ComparisonRecord`s across consecutive runs, same `datasetRef` |
| 12 | Rule coverage analysis | §2 | `ComparisonRecord.ruleTrace` |
| 13 | Shadow quality dashboard | Data contract designed, §8 — implementation deferred (explicitly incremental per instruction) | `QualityMetricSnapshot` + trend series |
| 14 | Release quality gates | §1.6, §6 | `QualityMetricSnapshot` + `QualityGatePolicy` |

---

## 4. Historical Replay Framework

Implements SEE's own §16 Replay Contract at scale, for real:

- **Original versions**: every `ComparisonRecord` is tagged with its producing `EngineVersionManifest` (via its `ReplayRun`). Reading an old run never re-executes anything (§16.1 "Read").
- **Latest versions**: running `runGoldenReplay()` again with the current engine produces a NEW `ReplayRun` — never overwrites the old one (INV-16).
- **Arbitrary version comparison**: `compareReplayRuns(runA, runB)` works for any two runs, regardless of how far apart in time or how many versions apart — the exact "Ontology v3 → Evaluation → Ontology v8 → Replay" scenario SEE's doc walked through, now automated: re-evaluating the SAME golden dataset against a new engine version is a **Re-evaluation** (§16.1), producing a new run to diff against the old one, never mutating it.
- **Without modifying historical records**: enforced structurally — `ComparisonRecord` rows are only ever `INSERT`ed, never `UPDATE`d (§9's Prisma schema has no update path in any CCQS code).

```ts
async function runGoldenReplay(opts: {
  engineVersion: EngineVersionManifest;
  dataset: GoldenCase[];
  triggeredBy: 'manual' | 'ci' | 'scheduled';
}): Promise<{ replayRunId: string; recordCount: number }>;
```

Per case: run the real Cognitive Engine pipeline on `rawText` → adapt to a `SemanticSnapshot`
(reusing SEE's `cognitiveResultToSemanticSnapshot` unchanged) → build a ground-truth
`SemanticSnapshot` from the `GoldenCase`'s expected values (new: `goldenCaseToTruthSnapshot`,
mirroring `legacyDraftToSemanticSnapshot`'s structure) → `compareSnapshots` → `applyScoringPolicy`
→ persist. Zero new comparison logic; 100% reuse of already-built, already-tested SEE code.

---

## 5. Version-to-Version Comparison — answering the Regression Protection questions

```ts
interface VersionComparisonReport {
  runA: { id: string; engineVersion: EngineVersionManifest };
  runB: { id: string; engineVersion: EngineVersionManifest };
  metricDeltas: Record<string, { before: number; after: number; delta: number }>;
  caseDiffs: Array<{
    caseId: string;
    fieldId: string;
    before: { status: ComparisonStatus; reasonCode: string };
    after: { status: ComparisonStatus; reasonCode: string };
    classification: 'improved' | 'regressed' | 'unchanged' | 'newly-comparable' | 'newly-not-comparable';
  }>;
  improvedCount: number;
  regressedCount: number;
}
```

`classification` is a simple, honest ranking over SEE's own status vocabulary (`match` >
`refinement`/`semantic-equivalent` > `ambiguous-but-plausible` > `mismatch`/`contradiction-detected`)
— a case moving to a higher rank is `improved`, lower is `regressed`, same rank is `unchanged`.

**This directly answers every Regression Protection question from the request, mechanically:**
- *Did quality improve/regress?* — `improvedCount` vs `regressedCount`, and each `metricDeltas` entry's sign.
- *Which categories/locations changed?* — filter `caseDiffs` by `fieldId`.
- *Which ontology relationships changed?* — filter `caseDiffs` where `before.reasonCode`/`after.reasonCode` starts with `ONTOLOGY.`.
- *Which confidence distributions shifted?* — diff the two runs' confidence histograms (§3 #5).
- *Exactly why?* — `reasonCode` + the full `reasonParams` already sitting in each run's
  `ComparisonRecord.comparisonReport` — no extra explanation layer needed, SEE's own explainability
  guarantee (INV-04) already carries the "why."

**This is not hypothetical** — run retroactively against this session's own before/after data
(Step 7 baseline vs. the post-fix validation batch), `compareReplayRuns` would have produced,
automatically, exactly the manually-built table already in `phase7-drift-investigation-report.md`:
4 `caseId`s classified `improved` (the موتور سیکلت cases, `reasonCode` `STATE.ONE_SIDE_MISSING` →
`ONTOLOGY.IDENTICAL`), 0 regressed. §10 uses this exact retroactive run as the system's first
real-world validation.

---

## 6. Release Quality Gate

```ts
function evaluateGate(metrics: QualityMetricSnapshot, policy: QualityGatePolicy): GateVerdict;
```

Pure, deterministic, no I/O — same discipline as SEE's `applyScoringPolicy` (§4 of the SEE doc):
every threshold check is independent and reported individually (`reasons[]`), never collapsed into
an unexplained boolean. `verdict = 'fail'` if any threshold is violated; `'warn'` if within a
configurable soft margin (e.g. 90% of the way to a threshold) of any; `'pass'` otherwise.

**Configurable, per §"Quality thresholds must be configurable"**: multiple `QualityGatePolicy`
rows can coexist (e.g. a strict policy for release branches, a lenient one for early-stage
experiments) — the CALLER picks which policy applies, exactly mirroring SEE's `PolicyScope`
resolution pattern (§4 of the SEE doc) rather than inventing a new selection mechanism.

**Not wired into an actual CI pipeline in this implementation** — that requires a DevOps/CI
decision (which pipeline, which stage, who can override a failed gate) outside pure application
code, and is named as an explicit Phase 2 item (§11), not built speculatively now.

---

## 7. Drift Trend Monitoring — two feeding streams, one series

- **Golden-dataset runs**: triggered manually or by CI on every Cognitive Engine change — sparse,
  high-confidence (has ground truth), the primary release-gating signal.
- **Production-shadow runs**: the EXISTING `CognitiveEngineShadowComparison` events (already
  flowing continuously from `src/app/api/need-intake/publish/route.ts` since Step 6) — dense,
  real-world, but WITHOUT ground truth (legacy-vs-cognitive, neither guaranteed correct). CCQS
  periodically ingests a time window of these into a `ReplayRun` with `datasetRef` describing the
  window (e.g. `production-shadow:2026-07-01..2026-07-08`), computing the SAME
  `QualityMetricSnapshot` shape (minus the ground-truth-only metrics: accuracy, FP/FN) — giving a
  continuous trend line between the sparser golden-dataset checkpoints.

Both feed the same `QualityMetricSnapshot`/trend-series shape — a dashboard or gate never needs to
know which kind of run produced a given data point, only whether ground-truth-dependent metrics are
present (`null` when not applicable, never fabricated).

---

## 8. Shadow Quality Dashboard — data contract (design only, per instruction)

Not built in this pass. The contract it will read, so a future UI/API layer has a stable target:

```ts
interface DashboardQuery {
  metric: keyof QualityMetricSnapshot;
  datasetRef?: string;              // filter to golden-dataset or a specific production window
  sinceEngineVersion?: string;
  limit?: number;
}
// Returns: Array<{ replayRunId, engineVersion, createdAt, value }> — a plain time series,
// renderable by any charting library without CCQS knowing which one.
```

A dashboard is a READ-ONLY consumer of already-computed `QualityMetricSnapshot`s — it never
computes metrics itself, never talks to SEE directly, and never triggers a replay (that's a
separate, explicit, authenticated action). This keeps the eventual UI layer thin and stateless.

---

## 9. Persistence — Prisma schema, append-only

```prisma
model CcqsEngineVersion {
  id                      String   @id @default(cuid())
  label                   String
  cognitiveEngineVersion  String
  semanticContractVersion String
  comparatorEngineVersion String
  rulesRegistryVersion    String
  ontologyVersions        String   // JSON: Record<namespace, string>
  gitCommit               String?
  createdAt               DateTime @default(now())
  replayRuns              CcqsReplayRun[]
}

model CcqsReplayRun {
  id              String    @id @default(cuid())
  engineVersionId String
  engineVersion   CcqsEngineVersion @relation(fields: [engineVersionId], references: [id])
  datasetRef      String
  status          String    // 'running' | 'completed' | 'failed'
  triggeredBy     String    // 'manual' | 'ci' | 'scheduled'
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  comparisons     CcqsComparisonRecord[]
  gateVerdicts    CcqsGateVerdict[]
  @@index([datasetRef])
  @@index([status])
}

model CcqsComparisonRecord {
  id               String   @id @default(cuid())
  replayRunId      String
  replayRun        CcqsReplayRun @relation(fields: [replayRunId], references: [id])
  caseId           String
  comparisonReport String   // JSON — SEE's ComparisonReport, verbatim
  finalEvaluation  String   // JSON — SEE's FinalEvaluation, verbatim
  ruleTrace        String   // JSON — RuleTraceEntry[], CCQS-only
  createdAt        DateTime @default(now())
  @@index([replayRunId])
  @@index([caseId])
}

model CcqsGatePolicy {
  id            String   @id @default(cuid())
  policyId      String
  policyVersion String
  thresholds    String   // JSON
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  gateVerdicts  CcqsGateVerdict[]
  @@unique([policyId, policyVersion])
}

model CcqsGateVerdict {
  id            String   @id @default(cuid())
  replayRunId   String
  replayRun     CcqsReplayRun @relation(fields: [replayRunId], references: [id])
  gatePolicyId  String
  gatePolicy    CcqsGatePolicy @relation(fields: [gatePolicyId], references: [id])
  verdict       String
  reasons       String   // JSON
  decidedAt     DateTime @default(now())
  @@index([replayRunId])
}
```

No CCQS code path ever issues an `UPDATE` against `CcqsComparisonRecord` — the only mutable field
anywhere is `CcqsReplayRun.status`/`completedAt` (transitioning `running` → `completed`/`failed`
exactly once), which describes the run's own lifecycle, not a historical result.

**Why real Prisma models, not another `IntakeMigrationEvent`-style generic JSON table**: that table
was a reasonable low-volume stopgap for SEE's shadow comparisons; a system explicitly required to
"support years of accumulated production history" with per-case, per-field, per-version querying
(accuracy trends, rule coverage joins, version diffs) needs real indexed columns, not JSON-blob
scans at scale. This is exactly the kind of permanent infrastructure decision the instruction asked
for — no shortcuts.

---

## 10. Non-goals (explicit, not silently deferred)

- **Dashboard UI/API implementation** — data contract designed (§8), not built.
- **CI pipeline wiring for the release gate** — the pure `evaluateGate` function is built and
  tested; deciding which CI stage calls it, and who can override a failure, is a DevOps decision
  outside this document's scope.
- **Production-shadow-window ingestion automation** (§7's second stream) — the `QualityMetricSnapshot`
  shape already supports it; the scheduled job that periodically creates these `ReplayRun`s is not
  built in this pass (needs a scheduling decision — cron, queue worker, etc.).
- **Intent accuracy** — genuinely not measurable yet; wired to report its absence honestly, not
  fabricated.
- **A columnar/analytics-optimized store** — Postgres with the indexes above is sufficient for the
  current and near-future scale; revisit only if real query performance ever demands it.

## 11. Implementation Order

1. `RULES_REGISTRY_VERSION` constant (§2) — small, prerequisite for accurate `EngineVersionManifest`s.
2. Prisma schema + migration (§9).
3. Types (`GoldenCase`, `EngineVersionManifest`, `ComparisonRecord`, `QualityMetricSnapshot`,
   `VersionComparisonReport`, `QualityGatePolicy`/`GateVerdict`) as Zod schemas, matching SEE's own
   contract-first style.
4. Golden dataset v1 — reuse and extend this session's 30 investigation fixtures, with explicit
   regression-guard cases for the موتور سیکلت / spare-parts / confidence-scale / LRE-permissiveness
   fixes just shipped.
5. `goldenCaseToTruthSnapshot` adapter + `runGoldenReplay` orchestrator.
6. Metrics aggregation functions (§3, all except #13).
7. `compareReplayRuns` + `evaluateGate`.
8. Permanent CLI entry points (`npm run ccqs:replay`, `npm run ccqs:compare`) — not scratchpad
   scripts, checked into `scripts/ccqs/`.
9. Run once for real: replay the golden dataset against the current (post-P1-P3-fix) engine
   version, persist as the permanent v1 baseline `ReplayRun` every future comparison measures
   against.
