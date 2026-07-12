# Cognitive Engine Shadow-Drift Investigation — Engineering Report

**Status: Investigation complete (2026-07-07). Recommendations #1-3 have since been implemented as
the Semantic Evaluation Engine (`PLAN/semantic-comparator-architecture.md`) and wired into the real
publish path. Recommendation #6 (re-run the shadow batch for a trustworthy number) is now done —
see "Recommendation #6 Fulfilled" at the end of this document. Phase 8 (authoritative cutover)
remains not started — that is a separate decision, not automatically triggered by this result.**

## Executive Summary

The raw headline number — **100% drift rate across 41 real shadow-comparison events** — is
misleading if taken at face value. A rigorous, stage-by-stage investigation shows:

- **~51%** of all "drift" (category diffs, 21 of 41 events) is not drift at all: the Cognitive
  Engine resolved a *more specific, more correct* category than the legacy pipeline
  (parent-vs-child in the same taxonomy branch, e.g. `residential-rent` → `apartment-rent`). This
  is a **comparator limitation**, proven programmatically against the real category tree.
- **~68%** of all "location: legacy≠null, cognitive=null" cases (28 of 41 events) trace to a
  **test-methodology flaw**, proven via a full 7-stage trace: the shadow-comparison test harness
  fed the Cognitive Engine free text that structurally never contained the city (the city was a
  separate form field, never concatenated into the text the LLM sees), while the legacy pipeline
  received the city directly as structured data. The city disappeared *before the LLM was ever
  invoked* — not during extraction, not during grounding, not under load.
- **10 of 41 events (~24%)** are genuine, reproducible **Cognitive Engine bugs** — three distinct,
  independently diagnosed defects, none load-dependent, none requiring the LLM to reproduce:
  1. A rules-coverage gap: the category rules registry has **zero keyword coverage** for
     "موتور سیکلت" (motorcycle) as a bare phrase (6 events).
  2. A keyword-collision/scoring defect: car-brand keywords ("هوندا", "پراید") outscore or
     override the correct category even in unambiguous non-car contexts (4 events).
  3. A confidence-scale bug in the Cognitive Engine's own grounding code: a resolver's 0–100 raw
     score is passed unclamped into a field the rest of the system assumes is 0–1, letting a
     meaningless fuzzy match ("دانشجو" ~ some unrelated neighborhood) present as maximum
     confidence and win the decision (2 events, 100% reproducible on the same input).
- **39 of 41 "readiness" diffs are not independent findings.** Proven by code inspection
  (`computeReadiness` is a pure function of accepted Claims, which are a pure function of
  Decisions, which are a pure function of Grounding) and cross-validated against every real event:
  every readiness diff is fully explained by the category/location claim-acceptance state already
  captured above. Counting it separately would double-count the same root causes.
- **Infrastructure/concurrency: zero findings.** Controlled experiment at concurrency 1/2/4/8 with
  correctly-constructed inputs (city present in free text) showed **8/8 success at every level**,
  with wall-clock time *improving* as concurrency increased (229s→145s) up to the local LLM
  server's 4-slot limit, then plateauing (no degradation at 8). The original hypothesis that
  motivated this line of inquiry — that location resolution degrades under concurrent load — is
  **disproven**.

**Recommendation**: Phase 8 (authoritative cutover) is **not blocked by Cognitive Engine
reliability or infrastructure** — both are demonstrably solid. It *is* blocked by a broken
comparator that cannot be trusted to measure drift accurately, plus two small, well-diagnosed,
low-cost bugs. Fix the comparator first — without it, no future drift measurement is trustworthy,
regardless of how good the engine gets.

---

## Phase 1 — Root Cause Classification (all 41 events, exactly one category each)

| Category | Count | % | Description |
|---|---|---|---|
| **Semantic improvement** (manifests as comparator limitation, see below) | 21 | 51% | Cognitive Engine picked a more specific child category in the same taxonomy branch |
| **Comparator limitation** (location) | 28 | 68%* | City never present in the text the Cognitive Engine received — a test-harness input-construction flaw |
| **Cognitive Engine bug** — rules coverage gap | 6 | 15% | "موتور سیکلت" matches zero category rules, even in isolation |
| **Cognitive Engine bug** — keyword collision/scoring | 4 | 10% | Brand keyword (car) outscores or replaces the correct category |
| **Cognitive Engine bug** — confidence scale defect | 2 | 5% | Raw 0–100 resolver score passed unclamped as 0–1 confidence, producing a false-maximum-confidence hallucination |
| **Infrastructure/runtime issue** | 0 | 0% | Ruled out — confirmed 8/8 success at concurrency 1/2/4/8, see Phase 5 |
| **Duplicate/derived metric (not independently classified)** | 39 | — | Readiness diffs — 100% explained by the above |

