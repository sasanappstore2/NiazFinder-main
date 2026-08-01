# Replay Determinism Audit (Design/Investigation Only — Not Implemented)

**Status: Permanent architecture document, alongside the RFCs, CCQS, and the PVW architecture doc.
This is a scientific audit, not a fix. No production code was changed to produce this document.
Every claim below is either (a) a direct citation of a real source line, or (b) a result of an
actual, real, empirical test run against the live local LLM (`gemma-4-E4B_q4_0-it.gguf` via
llama-server) — never a static assumption presented as fact.**

---

## 0. Why this investigation exists

The Production Validation Window document flagged, as its most severe open question (G5),
that SEE's Historical Record contract assumes "Replay Verification: re-run with pinned versions
MUST reproduce the old answer" (§16.1, INV-17) — and that this had never actually been tested
against the real Evidence-extraction LLM, which runs at `temperature: 0.1` (nonzero). Sasan asked
for a dedicated, evidence-only investigation before any PVW component is built, since PVW's
Replay Stability metric (and the Release Gate's entire meaning) rests on this assumption being
either true, false, or true-with-caveats — and nobody had actually checked which.

**Headline finding, stated up front because it changes the shape of every section below**: the
prior framing ("replay determinism is unverified and possibly broken") was *half* right and *half*
too pessimistic. It is verified, with real evidence, that:

1. The Evidence-extraction LLM step **is measurably non-deterministic** — confirmed empirically,
   not assumed (§4).
2. That non-determinism **does not currently reach** the two fields (`category`, `location`) that
   SEE/CCQS/the Release Gate actually compare — also confirmed empirically, and explained by a
   real, verifiable structural property of the code, not luck (§1, §4).
3. However, **several other real, independently-verified non-determinism sources exist** in the
   Grounding stage (filesystem read order, an unversioned live database dependency, an in-process
   cache) that have nothing to do with the LLM and were not previously named anywhere — these are
   arguably a bigger, quieter risk than the LLM temperature question that prompted this audit
   (§1, §2).

So the honest one-line answer to "is the Cognitive Engine truly replayable" is: **the specific
metrics the Release Gate currently reads are replay-stable today, but for reasons that are partly
structural (robust) and partly accidental (fragile, could silently break) — and the true CNO/
Evidence layer, if it is ever compared directly, is not replay-stable at all.**

---

## 1. End-to-end determinism audit

**Correction to the assumed pipeline order, stated explicitly**: the request describes the order as
`NeedDraft → Canonical Need → Evidence Extraction → Grounding → Ontology → Decision Engine →
Business Readiness → SEE → CCQS → Release Gate`. The **real, verified execution order** (
`src/cognitive-engine/pipeline/run-cognitive-pipeline.ts:52-60`) is: **Evidence Extraction →
Grounding → Decision Engine → Canonical Need Object (+ Claims) → Cognitive State → Readiness**,
then externally, **SEE → CCQS → Release Gate**. Canonical Need is built *from* Decisions, not
before Evidence Extraction — this is documented in the pipeline file's own header comment as a
deliberate deviation from the RFC's prose (ADR-054, "implementations MAY optimize execution; they
SHALL preserve semantic equivalence"). The table below follows the **real** order; this is itself a
finding worth stating under "challenge previous assumptions" — the mental model implied by the
investigation's own framing doesn't match the shipped code.

| Stage | Deterministic? | Probabilistic? | External state? | Model randomness? | Timestamps? | DB ordering? | Hash/iteration order? | Cache? | Concurrency? | Float ordering? |
|---|---|---|---|---|---|---|---|---|---|---|
| **Input (rawText)** | Yes | No | No | No | No | No | No | No | No | No |
| **Evidence Extraction** (`openai-compatible-adapter.ts`) | **No** | **Yes** — `temperature: 0.1`, no `seed`, no `top_p` pinned (verified: absent from the request body, `local-chat-client.ts:105-115`) | Yes — depends on the LLM server being reachable within timeout; retries on 5xx (`local-chat-client.ts:98-137`) | **Yes**, confirmed empirically (§4) | Yes — `extractedAt: now` per evidence item (`openai-compatible-adapter.ts:77`), **metadata only, not compared anywhere downstream** (verified) | No | No — evidence item `id` is `toEvidenceId(index)`, a deterministic sequential id, **not** `randomUUID()` (verified, `openai-compatible-adapter.ts:69`) | No | No — one HTTP call per invocation, no shared mutable state | N/A |
| **Grounding — category** (`grounding/resolver.ts` → `matchCategoryCandidatesFromRules`) | Yes, *given a fixed rule set* | No | No | No | No | No | **Yes — real finding**: rule-pack files are loaded via `readdirSync(dir)` with no `.sort()` (`registry.server.ts:47`); POSIX `readdir` order is filesystem-dependent, not alphabetical or otherwise guaranteed | **Yes** — `packRulesCache`/`packsBySlug` are module-level, process-lifetime caches (`registry.server.ts:22-24`); rebuilt once per process, never invalidated | Safe today only because replay is strictly sequential (§1 concurrency row below) | Candidate sort (`category-matcher.ts:93`, `b.score - a.score`) is a **stable** sort (Node ≥11) — safe *given* deterministic input order, which depends on the iteration-order finding above |
| **Grounding — location** (`location-lre-bridge.ts` → `resolveLocationLre` → `location-fuse-index.ts`) | Yes, *given a fixed catalog* | No | **Yes — real finding**: `db.intakeCity.findMany({...})` has **no `orderBy`** (`location-fuse-index.ts:57`); falls back to a JSON catalog capped at 500 cities (`.slice(0, 500)`, line 129) if Postgres is unreachable — **a categorically different, smaller candidate universe**, not just a reordering | No | No | **Yes — real finding, same class as above**: unordered `findMany` | **Yes — real finding**: `cachedRecords`/`cachedFuse` are module-level, process-lifetime, never invalidated (`location-fuse-index.ts:27-28`) | Safe today only under sequential replay | Fuse.js scoring is deterministic given a fixed index; ties among fuzzy matches inherit whatever order the (unordered) DB query returned |
| **Ontology** (`CategoryOntologyProvider`) | **Yes — STRICT** | No | No | No | No | No | No | No | No | No — reads the static `src/config/categories.ts` tree only |
| **Decision Engine** (`decision-engine.ts`) | **Yes — STRICT** | No | No | No | No | No | No (uses a `Set` only for O(1) membership testing of `invalidatedIds`, never iterated in an order-dependent way) | No | No | `.sort((a,b) => b.score - a.score)` (line 95) — stable, deterministic given deterministic input |
| **Canonical Need Object + Claims** (`build-canonical-need.ts`, `claims.ts`) | Yes, *for the fields SEE compares* | No | No | No | Yes — `now` flows into `identity.createdAt/updatedAt` and `claim.createdAt`; **verified not read by `cognitiveResultToSemanticSnapshot`** (§1.1 below) | No | No | No | No | `resolveBudget(rawText)` is regex-based, deterministic |
| **Cognitive State + Readiness** | **Yes — STRICT** | No | No | No | No | No | No | No | No | Pure functions of already-deterministic Decisions/CNO |
| **SEE — Comparator (`compareSnapshots`)** | **Yes — STRICT** | No | No | No | `comparedAt` is caller-supplied, not compared | No | No | No | No | Ontology `distance` computed by integer hop-count, no floats |
| **SEE — Scoring Policy (`applyScoringPolicy`)** | **Yes — STRICT** | No | No | No | No | No | No | No | No | Weighted sum over a fixed field list — floating-point addition order is fixed (policy field order is a static array) |
| **CCQS — Aggregation (`aggregateQualityMetrics`)** | **Yes — STRICT**, *given records in a fixed order* | No | No | No | No | **Yes, but mitigated**: `readReplayRecords` does specify `orderBy: { createdAt: 'asc' }` (`read-replay-records.ts:14`) — correctly ordered *today* | Uses `Map`s (`ontologyStatsMap`, `allMatchedRuleIds`) converted via `[...map.entries()]`/`[...set]` — JS Map/Set iteration order is insertion order (spec-guaranteed), so this is safe **given** the already-ordered input array | No | Only safe because replay is sequential — see concurrency note below | Simple counters and ratios; no float-ordering sensitivity |
| **CCQS — Version Comparison (`compareReplayRuns`)** | **Yes — STRICT** | No | No | No | No | No | Uses `Map`/`Set` (`byCaseA`, `byCaseB`, `allCaseIds`) — same insertion-order-safe pattern as above | No | No | N/A |
| **Release Gate (`evaluateGate`)** | **Yes — STRICT** | No | No | No | No | No | No | No | No | Simple threshold comparisons |

### 1.1 One structural fact this table depends on, verified directly

`cognitiveResultToSemanticSnapshot` (`src/semantic-evaluation-engine/adapters/cognitive-to-snapshot.ts:108-124`)
builds the compared `SemanticSnapshot` **exclusively** from `result.decisions` (category + location
`Decision` objects) — it never reads `result.cno`, `result.evidence`, or any timestamp. This is the
single fact that insulates the whole downstream chain (Decision Engine → SEE → CCQS → Gate) from
Evidence Extraction's non-determinism *today*. It is a real, load-bearing property of the current
code — and also a silent one: nothing enforces it, documents it as a contract, or would fail loudly
if a future change (e.g. wiring `primaryIntent` or evidence-derived fields into SEE's field specs)
quietly broke it. This is named explicitly in §3 as an unstated, unguarded Replay Contract
assumption.

### 1.2 Concurrency note (a real, if currently latent, gap)

Every determinism guarantee above that depends on "input records are read in a fixed order" is
**only true because `runGoldenReplay` runs its `for...of` loop strictly sequentially** (verified,
`run-golden-replay.ts:71`) and `readReplayRecords` explicitly orders by `createdAt`. Two things
should be named honestly: (a) production shadow events (`CognitiveEngineShadowComparison`) are
written by many **concurrent** real publish requests — if any future code ever needed to process
those in a guaranteed order (PVW's Pillar B, not yet built), `createdAt`'s millisecond resolution
would not be a safe ordering key under real concurrent write volume, a genuine forward-looking risk
already foreshadowed in the PVW document; (b) nothing in the current Golden Replay path is
parallelized, so this is **not an active bug today** — it is a documented precondition that must be
re-verified if replay is ever parallelized for speed (a reasonable future ask, given the ~15-35s/
case latency Baseline Report V1 already flagged).

---

## 2. Randomness audit

Every source found, verified against real code (no source is included on suspicion alone).

| Source | Found where | Severity | Current behavior | Required behavior |
|---|---|---|---|---|
| **LLM temperature (0.1, no seed)** | `local-chat-client.ts:109`, `openai-compatible-adapter.ts:46` | **High in isolation, Low in current effective blast radius** (see §1.1) | Confirmed by direct empirical test (§4): raw Evidence-extraction output can vary run-to-run on identical input. Does not currently affect the compared category/location decision. | If Evidence content is ever compared directly (future SEE field-spec extension), this becomes High-severity in practice, not just in isolation — a `seed` parameter and/or `temperature: 0` should be evaluated *for the replay/evaluation code path specifically* before that happens (see §6 recommendation — not decided here). |
| **LLM retries on transient failure** | `local-chat-client.ts:98-137` (`maxRetries`, retries on `status >= 500`) | Medium | A retry after a partial/failed attempt is a fresh independent sampling draw — theoretically could differ from what attempt 1 would have produced had it succeeded. More importantly: exhausting all retries returns `null`, which makes `runCognitivePipeline` return `null`, which makes the case a `skippedCaseIds` entry in replay (`run-golden-replay.ts:82-85`) rather than a comparison record. | A case's presence/absence in `totalCases` should not depend on transient network conditions at replay time. Worth a documented, versioned "minimum required success rate" or an explicit retry-until-success policy for replay specifically (not production, where fast-fail is reasonable) — a future design question, not resolved here. |
| **Category rule-pack load order** (`readdirSync`, no sort) | `registry.server.ts:47` | **Medium — real, verified, previously unknown** | Filesystem-dependent order feeds a `Map` (insertion-order-preserving) whose `.values()` iteration order therefore inherits filesystem order. Only observable in an **exact score tie** between candidates whose contributing rules come from different pack files loaded in different order. | Sort pack file names before iterating (e.g. `readdirSync(dir).sort()`), or add a fully deterministic secondary tie-break (alphabetical by slug) at the final candidate-sort step in `category-matcher.ts`, independent of load order. Not implemented here — recommendation only. |
| **Location catalog DB query, no `orderBy`** | `location-fuse-index.ts:57` | **Medium-High — real, verified, previously unknown** | Postgres row order without `ORDER BY` is not a guaranteed contract — commonly stable in practice for a static, unmodified table, but not documented or enforced, and could change silently (index rebuild, replication failover, planner change) with zero application code change. | Add an explicit deterministic `orderBy` (e.g. by `id` or `slug`) — cheap, safe, closes this permanently. Recommendation only. |
| **Location catalog: DB-available vs. DB-unavailable fallback** | `location-fuse-index.ts:124-129` (JSON fallback capped at 500 cities) | **High — real, verified, previously unknown, unrelated to the LLM entirely** | Two runs of the identical replay, one with Postgres reachable and one without, use a **structurally different candidate universe** (full active-city set vs. ≤500-city JSON snapshot) — not a reordering, a different dataset. Neither the golden dataset's `EngineVersionManifest` nor any CCQS record captures "was the DB catalog reachable at replay time." | This dependency should be version-stamped (a `locationCatalogVersion`/`locationCatalogSource` field) the same way `RULES_REGISTRY_VERSION` already versions the category rules — currently the *only* untracked knowledge-source dependency in the whole system. Recommendation only, matches PVW's own G4-style finding but for a different subsystem. |
| **Module-level in-process caches** (`packRulesCache`, `packsBySlug`, `cachedRecords`, `cachedFuse`) | `registry.server.ts:22-24`, `location-fuse-index.ts:27-28` | Low, given current sequential-only usage | Warmed once per process, never invalidated — deterministic *within* one process's lifetime, but two separate CLI invocations of `npm run ccqs:replay` (two separate Node processes) each warm independently, so if underlying DB/pack-file content changed between the two invocations, results legitimately (and correctly) differ — this is expected behavior, not a bug, but is currently **unversioned and unstated** as a replay precondition. | No code change needed — but the assumption ("catalog/rules content did not change between run A and run B") should be an explicit, checked precondition of any future cross-run trend comparison (PVW), not a silent assumption. |
| **`new Date().toISOString()` calls** (multiple: pipeline default `now`, adapter's `extractedAt`, replay's per-case `now`) | `run-cognitive-pipeline.ts:47`, `openai-compatible-adapter.ts:67`, `run-golden-replay.ts:74` | **Low, verified inert** | Every one of these flows only into metadata fields (`identity.createdAt`, `claim.createdAt`, `evidence.extractedAt`) that are never read by `cognitiveResultToSemanticSnapshot` (§1.1). Confirmed by direct code trace, not assumption. | None required today. Would become live risk only if a future change compared CNO metadata directly. |
| **`randomUUID()` calls** (snapshot/report/evaluation IDs in `run-golden-replay.ts`, `publish/route.ts`) | Multiple call sites | **Low, verified inert** | Used exclusively as opaque identifier fields (`snapshotId`, `reportId`, `evaluationId`) — never as a sort key, never fed into scoring or comparison logic. Confirmed by reading every consumer of these IDs. | None required. |
| **`Map`/`Set` iteration order** (CCQS aggregation, comparison) | `aggregate-quality-metrics.ts`, `compare-replay-runs.ts` | Low, given upstream input order is fixed | JS `Map`/`Set` iteration order is insertion order, which is spec-guaranteed (not implementation-defined, unlike plain-object key order for non-integer-like keys) — this is actually a **safe** pattern, correctly relying on a real language guarantee, not an accidental one. | None required — flagged here to explicitly confirm it was checked and is fine, not skipped. |
| **Array `.sort()` stability** (category matcher, decision engine) | `category-matcher.ts:93`, `decision-engine.ts:50,95` | Low, given upstream input order is fixed | V8/Node has guaranteed stable `Array.prototype.sort` since Node 11 — ties preserve original order. Safe **given** that original order is itself deterministic, which is exactly the condition the two "Medium/High" findings above threaten. | None required directly — but this is precisely *why* the load-order findings above matter: stable sort faithfully preserves an upstream nondeterminism instead of masking it. |
| **Floating-point summation order** (Scoring Policy's weighted sum) | `apply-scoring-policy.ts` | Low | Summed over a static, fixed-order field list (`SEE_FIELD_SPECS`) — same order every time, same float rounding every time. | None required. |
| **Concurrency / parallel `Promise` ordering** | `groundEvidence`'s `Promise.allSettled([groundLocation(...), groundCategory(...)])` (`resolver.ts:193`) | Low | The two settle independently and are assigned to fixed named slots (`location`, `category`) by array index, not by resolution order — **order-independent by construction**, confirmed by reading the assignment code, not assumed. | None required. |

---

## 3. Replay Contract audit

Checking every explicit assumption SEE/CCQS/Replay Platform/Version Comparison/Release Gate make,
against what is actually guaranteed today.

| Assumed by | Assumption | Actually guaranteed? | Where it breaks (if it does) |
|---|---|---|---|
| SEE §16.1, INV-17 (Replay Verification) | "Re-run with original pinned versions MUST reproduce the old answer" | **Partially.** True for the category/location fields as currently compared (§1.1's insulation property + §4's empirical confirmation). **Not true** for Evidence content, CNO metadata, or anything not currently in SEE's field-spec scope — those genuinely vary run to run and were never claimed to be pinned/replayed by any version stamp. | If a future SEE `FieldSpec` ever includes an evidence-derived field, INV-17 would be violated for that field immediately, with no test today that would catch it. |
| SEE §16.2 (Derived View re-derivability) | "Derived views are mechanically re-derivable from Historical Record with zero information loss" | **True**, verified — `aggregateQualityMetrics`/`compareReplayRuns`/`evaluateGate` are all pure functions of already-persisted `CcqsComparisonRecord` JSON; re-running them produces byte-identical output (no I/O, no randomness in any of the three, per §1's table). | No violation found. |
| CCQS `EngineVersionManifest` | "Every axis that can change engine behavior is version-stamped" | **False — a real, named gap.** `RULES_REGISTRY_VERSION` exists for the category rules; **no equivalent version exists for the location catalog** (Postgres `IntakeCity`/`IntakeNeighborhood` tables, or the JSON fallback catalog) — the exact class of dependency this axis was designed to cover, missed for a second subsystem. | Two replay runs against the same pinned `EngineVersionManifest` could legitimately produce different location results if the underlying city/neighborhood data changed between them, with nothing in the manifest to explain why. |
| Replay Platform (`runGoldenReplay`) | "Every golden case that is run produces a comparison record" | **False under LLM unavailability/exhausted retries** — a case silently becomes a `skippedCaseIds` entry instead (`run-golden-replay.ts:82-85`), changing `totalCases` and every ratio metric's denominator. This is disclosed in the return type (`skippedCaseIds` is a real, surfaced field) but not enforced as a hard precondition — a replay run with, say, 5 skips is treated the same as a clean run by every downstream consumer that only reads `recordCount`. | A `QualityMetricSnapshot` computed from a run with silent skips has an implicitly smaller, different sample than one without — comparable in name (`categoryAccuracy`) but not in the population it was measured over. |
| Version Comparison (`compareReplayRuns`) | "Two runs being compared are comparable" (implicitly: same dataset version, same set of case ids) | **Not checked.** The function happily computes a diff between any two `runAId`/`runBId`, including one against a dataset that has since had cases added/deprecated — `allCaseIds = new Set([...byCaseA.keys(), ...byCaseB.keys()])` handles a differing case-id set gracefully via `newly-comparable`/`newly-not-comparable` classifications, which is graceful degradation, not a violation — but there is no check that the two runs even used the *same* `datasetRef`. | Comparing a run against the wrong baseline (e.g. a stale, deprecated dataset version) would silently produce a technically-valid-looking `VersionComparisonReport` with a misleading interpretation. |
| Release Gate (`evaluateGate`) | "The metrics passed in reflect a trustworthy, complete run" | **Not enforced by the function itself** (correctly out of scope — `evaluateGate` is pure and only as good as its input) — but no *caller* enforces it either. Nothing today would stop someone from evaluating the gate against a `QualityMetricSnapshot` computed from a run with silent LLM-availability skips. | Same root cause as the Replay Platform row above — this is one real gap surfacing at two layers, not two separate gaps. |

**One pattern across three of these five rows**: the Replay Contract's actual weak point is not
"randomness corrupts a comparison" (the specific fear that prompted this audit) — it is **"a run
with an incomplete or drifted input set is not distinguished from a clean one."** That is a more
mundane, and arguably more urgent, finding than the temperature question this investigation set out
to answer.

---

## 4. Evidence Extraction investigation

### 4.1 What was checked, and how (not speculation)

- **Temperature**: `0.1`, hardcoded (`local-chat-client.ts:109`, `openai-compatible-adapter.ts:46`) — confirmed by direct file read, not inferred.
- **Sampling**: no `top_p` sent — provider (llama-server) default applies, unpinned. No `seed` sent anywhere — confirmed via grep across both files; this is the direct mechanism that makes temperature-0.1 sampling non-reproducible (a fixed seed would make even nonzero-temperature sampling reproducible; its absence is what actually matters here, more than the temperature value itself).
- **Prompt construction**: not modified or specially probed for this audit — out of scope (the audit is about determinism, not prompt quality); noted only that the prompt is static Persian-language text built from `rawText`, no injected timestamp or random content in the prompt itself (verified by reading the adapter — the only per-call variable is `rawText`).
- **Provider behavior**: `local-chat-client.ts` targets an OpenAI-compatible endpoint (llama-server on :1234); `stream: false` confirmed (line 110) — **not streaming**, a single complete JSON response is parsed, so partial-stream-related nondeterminism (a separate real risk class in streaming setups) does not apply here.
- **Retry behavior**: confirmed real, not assumed — `maxRetries`, retries on `status >= 500`, gives up and returns `null` after exhaustion (§2).
- **Tokenization**: not independently probed (would require instrumenting the LLM server itself, out of scope for an application-layer audit) — noted as a residual unknown, not silently assumed fine.
- **Response parsing**: `parseAiJsonPayload` + Zod schema validation (`evidenceListSchema.safeParse`) — deterministic given identical raw LLM text; a parsing *failure* (`parsingStatus: 'invalid-json'`/`'schema-mismatch'`) returns `evidence: []`, which is itself a form of instability if the raw LLM text's *validity* (not just content) varies run to run — not observed in this audit's sample (§4.2), but not exhaustively ruled out either.

### 4.2 Empirical test — real evidence, not assumption

**Method**: two representative golden-dataset texts (`آپارتمان اجاره کوتاه مدت در تهران` and
`خودرو پژو دست دوم سالم`), each run 5 times against the real, currently-running local LLM
(`gemma-4-E4B_q4_0-it.gguf`). For each repeat, captured (a) the raw Evidence-extraction output
content and (b) the full pipeline's resulting category/location Decision (with `now` pinned to a
fixed value across all repeats, to isolate LLM-driven variance from timestamp variance). Script and
raw log preserved in the session scratchpad for this audit.

**Results**:

| Case | Raw Evidence variance | Full-pipeline Decision variance |
|---|---|---|
| "آپارتمان اجاره کوتاه مدت در تهران" | **2 of 5 runs differed** — run 3 produced `CONTEXT:تهران` where runs 1/2/4/5 produced `CONTEXT:در تهران` (the LLM occasionally dropped the preposition "در" from the extracted context span) | **0 of 5 runs differed** — every run: category `preferred=short-term-rent, score=0.9198, ambiguous=true`; location `preferred="...,تهران", score=0.4, ambiguous=false` |
| "خودرو پژو دست دوم سالم" | 0 of 5 runs differed (byte-identical evidence content every time, in this sample) | 0 of 5 runs differed — category `preferred=car, score=0.8941, ambiguous=true`; location `ambiguous=true, candidates=[]` (no location text in this case) |

**Direct answer to "can identical inputs ever produce different outputs? Under what conditions? How
often?"**: **Yes, confirmed** — the raw Evidence-extraction layer produced a different output on
2 of 10 total repeat-runs in this sample (20%, one case affected, one not), with the observed
difference being a minor span-boundary choice (whether to include a leading preposition), not a
wholesale different interpretation. **This sample is small (2 cases × 5 repeats)** — it should not
be read as a precise population-wide rate; it is sufficient to *prove existence and rough magnitude*
of the effect, not to bound it tightly. **Is temperature=0.1 actually introducing replay
instability? Yes, at the Evidence layer, empirically confirmed. At the layer that is actually
gated (category/location Decision), no instability was observed in 10 of 10 repeats** — and §1.1
explains *why*, structurally, this is expected rather than lucky: grounding never reads Evidence
content for these two fields, so a varying preposition in a `CONTEXT` evidence item's text has
nothing downstream to affect.

**What this empirical result does and does not prove**: it corroborates the structural argument
(§1.1) with real data; it does **not** prove the insulation property holds for every possible input
— a text where the *only* signal for category or location genuinely lived inside evidence-adjacent
reasoning (none exist in the current architecture, since grounding is 100% rule/LRE-based over
`rawText`) could theoretically behave differently, but no such path exists in the code today, so
this is a structural guarantee, not a statistical one — the empirical test's job was to confirm the
structural reasoning wasn't wrong in practice, which it did.

---

## 5. Required determinism levels

| Subsystem | Level | Why |
|---|---|---|
| Ontology (`CategoryOntologyProvider`) | **STRICT deterministic** | Pure function over a static, git-tracked tree. No I/O, no randomness, no external state of any kind. |
| Decision Engine | **STRICT deterministic** | Pure arithmetic over its inputs; verified no randomness, no I/O, stable sort. |
| SEE Comparator + Scoring Policy | **STRICT deterministic** | Explicitly designed this way from the start (SEE's own founding discipline) — confirmed still true. |
| CCQS Aggregation / Version Comparison / Release Gate | **STRICT deterministic**, *conditional on ordered input* | Pure functions; the condition ("input records in a fixed order") is currently met (`readReplayRecords`'s `orderBy`), so today these are effectively STRICT, but the guarantee is inherited, not self-contained — worth naming precisely rather than rounding up to unconditional STRICT. |
| Category rule matching (arithmetic) | **STRICT deterministic**, *given a fixed, already-loaded rule set* | Same conditional pattern — the scoring math is STRICT; the rule-set assembly feeding it (§2's `readdirSync` finding) is only **Replay deterministic** (reproducible given a pinned environment/filesystem, not guaranteed reproducible across different environments). |
| Location grounding (LRE) | **Replay deterministic at best, degrading to Probabilistic under DB unavailability** | Deterministic given a fixed, reachable database snapshot; the JSON-fallback path uses a *different, smaller* dataset, which is a discontinuous behavior change, not mere noise — closer to "probabilistic with respect to infrastructure availability" than a clean determinism tier. |
| Evidence Extraction (LLM) | **Probabilistic** | Confirmed empirically (§4). No seed, nonzero temperature, network-dependent retries with a null-on-exhaustion failure mode. This is the only subsystem in the entire audited chain that is genuinely probabilistic in its own right, not merely conditionally deterministic. |
| Canonical Need Object / Claims / Cognitive State / Readiness | **STRICT deterministic**, *for the fields that matter* — but built partly from Probabilistic input (Evidence) | Honest middle classification: the *functions* themselves are pure and STRICT; their *content* (evidence-derived fields like `primaryIntent`, `context.notes`) inherits Evidence Extraction's probabilism. Nothing here is currently compared by SEE, so it doesn't propagate — but calling the whole CNO "deterministic" would overstate what's actually guaranteed. |
| Full end-to-end pipeline, as measured by the currently-compared fields | **Replay deterministic** (empirically supported, not merely assumed, per §4) | The right honest label: not STRICT (a genuinely probabilistic step exists inside it), but the specific, gated output is reproducible today because of a real structural property, confirmed by direct experiment. "Eventually deterministic" (the term offered in the prompt, more commonly meaning eventual-consistency-style convergence) does not quite fit this system — nothing here "converges" over time or retries; it is insulated by construction, which is a different and more precise claim than eventual convergence, so this document uses "Replay deterministic (insulated)" instead of forcing the eventual-determinism label onto a phenomenon it doesn't actually describe. |

---

## 6. Architecture recommendation

**Recommendation: (D) Split production execution and replay execution — but narrowly, only where
this audit found an actual gap, not as a wholesale rebuild.**

### Why not the others

- **(A) Keep current behavior** — rejected as insufficient on its own: §2/§3 found real, concrete,
  previously-undocumented gaps (unordered DB query, unversioned location catalog, silent
  replay-skip-on-LLM-failure) that have nothing to do with temperature and would not be addressed
  by simply accepting the status quo. "The two gated metrics happen to be insulated today" is true
  but fragile — nothing prevents a future change from silently removing that insulation (§1.1).
- **(B) Pin replay mode separately** (e.g. force `temperature: 0` + a fixed `seed` only during
  replay, leave production sampling as-is) — addresses the *original* fear (LLM sampling) directly
  and cheaply, but this audit found that fear was not the main risk. Pinning the LLM alone would
  leave the `readdirSync` ordering, the unordered location query, and the unversioned catalog
  dependency completely untouched — a narrower fix than the actual evidence calls for.
  **Worth doing anyway, at low cost, but not sufficient by itself.**
- **(C) Introduce a fully deterministic execution mode** (pin everything: LLM sampling, filesystem
  read order, DB query order, catalog version, in one coherent "replay mode" flag) — this is the
  right *shape* of fix, but "introduce a mode" undersells that most of what needs pinning
  (`readdirSync().sort()`, an explicit `orderBy` on the location query) are not really a "mode" at
  all — they are just correct, unconditional code, with no reason to ever be probabilistic even in
  production. Only the LLM sampling parameters and the DB-availability fallback genuinely need a
  replay/production *distinction* — everything else this audit found should simply always be
  ordered, in every environment, with no separate mode needed.
- **(E) Another architecture** — not needed; the findings are narrow and specific enough that they
  don't require inventing a new architectural concept beyond what (D), scoped correctly, already
  covers.

### What (D), scoped by this audit's actual findings, means concretely (design only, not applied)

1. **Always-correct, no-mode-needed fixes** (these should just be correct everywhere, not gated
   behind a "replay mode"): sort `readdirSync(dir)` output before iterating in
   `registry.server.ts`; add an explicit `orderBy` to the `db.intakeCity.findMany` call in
   `location-fuse-index.ts`. Neither has any legitimate reason to be order-dependent in production
   either — this isn't a replay-vs-production split at all, just closing an accidental gap.
2. **Genuine production/replay split, where behavior *should* legitimately differ**: Evidence
   Extraction's sampling parameters. Production should very likely keep `temperature: 0.1` (some
   sampling diversity may be a deliberate, reasonable choice for live traffic robustness — not
   re-litigated by this audit, which is scoped to determinism, not model-quality tuning) — but a
   **replay/evaluation execution path** could legitimately request `temperature: 0` and a fixed
   `seed` specifically when `runGoldenReplay` calls the pipeline, so that Golden Replay results
   become byte-for-byte reproducible at the Evidence layer too, not merely insulated at the
   Decision layer by accident. This is exactly PVW's own Replay Stability metric's likely first
   real finding once built — recommending it here in advance, without implementing it, is
   consistent with "design, don't fix."
3. **Version, don't just fix, the location catalog dependency**: add a `locationCatalogVersion`
   axis to `EngineVersionManifest`, mirroring `RULES_REGISTRY_VERSION` exactly — this closes the
   Replay Contract gap named in §3, and is a data-model addition, not a behavior change.
4. **Make silent replay-skips a hard signal, not a soft one**: `evaluateGate`'s caller (or a new,
   thin wrapper) should refuse to treat a `QualityMetricSnapshot` from a run with any
   `skippedCaseIds` as gate-worthy without at least surfacing that fact explicitly alongside the
   verdict — closing the §3 finding that a drifted/incomplete run is currently indistinguishable
   from a clean one at the point where it matters most (the gate decision).

None of the four items above are implemented by this document — per the explicit "no code, no
fixes" instruction, this section is a recommendation with enough specificity to be actionable
later, not a patch.

---

## Closing note

No code was changed to produce this document. One real empirical test was run against the live
local LLM (10 total Evidence-extraction calls, 10 total full-pipeline runs, 2 golden-dataset texts,
5 repeats each) — its script and raw log live in this session's scratchpad, not the permanent
codebase, matching this whole session's convention of keeping throwaway verification separate from
shipped code. The headline conclusion is neither "replay was always fine" nor "replay is broken" —
it is that **the one risk everyone was watching (LLM temperature) turned out to be structurally
contained already, while three other, unrelated risks (filesystem read order, an unordered DB
query, an unversioned live-data dependency) were real and previously unknown.** This is exactly the
kind of result a genuine audit should be willing to produce — not confirming the fear it set out to
investigate, while surfacing sharper findings than the ones that prompted it.
