# Cognitive Engine — Baseline Report (Version 1)

**Status: Permanent engineering artifact. Produced by CCQS's first real ReplayRun. No
implementation was performed to produce this report — it is a read-only analysis of already-
collected data. Do not treat any finding below as fixed until a follow-up ReplayRun confirms it.**

| | |
|---|---|
| ReplayRun ID | `cmrc643xt0002s5378cpek1zs` |
| Dataset | `golden-dataset@v1` (33 cases — `src/ccqs/golden-dataset/v1.ts`) |
| Engine label | `v1-baseline-post-P1-P3-fix-2026-07-08` |
| Cognitive Engine version | `cognitive-engine-v1-phase4` |
| Rules registry version | `1.0.0` |
| Comparator/ontology version | `1.0.0` / category=`1.0.0` |
| Git commit | `11a1d4ad157de401fa4d1c123d7058538fd8a4ac` |
| Triggered by | manual (`npm run ccqs:replay`) |
| Gate policy evaluated | `default-v1` / `1.0.0` |

---

## 1. Replay Summary

| Metric | Value |
|---|---|
| Total samples | 33 |
| Successful evaluations | 33 (100%) |
| Failed evaluations (pipeline error) | 0 |
| Skipped evaluations | 0 |
| Total execution time | 844.6s (14m 5s), sequential (one case at a time — this run does not use concurrency) |
| Mean per-case latency | 25.59s |
| P50 | 25.67s |
| P95 | 31.53s |
| P99 | 35.77s |
| Min / Max | 15.8s / 35.8s |

**Caveat, stated plainly, not glossed over**: with n=33, P95 and P99 are each backed by roughly 1-2
observations at the tail — they describe *this run's* slowest cases, not a statistically reliable
tail estimate. Treat them as "the slowest cases we saw," not a production SLA claim. Latency is
dominated entirely by the local LLM evidence-extraction call (Phase 1 of the Cognitive Engine);
rules-based grounding and comparison are negligible by comparison (sub-second).

---

## 2. Quality Metrics (full `QualityMetricSnapshot`, as computed by CCQS's `aggregateQualityMetrics`)

| Metric | Value |
|---|---|
| categoryAccuracy | 0.8485 (28/33 comparable) |
| locationAccuracy | 0.9091 (30/33 comparable) |
| intentAccuracy | `null` — no intent classifier exists in the Cognitive Engine yet; not fabricated |
| ambiguousRate | 0.0909 (6 of 66 total field comparisons) |
| falsePositiveRate | 0 |
| falseNegativeRate | 0 |
| Rule coverage | 52 unique rules matched across the dataset; **0 zero-candidate cases** |

**Status counts by field** (raw distribution, not just the accuracy rollup):

| Status | Category | Location |
|---|---|---|
| match | 27 | 30 |
| refinement | 1 | 0 |
| ambiguous-but-plausible | 4 | 2 |
| mismatch | 1 | 1 |
| not-comparable | 0 | 0 |

**Confidence histograms** (deciles, engine-side confidence only):

| Bucket | Category count | Location count |
|---|---|---|
| 0.0–0.1 … 0.7–0.8 | 0 each | 0, 0, 0, 0, 7, 0, 2 |
| 0.8–0.9 | 4 | 1 |
| 0.9–1.0 | 29 | 0 |
| **Total with a confidence value** | **33** | **10** |