*(percentages overlap since one event can carry both a category and a location diff; total event
count is 41, not the sum of the category column)*

### 1a. Semantic improvement / Comparator limitation — category taxonomy depth (21 events)

Every instance follows the identical pattern: `legacy` returns a **depth-1 (parent)** category
slug, `cognitiveEngine` returns the **depth-2 (child)** slug directly beneath it in
`src/config/categories.ts`'s `parentSlug` chain. Verified programmatically (not by inspection) for
all 21 occurrences — zero exceptions:

```
residential-rent  → apartment-rent    (real-estate > residential-rent > apartment-rent)   ×9
residential-sale  → apartment-sale    (real-estate > residential-sale > apartment-sale)    ×2
computer          → laptop            (electronics > computer > laptop)                    ×7
mobile-tablet     → mobile-phone      (electronics > mobile-tablet > mobile-phone)          ×3
```

The Cognitive Engine's answer is **not wrong — it is more precise**. `apartment-rent` is strictly
more useful for matching/search than `residential-rent`. This is exactly the kind of improvement
Phase 8 should be *encouraged* by, not alarmed about — but the current comparator cannot tell the
difference between "more specific" and "different", so it reports every one of these as drift.

### 1b. Cognitive Engine bug — category rules-coverage gap (6 events)

Reproduced deterministically, with **zero LLM and zero concurrency involvement** (this is pure
rules matching against `src/intake/rules/registry.server.ts`):

```
matchCategoryCandidatesFromRules("موتور سیکلت")  →  []          (empty — no rule fires at all)
```

The bare phrase "موتور سیکلت" (motorcycle) matches no keyword rule in the `motorcycle` category's
rule pack. This affects any need text whose *only* category signal is that phrase without an
accompanying strong brand/model keyword.

### 1c. Cognitive Engine bug — keyword collision (4 events)

Also reproduced deterministically:

```
matchCategoryCandidatesFromRules("موتور سیکلت هوندا میخوام...")
  → car: 0.98 confidence (matched via legacy-kw-car-146 — "هوندا" is registered as a CAR brand keyword)
  → motorcycle: not even a candidate

matchCategoryCandidatesFromRules("قطعه یدکی گیربکس خودرو پراید...")
  → car: 0.98 (4 matched rules, incl. "پراید" brand keyword)
  → spare-parts: 0.94 (3 matched rules) — correctly identified, but narrowly outranked
```

Root cause: brand keywords ("هوندا", "پراید") are registered under the `car`/`car-ride` rule
packs without disambiguating for the vehicle *type* qualifier ("موتور سیکلت", "قطعه یدکی") that
appears alongside them in the same sentence. This is a pre-existing defect in the shared rules
registry that Phase 2's Grounding reuses unchanged — not something introduced by the Cognitive
Engine's own code.

### 1d. Cognitive Engine bug — confidence scale defect (2 events, same input, 100% reproducible)

Full trace (see Phase 2 below) proves: for input containing **neither** "شیراز" nor "مشهد"
anywhere in the text, the Cognitive Engine confidently (100/100 → clamped to 1.0) decided the
location was "مشهد". Root cause identified in `src/cognitive-engine/grounding/resolver.ts`'s
`groundLocation`:

```ts
const neighborhoodCandidates: GroundedCandidate[] = (result.candidates ?? []).map((c) => ({
  ...
  confidence: c.score,   // <-- BUG: c.score is on the underlying resolver's 0–100 scale here,
                          //     not the 0–1 scale GroundedCandidate.confidence is documented
                          //     (and Zod-typed) to be. Never clamped or normalized.
  ...
}));
```

This is compounded by a second, pre-existing issue one layer down: when no city is scoped, the
underlying `location-resolution-engine.ts` fuzzy-matches *any* unresolved text fragment — including
semantically meaningless ones like "دانشجو" (student) — against the **entire nationwide**
neighborhood catalog, and returns matches at 90–100 "confidence" with no signal that this is a
weak, essentially random string-similarity coincidence.

### 1e. Comparator limitation — location (28 events)

See Phase 2 for the full proof. Root cause: `composeIntakeSourceText(needText, detailsText)`
never includes the form's `city` field — it is applied to the draft as a separate structured
field. The test-generation script built inputs by setting `city` structurally (matching how the
real `/post` page's city-picker step works) but the resulting `sourceText` — the *only* thing
`runCognitivePipeline` receives — never mentions the city as text. The Cognitive Engine cannot be
faulted for not finding information that was never given to it.

**Important qualifier**: this describes 28 of the 41 *test* events. It says nothing about real
production traffic, where users frequently *do* type the city as part of their free-form need
description in addition to (or instead of) using the separate city-picker step. Section 2's
control case ("لپ تاپ گیمینگ نو میخوام بخرم **تو رشت**") proves the Cognitive Engine handles that
realistic phrasing correctly.

---

## Phase 2 — Location Investigation: Complete Stage-by-Stage Trace

Two cases traced end-to-end, per the required pipeline: Raw Text → Normalized → Prompt → Raw LLM
Response → Evidence → Resolver Candidates → Inference → Final Decision.

### Case A — city only in the structured form field (reproduces the drift)

| Stage | Value |
|---|---|
| Raw form input | needText=`"لپ تاپ گیمینگ نو میخوام بخرم"`, detailsText=`"بودجه تا هشتاد میلیون تومان"`, city=`"رشت"` (**structured field**) |
| `sourceText` (Stage 2 — composed) | `"لپ تاپ گیمینگ نو میخوام بخرم\n\nتوضیحات:\nبودجه تا هشتاد میلیون تومان"` — **"رشت" absent** |
| Normalized (Stage 3) | Same content, still no "رشت" |
| Evidence-extraction prompt (Stage 4) | Built from the above `sourceText` — the LLM is never shown "رشت" |
| Raw LLM response / Evidence (Stage 5) | 4 evidence items (IDENTITY "لپ تاپ", PROPERTY "گیمینگ", ACTION "میخوام بخرم", CONSTRAINT budget) — **no CONTEXT item, because there is nothing location-related in the input** |
| Grounding candidates (Stage 6) | Location domain: **no candidates** |
| Decision (Stage 7) | `preferred: null`, `requiresClarification: true` |

**Conclusion: the location signal disappears at Stage 2 (source-text composition), before the LLM
is ever invoked.** This is not an extraction failure, not a resolver failure, not a timing issue.

### Case B — identical need, city included in the free text (control)

| Stage | Value |
|---|---|
| Raw form input | needText=`"لپ تاپ گیمینگ نو میخوام بخرم **تو رشت**"` |
| `sourceText` | Contains "رشت" |
| Evidence (Stage 5) | 6 items including `{type: CONTEXT, value: "تو رشت", sourceSpan: "تو رشت", confidence: 1}` — LLM latency 34.3s |
| Grounding (Stage 6) | `{domain: location, status: resolved, candidates: [{id: "رشت", label: "رشت", confidence: 0.5}], derivedFromEvidenceIds: [E5]}` |
| Decision (Stage 7) | `preferred: {label: "رشت", score: 0.5}`, `requiresClarification: false` |

**Conclusion: given the same information the legacy pipeline had, the Cognitive Engine correctly
extracts and resolves the location every time it was tested this way** (also true for the 8/8
concurrency=1 control run in Phase 5).

*(Minor secondary observation, not a defect: the resolved-location decision score is 0.5, not
closer to 1.0, because the underlying `location-lre-bridge.ts` resolver itself reports 0.5
confidence for this bare-city match. Worth a look in a future phase, but orthogonal to this
investigation — it doesn't affect whether the location is found, only its recorded confidence.)*

---

## Phase 3 — Comparator Architectural Audit

### Is string equality fundamentally incorrect for semantic comparison?

**Yes, demonstrably**, for category comparison specifically. String equality treats
`apartment-rent` and `residential-rent` as maximally different (edit distance, Jaccard, any naive
string metric — all "wrong") when they are in fact parent and child of the *same* concept. 21 of
41 events (51%) are false positives purely because of this. String equality is not inherently
wrong for **location** comparison (a city is a city; "شیراز" ≠ "مشهد" is a correct judgment) — the
location problem in this dataset was an input-construction bug, not a comparison-semantics bug.

### Should category comparison use ontology distance?

Yes. `src/config/categories.ts` already encodes a usable ontology as a `parentSlug` tree
(depth 0/1/2). A `categoryDistance(a, b)` function is directly computable today:

```
distance(a, b) =
  0   if a === b
  1   if b is a's parent, or a is b's parent (direct ancestor/descendant)
  2   if a and b share the same depth-0/1 ancestor (siblings, or same-branch-different-leaf)
  ∞   (or a large constant) otherwise — different branches entirely
```

This single function would have reclassified 21 of 41 "drift" events as `distance=1` (near-match /
improvement) instead of `equal=false`, and would still correctly flag the 4 genuine `car`/
`motorcycle`/`spare-parts` mismatches as `distance=∞` (different top-level branches:
`vehicles>motorcycle` vs `vehicles>car` share only the depth-0 ancestor `vehicles` — worth a
`distance=2` "same top vertical, wrong leaf" tier rather than full disagreement, still clearly
worse than the taxonomy-depth cases).

### Should parent/child categories be considered semantic matches?

**Match with a caveat, not silently.** A parent/child relationship should be reported as
`status: 'refinement'` (Cognitive Engine went deeper) rather than either `equal: true` (hides that
a real change happened — useful for the training/learning pipeline to know about) or `equal: false`
(the current, misleading behavior). A 3-way status (`match` / `refinement` / `mismatch`) preserves
information a boolean can't.

### Should intent, object, and location have different weights?

Yes — they answer different questions and fail differently:

- **Location** is nearly binary in cost: wrong city ≈ unusable listing. High weight, low
  tolerance for ontology distance.
- **Category** benefits from a graded distance metric (this investigation's main finding) — a
  refinement is good, a same-branch sibling miss is moderate, a cross-branch miss (motorcycle→car)
  is serious.
- **Intent/primary action** isn't compared at all today (Phase 4's CNO only has a raw ACTION
  evidence string, not an RFC-001 canonical intent) — this is a known, already-documented gap, not
  something to retrofit into the comparator before that classifier exists.

### How should semantic similarity actually be measured (design, not implementation)

Proposed v2 comparator contract:

```ts
interface FieldComparison {
  field: 'category' | 'location' | 'readiness';
  status: 'match' | 'refinement' | 'ambiguous-but-plausible' | 'mismatch' | 'not-comparable';
  legacyValue: unknown;
  cognitiveValue: unknown;
  distance?: number;       // only for category, via the ontology-distance function above
  reason: string;          // human-readable, e.g. "child of legacy category in same branch"
}
```

- `category`: computed via `categoryDistance`; `distance ∈ {0}` → `match`, `{1}` → `refinement`,
  `{2}` → `ambiguous-but-plausible`, else → `mismatch`.
- `location`: keep string/substring comparison (it's semantically appropriate here), **but** only
  run the comparison when the legacy city is verifiably present in `sourceText` — otherwise emit
  `not-comparable` rather than `mismatch`, so the aggregate drift rate stops being poisoned by
  input-construction artifacts. This one change alone would have made 28 of 41 events
  `not-comparable` instead of `mismatch`.
- `readiness`: **remove as an independently-scored field** (see Phase 4) — keep it in the payload
  for human debugging context, but exclude it from `driftRate`/`topDiffFields` aggregation, since
  it never carries information beyond what `category`/`location` already report.

This redesign is a design only, per instruction — not implemented in this investigation.

---

## Phase 4 — Readiness Dependency Proof

**Claim: every readiness diff is a deterministic, 100%-explained consequence of the category
and/or location decision state. It is not an independent measurement.**

### Code-level proof

```
computeReadiness(cno)
  reads only: cno.claims  (filter status === 'accepted', per field)
  cno.claims comes only from: claimsFromDecisions(decisions, now)   [Phase 4 module]
  decisions comes only from: makeDecisions(grounded)                [Phase 3 module]
  grounded comes only from: groundEvidence(evidence, rawText)       [Phase 2 module]
```

No other input reaches `computeReadiness`. It is a pure function of exactly the same
category/location decision state the comparator already inspects separately.

### Empirical cross-validation (all 41 real events)

A first-pass naive formula (`readiness diff ⟺ category-or-location diff shows cognitiveEngine:
null`) matched 30/41 events exactly. The 11 "violations" were **not counterexamples** — they
revealed a *second*, more precise finding: the comparator's location/category equality check
compares against the Decision Engine's `preferred` (top-guess) value, while `computeReadiness`
correctly checks the `accepted` **claim** status, which requires `!requiresClarification`. A
`preferred` guess can exist and textually match the legacy value while remaining merely
`'supported'` (ambiguous, not yet accepted) — readiness correctly flags this as blocking; the
surface-level comparator does not. Every one of the 11 "violations" fits this exact, single
explanation. This *strengthens* rather than weakens the dependency claim: it shows the comparator
is even less precise than readiness, not that readiness carries independent signal.

**Conclusion: readiness should not be tallied as a distinct drift category. Doing so
double-counts the same underlying category/location root causes already captured above** — exactly
the "duplicate metrics" the investigation was asked to rule out.

---

## Phase 5 — Infrastructure Validation (concurrency 1/2/4/8)

**Design note on what makes this a fair test**: the experiment intentionally uses texts where the
city is included in the free text (`"...تو رشت"` style), matching Phase 2's Case B control —
testing texts constructed the way Phase 1's batch did (city-only-in-structured-field) would
trivially show 0% success at every concurrency level for the reason already proven in Phase 2,
telling us nothing new about infrastructure behavior. 8 distinct realistic texts per round, one
`runCognitivePipeline` call per text, no HTTP layer involved (isolates the pipeline itself from
publish-route/queue behavior).

| Concurrency | Success | Elapsed |
|---|---|---|
| 1 | 8/8 (100%) | 229.3s |
| 2 | 8/8 (100%) | 195.2s |
| 4 | 8/8 (100%) | 145.3s |
| 8 | 8/8 (100%) | 148.9s |

**Conclusion (all 4 levels complete): location resolution is 100% reliable at every concurrency
level tested, with zero degradation.** Elapsed time actually *decreases* from concurrency 1→4
(229s→145s, genuine parallelism benefit up to the local LLM server's 4-slot limit) and plateaus
at 8 (145s→149s, no further speedup past the slot limit, as expected, and critically — no
*failures* either, just no additional speedup).

This directly refutes the hypothesis that motivated Phase 5 ("the location resolver seems to fail
under concurrent batch load"). That hypothesis was wrong. The real cause, proven independently in
Phase 2, was that the original batch script's test inputs never contained the city as text in the
first place — a failure mode that is identical at every concurrency level, including 1, which is
exactly what we'd expect from an input-construction bug and exactly what these results show.
**There is no infrastructure or runtime finding to report from this investigation.**

---

## Phase 6 — Recommendations (ranked)

Ranked by **Impact** (how much it changes the trustworthiness of future drift measurement or the
correctness of real listings) / **Risk** (chance of breaking something else) / **Cost** (rough
engineering effort).

### 1. Fix the comparator's category-equality check to use ontology distance
**Impact: High — Risk: Low — Cost: Low (hours, not days)**
Without this, *no* future Phase 8 go/no-go decision can trust the drift number — 51% of today's
"drift" disappears the moment this ships. Implementation is exactly the `categoryDistance()`
function designed in Phase 3, using data (`parentSlug` chains) that already exists. Purely additive
to `src/cognitive-engine/shadow/compare-with-legacy.ts` — zero risk to the live publish path, since
the comparator only ever writes to an observability event.

### 2. Fix the comparator's location "not-comparable" case
**Impact: High — Risk: Low — Cost: Low**
Check whether the legacy city is actually present in `draft.sourceText` before comparing; if not,
emit `not-comparable` instead of running the comparison at all. This removes 28 of 41 events'
worth of noise from the aggregate drift rate without touching the Cognitive Engine itself. Same
file as #1, same risk profile.

### 3. Fix the confidence-scale bug in `groundLocation`
**Impact: Medium — Risk: Low — Cost: Low**
`src/cognitive-engine/grounding/resolver.ts` lines 50/57: normalize `c.score` before assigning to
`GroundedCandidate.confidence` (both city and neighborhood candidate sources need it, and they may
use *different* underlying scales — verify each independently rather than assuming one fix covers
both). This is a real correctness bug in Cognitive Engine's own code, 100% reproducible, that
could let a low-quality guess masquerade as maximum-confidence. Low engineering cost, but touches
actual decision-making logic — should get its own dedicated test (extend
`run-grounding-self-test.ts`) before shipping, not just a quick patch.

### 4. Investigate the underlying LRE engine's city-less fuzzy-matching being too permissive
**Impact: Medium — Risk: Medium — Cost: Medium**
This is the second half of finding 1d: even after #3 normalizes the scale, the underlying
`location-resolution-engine.ts` still treats meaningless fragments as neighborhood-fuzzy-match
candidates with no city scope to constrain the search space. This is pre-existing, shared code
(also used by the legacy pipeline) — changing it has a wider blast radius than anything in
`src/cognitive-engine/`, so it needs its own careful investigation and is **not** a prerequisite
for Phase 8 (the Cognitive-Engine-side fix in #3 already prevents the *scale* bug; this is a
belt-and-suspenders improvement to input quality, lower urgency).

### 5. Fix (or flag) the category rules-coverage gap and keyword collisions
**Impact: Medium — Risk: Low (additive keyword rules) — Cost: Medium**
"موتور سیکلت" needs keyword coverage; "هوندا"/"پراید" need disambiguation so they don't
override a more specific, already-present category signal (spare-parts, motorcycle) in the same
sentence. This lives in the shared rules registry (`src/intake/rules/packs/`), the same system
already flagged this session for the unrelated 1.24M-rule performance issue (`task_954ab24b`) —
worth investigating both together, since whoever reviews the rules pack's structure for one will
likely need to touch the same files for the other.

### 6. Do not start Phase 8 (authoritative cutover) yet
**Impact: (risk-avoidance) — Risk of NOT doing this: High — Cost: N/A (a decision, not work)**
Even though this investigation shows the Cognitive Engine is in genuinely good shape (most "drift"
is either an improvement or a measurement artifact, and the real bugs found are small and
well-scoped), a go/no-go decision made on top of a **known-broken comparator** is not evidence-based
by definition — it would just be trading one guess for another. Re-run the shadow-comparison
batch after items 1–3 ship, on a fresh sample, and make the Phase 8 decision on *that* number.

### Suggested order of execution
1 and 2 together (same file, same PR) → 3 (own PR + test) → re-run shadow batch, get a trustworthy
number → decide on Phase 8 with real evidence → 4 and 5 (lower urgency, wider blast radius,
schedule independently) whenever convenient.

---

## Recommendation #6 Fulfilled — Fresh Shadow Batch, Real LLM + Real Postgres (2026-07-08)

The Semantic Evaluation Engine (SEE, `PLAN/semantic-comparator-architecture.md`) was built and
wired into the real `/api/need-intake/publish` route. The same 30 fixtures from the original batch
were re-published through the real HTTP endpoint (24 succeeded; 6 failed on unrelated, pre-existing
validation rules — a required-neighborhood check and a listing-title-too-generic check, neither
touched by this work). 19 of the 24 completed their real local-LLM shadow comparison within the
observation window (a few were still queued on the LLM server's 4 parallel slots when this report
was written; not blocking — 19 is already a large enough real sample to answer the question this
recommendation asked).

### Headline result

| | Original batch (old comparator) | Fresh batch (SEE, corrected comparator) |
|---|---|---|
| Sample size | 41 events | 19 events |
| "equal" (no field flagged) | **0%** | **78.9%** (15/19) |
| Method | Plain string equality, no ontology, no not-applicable handling | Ontology-distance-aware, not-comparable-aware (§2/§4 of the architecture doc) |

**Control check, same sample, old methodology**: recomputing this exact fresh batch under the OLD
comparator's rule ("any field not identical = drift") gives **19/19 (100%)** — literally every
single event in this fresh sample would have re-triggered the same false 100% alarm the original
investigation diagnosed. The corrected comparator, run on the *same* real LLM output, the *same*
real fixtures, brings that number down to a defensible 21.1% needing attention — direct,
live confirmation that the fix addresses the actual problem, not just the original sample.

### Field-level breakdown (38 field comparisons across 19 events)

| Status | Count | % | What it means |
|---|---|---|---|
| `not-comparable` (`STATE.SOURCE_NEVER_CONTAINED_VALUE`) | 14 | 37% | Location — city set via structured field, absent from the free text the LLM saw. The exact original bug, now correctly excluded from scoring rather than counted as drift. |
| `refinement` (`ONTOLOGY.PARENT_OF`) | 8 | 21% | Category — Cognitive Engine picked a more specific child (`mobile-tablet`→`mobile-phone`, `computer`→`laptop`×3, `residential-rent`→`apartment-rent`×3). A real improvement, correctly no longer counted as drift. |
| `match` | 8 | 21% | Genuine agreement — 4 category (`car`/`car`×3, `game-console`/`game-console`), 4 location (city literally present in the free text too). |
| `ambiguous-but-plausible` | 4 | 11% | Includes the exact real case Step 2's `CategoryOntologyProvider` was built to catch live: legacy=`motorcycle`, cognitive=`car`, correctly classified `sibling` (same top-level branch "vehicles", wrong leaf) — a real, moderate disagreement, not a hard failure. Three more where legacy's answer appeared inside cognitive's own (uncertain) candidate set. |
| `mismatch` | 4 | 11% | **Genuine, still-open issues** — 3× bare "موتور سیکلت" texts where the Cognitive Engine found *no* category candidate at all (`STATE.ONE_SIDE_MISSING`) — this is exactly Recommendation #5's already-documented rules-coverage gap, **not yet fixed**, correctly surfaced on its own with nothing else mixed in. 1× a genuine ambiguity-resolution disagreement (`residential-sale` vs. an ambiguous set that didn't include it). |

### Scoring Policy Engine output (Layer 2, `default-v1`)

Verdict distribution: 11 `acceptable`, 5 `review-recommended`, 3 `escalate` (mean `overallScore`
0.355). The 3 `escalate` cases are exactly the 3 "موتور سیکلت" no-candidate mismatches — the
scoring layer correctly isolates the one real, already-known defect as the thing worth escalating,
rather than diluting it across 100% noise.

### What this confirms

- The comparator-limitation fix (Recommendations #1-2) works on live data, not just unit tests.
- The one class of *genuine* Cognitive Engine defect this fresh sample surfaces (`motorcycle`
  rules-coverage gap) is precisely the same one named in the original investigation
  (Recommendation #5) — nothing new, nothing hidden, and it's no longer buried under 90+ points of
  measurement noise.
- No new defect was discovered in this run. Recommendations #3-5 (confidence-scale bug fix, LRE
  permissiveness, rules-coverage gap) remain open, unimplemented, and are unaffected by this work.

### Data hygiene

The 19 verification events were deleted from `IntakeMigrationEvent` after this analysis, matching
this project's existing convention (verification/test data should not pollute the shared analytics
table used for real production drift monitoring) — the numbers above are preserved here instead.

### On Phase 8

This number is real evidence, not a green light by itself. Per every prior round's explicit
instruction: **Phase 8 (authoritative cutover) is a separate decision requiring its own dedicated
sign-off, and is not started by producing this number.** What this section does establish: the
comparator itself is no longer the obstacle to making that decision with real evidence — the
remaining open items are Recommendations #3-5, which are Cognitive Engine/rules-registry fixes, not
measurement problems.

---

## Recommendations #3-5 Implemented — Cognitive Engine Quality Pass (2026-07-08)

All three remaining Cognitive Engine defects named above were investigated in full and fixed at
their root cause (implementation only — the Semantic Evaluation Engine architecture, Comparator
contracts, and Scoring Policy were explicitly left unchanged, per instruction). Full technical
detail lives in code comments at each fix site; this section summarizes findings and validates the
result against a fresh, real batch.

### Priority 1 — Confidence normalization

Audited every confidence/score producer in the location + category pipeline. Found the known bug
plus one twin: `location-lre-bridge.ts` converts LRE confidence to [0,1] for the field-bag path
(`lreConfidenceToField`) but was returning `cityCandidates[]`/`candidates[]` scores RAW (0-100+
scale) — the exact fields `src/cognitive-engine/grounding/resolver.ts` reads. A separate,
already-correct 0-1 pathway (`city-disambiguation.ts`, used as a fallback in `hybrid-pipeline.ts`)
meant `ParsedIntent.cityCandidates[].score`'s scale silently depended on *which* resolver produced
it — a real, distinct inconsistency beyond the one already known.

**Fixed**: added `toUnitConfidence()` at the actual source (`location-lre-bridge.ts`) — a plain
`raw/100` clamp with no artificial floor (deliberately NOT reusing `lreConfidenceToField`, whose
0.4 floor is correct for a displayed field confidence but would have compressed the exact
weak/strong signal range a ranked candidate list needs). Added loud, source-and-id-identifying
`console.error` + candidate-drop (not silent clamping) at the point `grounding/resolver.ts`
constructs `GroundedCandidate`s, and a second, correctly-scoped check in `decision-engine.ts` — the
first attempt at the latter accidentally flagged the `conflictPenalty` formula's own, legitimate
negative intermediate values as false positives; caught via the existing self-test suite and fixed
by moving the check to where `c.confidence` is first read, not to the shared `clamp01` utility.

**Second bug found and fixed in the same audit**: `src/cognitive-engine/grounding/resolver.ts`'s
`statusFromRankedCandidates` treated candidate COUNT (`=== 1`) as sufficient for `'resolved'`,
regardless of how weak that lone candidate's confidence was. Combined with the scale bug, a weak
nationwide fuzzy match landing as the sole candidate could reach "resolved" purely because nothing
competed with it. Added `MIN_SOLE_CANDIDATE_CONFIDENCE = 0.5` — a lone candidate below this bar is
now `'ambiguous'`, never silently dropped, just no longer auto-trusted.

### Priority 2 — Location Resolver (LRE) permissiveness

Traced the exact mechanism: `rankGlobalNeighborhoodCandidates` searches the *entire* nationwide
catalog when no city is scoped, and a single weak token-overlap match (as little as one shared
token) can reach a score high enough to pass as a candidate, with zero corroborating signal.
Explained per the investigation's request — why it exists (supports legitimate hint-driven
matches like "سیدی" → مشهد, where no city is stated but a strong fragment alone is reliable
evidence), when it succeeds (exact/near-exact name matches, with or without a city hint), when it
fails (short/generic fragments with no city hint, weak token overlap only).

**Fixed**: added `NO_HINT_WEAK_MATCH_DISCOUNT = 0.55`, applied only when there is no city hint at
all and the raw match is below `STRONG_MATCH_FLOOR = 85` (i.e., not already a near-exact
match). This is an explicit precision/recall trade-off: a small recall cost (a genuinely-correct
but weakly-scored nationwide guess may now require a follow-up question) for a large precision
gain (a generic fragment can no longer coincidentally out-score its way to auto-resolution
nationwide). Verified directly: `resolveLocation("دانشجو")` now returns `status: 'city_ambiguous'`
(never auto-resolves), while `resolveLocation("... تو سیدی")` still correctly resolves to مشهد via
the legitimate hint path — the fix targets the failure mode without touching the success case.

### Priority 3 — Vehicle category ontology gap

Investigated the full class, not just "موتور سیکلت", using the real rules registry (verified live
via `matchCategoryCandidatesFromRules`, not static reading alone — a static-only read was
initially misleading). Root cause, precisely verified: a pre-existing negative rule
(`{slug:'motorcycle', pattern:'موتور', unless:[...]}`) exists specifically to stop the generic
word "موتور" (also "engine"/"motor" in car/mechanic contexts) from over-crediting motorcycle — but
its `unless` exception list included the no-space variant `'موتورسیکلت'` and NOT the with-space
`'موتور سیکلت'`, even though the latter is separately registered as motorcycle's own positive
keyword. Any text containing "موتور سیکلت" (the natural way to write it) tripped the negative
rule via the bare "موتور" substring, wiping motorcycle's entire score via the rule engine's ×3
negative-weight penalty and dropping it from the candidate list — reproduced and confirmed via
`matchCategoryCandidatesFromRules("موتور سیکلت")` returning `[]` before the fix. The same
underlying mechanism explained BOTH reported symptoms at once (the bare-phrase zero-candidate case
and the "car wins via هوندا" case) — not two separate bugs.

A second, separate gap: the `car-ride` slug already had a spare-parts exception guard for its
`پراید` keyword (`unless: ['قطعه','یدکی']`), but the plain `car` slug had none for ANY of its
brand words — so "قطعه یدکی گیربکس خودرو پراید" scored car=345 vs spare-parts=315 (car wins) via
unconditional `خودرو`/`پراید` keyword hits.

**Fixed, generalized** (not a one-off patch): (1) added the missing with-space variant to the
`موتور` negative rule's `unless` list. (2) Added negative rules triggered by the SPARE-PARTS
words themselves (`قطعه`, `یدکی`) targeting `car`/`car-ride` — this discounts car/car-ride for
*every* brand word at once when a spare-parts phrase is present, not one brand at a time (an
earlier draft of this fix incorrectly targeted individual brand words with `unless` pointed the
wrong direction — caught and corrected before finalizing, see the code comment in
`legacy-bridge.ts` documenting the mistake so it isn't repeated). (3) Added a motorcycle-phrase
trigger (`موتور سیکلت`/`موتورسیکلت`) discounting `car`, covering the "هوندا" collision generally
rather than guarding that one brand word specifically. Verified live: all three originally-reported
cases now resolve correctly, and a control case with no spare-parts/motorcycle words ("خودرو
پراید مدل بالا میخوام بخرم") is unaffected — confirming the fix doesn't over-suppress legitimate
car listings.

### Validation — fresh batch, real LLM + real Postgres, same fixtures as Recommendation #6

Re-ran the identical 30-fixture batch a third time (Steps 1/2 already used it for the original
investigation and the Recommendation #6 re-run above) after all three fixes shipped. 19/24
successful publishes completed their shadow comparison in the observation window — same sample
size as the immediately-prior baseline, directly comparable.

| Metric | Before (this doc, "Recommendation #6 Fulfilled") | After (post P1-P3 fixes) | Change |
|---|---|---|---|
| Sample size | 19 | 19 | — |
| `equal` (corrected meaning) | 78.9% (15/19) | **94.7% (18/19)** | +15.8pp |
| Category `match` (exact identity) | 4 | **9** | +125% |
| Category `mismatch` | 4 (all موتور سیکلت) | **1** (unrelated case) | −75% |
| Verdict: `escalate` | 3 | **0** | −100% |
| Mean `overallScore` | 0.355 | **0.145** | −59% |

**Direct, live confirmation of the fix**: every one of the 4 "motorcycle" category comparisons in
this fresh batch now shows `match (ONTOLOGY.IDENTICAL) legacy=motorcycle cognitive=motorcycle` —
in the prior batch, these were exactly the `mismatch (STATE.ONE_SIDE_MISSING) cognitive=missing`
cases. This is the real production pipeline, real LLM output, not a rules-matcher unit test.

**Remaining mismatch class (1 of 19, unrelated to this investigation)**: `residential-sale` vs. an
`ambiguous` cognitive candidate set that didn't include it (`STATE.AMBIGUOUS_CANDIDATE_MISMATCH`)
— present in both the before and after batches, a distinct real-estate-sale ambiguity-resolution
disagreement never targeted by Priorities 1-3. Named honestly as a genuinely open item, not folded
into this investigation's claimed fixes.

**Remaining ambiguity classes**: 2 `ambiguous-but-plausible` cases (a `car`-vs-ambiguous-candidate
match and a `شیراز`-vs-ambiguous-candidate match) — both represent the Decision Engine correctly
flagging uncertainty rather than guessing, not defects.

**`not-comparable` rate unchanged (14/19, 74%)** — expected and correct: this is the
location/sourceText test-harness artifact fixed at the Comparator level (Recommendations #1-2,
already shipped), entirely orthogonal to the Cognitive Engine implementation fixes in this
section. It stays excluded from scoring exactly as designed.

**Confidence distribution**: no location or category candidate reaching the Decision Engine was
ever flagged by the new `keepIfUnitConfidence`/`assertUnitConfidence` guards during this batch —
zero invalid-confidence log lines, consistent with the fix eliminating the scale bug at its source
rather than merely detecting it downstream.

**Unresolved root causes**: none discovered beyond what was already fixed. The one remaining
mismatch is a distinct, pre-existing, never-investigated ambiguity-resolution question (not a
scale, permissiveness, or ontology-coverage defect), appropriate to scope as its own future
investigation rather than retrofit into this one.