Only 10 of 33 location comparisons carry a confidence value — **not a defect**: of the remaining
23, both sides agree "no location here" (`BOTH_MISSING`, itself a `match`), which is correct
because only 9 of the 33 golden cases currently carry real location ground truth (a golden-dataset
*composition* fact — see Recommendation #5).

**Ontology refinement stats** (category namespace — location has no ontology provider):

| reasonCode | Count |
|---|---|
| `ONTOLOGY.IDENTICAL` | 27 |
| `ONTOLOGY.CHILD_OF` | 1 |
| `ONTOLOGY.SIBLING` | 1 |
| `ONTOLOGY.PARENT_OF` | 0 |
| `ONTOLOGY.UNRELATED` | 0 |

---

## 3. Failure Analysis (grouped by root cause, not symptom)

Eight field-level outcomes across the 66 total (category+location × 33 cases) were not a clean
`match`. Grouped into exactly five root causes — four affecting the Cognitive Engine, one affecting
CCQS's own metric definition:

### Root Cause A — Terse, single-signal phrasing yields multiple plausible candidates (including the correct one)
- **Cases**: `inv-03` (category), `inv-04` (location), `inv-12` (category), `inv-22` (category), `inv-28` (location) — 5 instances.
- **Frequency**: 5/66 field comparisons (7.6%), 5/33 cases (15.2%).
- **Severity**: Low. The correct answer is always present among the candidates (`AMBIGUOUS_CANDIDATE_MATCH`) — this is an under-confidence characteristic, not a wrong-answer defect.
- **Reproducibility**: High for the structural pattern (short phrase, single weak signal); LLM-touched fields carry normal model-level stochasticity across separate runs.
- **Proposed long-term fix (not implemented)**: revisit the Decision Engine's clear-winner-gap tuning (`CLEAR_WINNER_GAP`) for cases where the correct candidate already leads but not by the current margin, and/or author additional category-defining keywords for these specific short phrasings.

### Root Cause B — Real-estate sub-branch disambiguation gap (short-term/suite rental vs. standard rental)
- **Case**: `inv-23` ("آپارتمان اجاره کوتاه مدت در تهران") — engine confidently (0.98) picked `apartment-rent` when the correct leaf was `suite-apartment-rent`.
- **Frequency**: 1/66 (1.5%).
- **Severity**: Medium — this is a genuine wrong-leaf pick at high confidence, not merely low confidence.
- **Reproducibility**: High, deterministic (rules-based).
- **Proposed long-term fix (not implemented)**: same investigation discipline as Priority 3's موتور سیکلت fix — identify the whole class of short-term/کوتاه‌مدت/روزانه/شبانه signal words and strengthen `suite-apartment-rent`'s keyword coverage relative to the generic `apartment-rent` keywords it currently loses to.

### Root Cause C — Priority 2 fix incomplete: weak nationwide location candidates surface as "ambiguous" instead of "missing"
- **Case**: `inv-24` ("لپ تاپ ارزان برای دانشجو") — already disclosed in this session's memory as a partial fix.
- **Frequency**: 1/66 (1.5%).
- **Severity**: Low — the original bug (false auto-resolution) remains fixed; this is a residual ambiguity-presentation issue, not a wrong-answer regression.
- **Reproducibility**: High, deterministic.
- **Proposed long-term fix (not implemented)**: add a hard plausibility floor (not just a score discount) in `rankGlobalNeighborhoodCandidates` so a generic noun with no real place-name signal returns zero candidates when no city hint exists, rather than several weak ones.

### Root Cause D — Pre-existing generic real-estate keyword ("خونه") creates category ambiguity for non-real-estate generic text
- **Case**: `p2-guard-01` ("یک وسیله برای خونه میخوام فوری").
- **Frequency**: 1/66 (1.5%) in this dataset, but likely **broader in real production** — "خونه" is common, casual Persian for "home" far beyond real-estate contexts.
- **Severity**: Low-medium locally, potentially medium-high at production scale (blast radius, not depth).
- **Reproducibility**: High, deterministic.
- **Proposed long-term fix (not implemented)**: review whether "خونه"/"خانه" alone should carry apartment-sale weight, or should require co-occurrence with a second real-estate signal (رهن، اجاره، متر، فروش) before contributing score.

### Root Cause E — Metric definition gap: `refinement` status does not currently distinguish direction
- **Case**: `inv-26` ("خودرو وانت سنگین برای باربری", truth=`car-heavy`, engine=`car` — the PARENT, not a child) classified `refinement` via `ONTOLOGY.CHILD_OF`.
- **This is not a Cognitive Engine defect** — it is a CCQS/SEE metric-fidelity finding. SEE's `refinement` status was designed around the original drift investigation's pattern (engine gives a MORE specific answer than a cruder legacy baseline — an improvement). Against a golden dataset where ground truth IS the precise expected leaf, an engine answer that is instead the *parent* of the truth (i.e., LESS specific than required) currently gets the same `refinement`/"good" treatment. This inflates `categoryAccuracy` by treating an under-specified answer as fully correct.
- **Frequency**: 1/66 observed here; likely under-counted since this pattern wasn't previously visible without ground-truth comparison.
- **Proposed long-term fix (not implemented, measurement-layer only)**: teach `aggregateQualityMetrics` to distinguish `ONTOLOGY.CHILD_OF` (engine under-specified relative to truth) from `ONTOLOGY.PARENT_OF` (engine over-specified — the historically "good" direction) when the comparison is against curated ground truth specifically, rather than treating both identically as they correctly are for legacy-vs-cognitive shadow comparison.

---

## 4. Confidence Analysis

- **Category confidence is heavily right-skewed**: 29/33 cases ≥0.9, all 33 cases ≥0.8. This includes cases marked `ambiguous-but-plausible` — e.g. `inv-03` shows category confidence **0.833 while the outcome was ambiguous**, because `category-matcher.ts`'s confidence formula (`0.55 + (score/maxScore)*0.43`) is computed relative to the *winning* candidate's own score ceiling, not relative to how close the runner-up is. Ambiguity is detected separately (via the Decision Engine's clear-winner-gap check on relative scores), never by this confidence number itself.
- **Location confidence is systematically lower even when correct**: the majority of real (non-null) location confidences cluster around 0.4-0.5, a range that would read as "uncertain" if compared directly to category's 0.8-1.0 cluster — yet many of these ARE correct matches. This traces to `location-lre-bridge.ts`'s bare-city resolution reporting ~0.5 confidence by design (already noted as a minor, unaddressed observation during Phase 2 of the Cognitive Engine build).
- **Calibration conclusion, directly answering the question asked**: **confidence is not currently meaningful as an absolute, cross-field-comparable, or probability-like number.** It is *ordinally* useful within a single field (a category confidence of 0.98 vs 0.65 broadly signals "more" vs "less" certain within category-land), but a location confidence of 0.5 and a category confidence of 0.83 are not on the same scale of *actual correctness likelihood* — one is a systematically low-scoring-but-often-correct field, the other is a relative-to-own-ceiling score that stays high even under real ambiguity. **Future calibration is required** before confidence values should be used for any cross-field decision (e.g. "trust category over location because it scored higher" would be an invalid inference today).

---

## 5. Ontology Analysis

Only the `category` namespace has an `OntologyProvider` today (`location` uses string/geo
comparison, no ontology — by design, per the SEE comparator audit).

| Relationship | Count | % of ontology-reaching comparisons |
|---|---|---|
| Identical | 27 | 93.1% |
| Child-of (engine under-specified vs. truth) | 1 | 3.4% |
| Sibling (same top-level branch, wrong leaf) | 1 | 3.4% |
| Parent-of (engine over-specified vs. truth) | 0 | 0% |
| Unrelated (different top-level branch entirely) | 0 | 0% |

**What this tells us about ontology quality**: the complete absence of `unrelated` outcomes is a
strong, concrete signal — when the engine and ground truth disagree at the category level, they
disagree *adjacently* (a sibling leaf or a parent/child hop), never by a wild, cross-branch
misclassification. This is direct, independent confirmation that Priority 3's rules-registry fix
is holding: no case in this baseline reproduces the "motorcycle scored as car" class of error
(a cross-branch `unrelated`-type failure) that this session found and fixed. The one `sibling` case
(Root Cause B) and one `child-of` case (Root Cause E) are near-miss precision gaps, not ontology
coverage failures.

---

## 6. Category Analysis

| Category (ground truth) | n | Accuracy | Issues |
|---|---|---|---|
| `apartment-sale` | 2 | **0%** | Both ambiguous-but-plausible |
| `suite-apartment-rent` | 1 | **0%** | Sibling miss (Root Cause B) |
| (none expected — control) | 1 | 0% | Ambiguous (Root Cause D) |
| `car` | 3 | 67% | 1 ambiguous-but-plausible |
| `apartment-rent` | 6 | 100% | — |
| `laptop` | 4 | 100% | — |
| `mobile-phone` | 4 | 100% | — |
| `game-console` | 4 | 100% | — |
| `motorcycle` | 6 | 100% | **Direct confirmation Priority 3's fix holds across every motorcycle case in the dataset** |
| `car-heavy` | 1 | 100%* | *Flagged under Root Cause E — engine actually under-specified to the parent `car` |
| `spare-parts` | 1 | 100% | Direct confirmation of the other Priority 3 fix |

**Statistical caveat**: most categories here have n=1-6. "Weakest"/"strongest" describes this
specific 33-case sample, not a statistically robust long-run rate — see Recommendation #6.

**Where future rule improvements will produce the highest return**: the real-estate transaction-
type branch (`apartment-sale`/`suite-apartment-rent`) — it is the only cluster contributing 3 of
the 8 total quality issues found (Root Causes A and B both land here), and it is the *specific*
metric currently blocking the release gate (§9). A single, scoped investigation into real-estate
sub-branch keyword coverage — mirroring exactly how Priority 3 investigated the vehicle branch —
is the highest-leverage next step identified by this baseline.

---

## 7. Location Analysis

| Outcome | Count | Detail |
|---|---|---|
| Exact/fuzzy value match (engine found the correct value) | 7 | Real, resolved, correct |
| Both-sides-agree-nothing-here match | 23 | Dataset composition (only 9/33 cases carry location ground truth), not an accuracy signal |
| Ambiguous but plausible | 2 | Correct city present among candidates, not singularly resolved |
| Unresolved / mismatch | 1 | `inv-24`, "دانشجو" — Root Cause C |
| False positive (confidently wrong) | 0 | — |

**Remaining weaknesses**: the one real weakness is Root Cause C (residual ambiguity presentation
for generic nouns with no city hint). Beyond that, every location case where the Cognitive Engine
had a real signal to work with resolved correctly or plausibly — zero wrong-city confident
resolutions were observed in this baseline.

---

## 8. Cognitive Engine Health Score

**No single composite score is reported here, by design.** CCQS does not currently define a
documented, versioned formula for blending category accuracy, location accuracy, ambiguity rate,
and false-positive rate into one number — inventing one for this report would itself violate the
"do not invent numbers" instruction this report was commissioned under. A future, explicit CCQS
health-score definition is listed as Recommendation #7, to be designed with the same rigor as
every other metric in this system, not improvised here.

**Qualitative, evidence-grounded readiness assessment, using only the numbers already computed**:
the engine is close to this baseline's own default thresholds, not far from them. Location accuracy
(90.9%) clears its bar. Category accuracy (84.85%) misses its bar by 0.15 percentage points — one
case away from passing (flipping any single one of the 5 non-mismatch category issues to a clean
match would cross the threshold). Zero false positives were observed. Zero cross-branch ontology
failures were observed. The gap that exists is narrow, concentrated in one identifiable category
branch (§6), and has a named, scoped, plausible fix path (Root Cause B) — this is not evidence of a
systemic quality problem; it is evidence of one well-understood, addressable gap.

---

## 9. Release Gate Result

**Verdict: `fail`.**

| Threshold | Actual | Required | Met? |
|---|---|---|---|
| `minCategoryAccuracy` | 0.8485 | 0.85 | **No** |
| `minLocationAccuracy` | 0.9091 | 0.85 | Yes |
| `maxAmbiguousRate` | 0.0909 | 0.20 | Yes |
| `maxFalsePositiveRate` | 0 | 0.10 | Yes |
| `maxNewMismatchCaseIds` | not evaluated (no baseline run to compare against) | 0 | Yes (not evaluated ≠ passed by default in general — here reported honestly as not-applicable) |

**Exactly one blocking condition**: `minCategoryAccuracy`, missed by 0.0015 (0.15 percentage
points) — the narrowest possible miss given a 33-case sample (one single case flipping from
non-match to match would clear it). No other threshold is close to its limit (location accuracy
clears its bar by 6 points; ambiguous rate and false-positive rate are well within bounds).

---

## 10. Recommendations (ranked — none implemented)

| # | Recommendation | Impact | Risk | Cost | Expected Quality Gain |
|---|---|---|---|---|---|
| 1 | Investigate real-estate sub-branch disambiguation (`apartment-sale`/`suite-apartment-rent`) — same discipline as Priority 3 | High — directly targets the one metric blocking the gate | Low — additive rules only | Medium | High — could resolve 3 of 8 total findings at once |
| 2 | Complete the Priority 2 fix: hard-filter implausible nationwide location candidates instead of discounting their score | Medium | Low | Low | Medium |
| 3 | Review "خونه"/"خانه" keyword weighting for false-trigger risk at production scale | Medium (blast radius likely bigger than this dataset shows) | Medium (widely-used keyword — needs careful regression testing) | Medium | Medium |
| 4 | Make `aggregateQualityMetrics` direction-aware for `ONTOLOGY.CHILD_OF`/`PARENT_OF` against curated ground truth | Low-Medium (measurement trustworthiness, not engine behavior) | Low | Low | Indirect — improves future measurement accuracy |
| 5 | Expand golden dataset v2 with more location-bearing cases (only 9/33 today) | Medium (statistical power) | None | Low | Indirect |
| 6 | Expand per-category sample sizes (several categories at n=1) | Medium (statistical reliability of §6) | None | Low | Indirect |
| 7 | Formally design and document a versioned Cognitive Engine Health Score formula | Medium (reporting clarity) | Low | Low-Medium | Indirect |
| 8 | Revisit `default-v1` gate thresholds now that one real baseline exists | Low (process/governance) | Low | Low | N/A — methodology only |

**Top priority, by Impact × Cost efficiency**: #1, because it is the only recommendation that both
(a) directly addresses the current gate failure and (b) follows the exact, already-proven
investigation methodology from this session's Priority 3 work.

---

## Closing note

Per explicit instruction, **no recommendation above was implemented while producing this report**.
This document is Version 1 of a permanent series — the next ReplayRun (after any future Cognitive
Engine change) should be compared against `cmrc643xt0002s5378cpek1zs` via `npm run ccqs:compare`,
and its results appended as Version 2, never overwriting this one.
