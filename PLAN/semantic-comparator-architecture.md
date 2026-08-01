# Semantic Evaluation Engine — Architecture Specification (v2)

**Status: Design only. No code written, no existing implementation modified. This document
supersedes v1 of this file in full — v1 treated "the comparator" as a single component that both
measured differences and implicitly baked in scoring (`FieldSpec.weight`, `ComparisonReport.
aggregate.driftScore`). That was a real architectural mistake, caught in this revision (§1, §3):
a component that measures semantic difference must not also decide how much that difference
matters, because "how much it matters" is a business/marketplace decision, and the two decisions
have different owners, different rates of change, and different failure modes. v2 corrects this by
splitting one component into a three-layer platform capability. This is the last design revision
requested before implementation approval; §13 gives the formal readiness verdict.**

---

## 0. Terminology (resolves the naming question first, since it changes vocabulary for
everything below)

**"Semantic Comparator" is renamed conceptually, but not deleted — it is now precisely one of
three named layers, not the name of the whole capability:**

| Layer | Name | Responsibility | Knows about business priority? |
|---|---|---|---|
| 1 | **Semantic Comparator** | Measures semantic difference between two `SemanticSnapshot`s: state, distance, relationship, explanation *parameters*. Produces a `ComparisonReport`. | **No — never.** |
| 2 | **Scoring Policy Engine** | Applies a marketplace/vertical-specific `ScoringPolicy` (weights, thresholds) to a `ComparisonReport`. | **Yes — this is its entire job.** |
| 3 (composed) | **Semantic Evaluation Engine** | Orchestrates Layers 1→2, renders explanations for a target language, and produces the final, verdict-bearing `FinalEvaluation`. This is the platform-level name for the whole capability. | Indirectly, via the policy it invokes. |

**Why not one of the four suggested alternatives for the whole thing:**
- *Semantic Validation Engine* — rejected. "Validation" implies pass/fail against rules, which
  RFC-002's own plan already identified as a near-duplicate of a *different*, pre-existing
  concept (Part 3's Need Validation vs. Part 10's Business Readiness — the plan explicitly
  resolved that collision by treating them as one rule-engine responsibility). Reusing
  "Validation" here would recreate the exact same naming collision RFC-002 already had to fix
  once.
- *Semantic Equivalence Engine* — rejected. Too narrow: implies a binary same/different verdict,
  which erases the entire point of the state/status gradation built in §2 and the investigation
  report before it (refinement, ambiguous-but-plausible, contradictory are not "equivalent or
  not").
- *Semantic Assessment Engine* — a reasonable synonym, not chosen only because "Evaluation" keeps
  the component name and its terminal output type name (`FinalEvaluation`) self-consistent —
  a small but real readability win for anyone reading logs or code later.
- *Semantic Evaluation Engine* — **adopted**, for the composed, three-layer capability. It
  correctly implies a verdict is produced (Layer 3's job), while "Comparator" is kept, correctly
  narrowed, for the sub-component that explicitly does *not* produce a verdict (Layer 1).

**Why "Comparator" is actually the *more* correct name now, not less**: in v1 the comparator
computed a weighted `driftScore`, which is already a verdict-adjacent judgment. Removing that (§1,
§3) makes "Comparator" a precise description of what Layer 1 actually does — compare, not judge.

---

## 1. Layered Architecture Overview

```
   Adapter A                Adapter B
(legacy-to-snapshot)   (cognitive-to-snapshot)     ... future adapters (new engines, new AI providers)
       │                        │
       ▼                        ▼
  SemanticSnapshot         SemanticSnapshot
       │                        │
       └───────────┬────────────┘
                    ▼
         ┌─────────────────────────────┐
         │   LAYER 1: SEMANTIC          │   deterministic, no AI, no business awareness
         │   COMPARATOR                 │   (INV-01, INV-02, INV-09 — see §7)
         │   → per-field state,         │
         │     distance, relationship,  │
         │     explanation params       │
         └──────────────┬───────────────┘
                         ▼
                 ComparisonReport            ◄── persisted immutably, versioned (§6)
                         │
                         ▼
         ┌─────────────────────────────┐
         │   LAYER 2: SCORING POLICY    │   pure data + a resolver — marketplace-aware,
         │   ENGINE                     │   deterministic given a policy version (§4)
         │   → applies weights/         │
         │     thresholds from a        │
         │     ScoringPolicy            │
         └──────────────┬───────────────┘
                         ▼
                 FinalEvaluation             ◄── persisted immutably, versioned (§6)
                         │
                         ▼
              (presentation layer: renders
               reasonCode + reasonParams into
               Persian/English/etc. — §8)
```

**Correction from v1, stated explicitly**: `FieldSpec.weight` and `ComparisonReport.aggregate.
driftScore` are removed from the Comparator entirely. Layer 1's output now contains zero weighting
information — only facts (state, distance, relationship, explanation parameters) and simple,
weight-free counts (how many fields were `match`/`refinement`/`mismatch`/etc. — counting is not
weighting). All weighting, thresholding, and verdict logic moves to Layer 2. This is the concrete
fix for "the comparator must never know these business priorities."

---

## 2. Semantic Value State Model

`presence: 'present' | 'absent' | 'not-applicable'` (v1) is replaced by a richer, closed
`SemanticValueState` enum. Each state is defined fully below, per the required dimensions.

| State | Definition | Semantic meaning | Readiness implication | Comparison behavior | Explainability |
|---|---|---|---|---|---|
| **Unknown** | No extraction/grounding attempt has been made for this field yet (evidence gathering incomplete, or this field isn't in scope for the current source version). | "We haven't looked." Distinct from Missing — no negative result exists, just no attempt. | Cannot block or satisfy readiness — it's an open question, not a failure. Excluded from readiness scoring entirely. | `not-comparable` — comparing "never looked" to anything is meaningless. | "This field was never evaluated by \[sourceSystem\]." |
| **Missing** | An attempt was made (evidence/grounding ran) and produced no candidate. | "We looked and found nothing." A real, if benign, gap in what the input/pipeline could surface. | Blocks readiness if the field is mandatory. | Comparable: `missing` vs. any resolved-family state → `mismatch`; `missing` vs. `missing` → `match` (low-signal, both sides agree there's nothing — still logged, not discarded). | "The system attempted to determine this field and found no candidate." |
| **Not Applicable** | The raw input this source received structurally could never have contained this information (e.g. the city was never in the free text the LLM saw — the exact bug the investigation found). | "It was never possible to find this here." Not a pipeline defect — an input-scope fact. | Never blocks; if mandatory-but-not-applicable, that's a signal the *input collection step* (not the engine) needs fixing. | `not-comparable`, always — this is the direct fix for the investigation's 28/41 finding; a Not-Applicable field is never scored as a mismatch by any downstream layer. | "This field could not be evaluated because the source input never contained the necessary information (e.g. city absent from free text)." |
| **Contradictory** | Two or more evidence items assert incompatible values for the same field with comparable confidence, and no resolver/decision logic can prefer one over the other. | Distinct from Ambiguous: these assertions *conflict* (mutually exclusive), not merely *co-plausible*. | Blocks readiness strongly — the most severe non-ready state; requires an explicit clarification, not a best-guess pick. | Elevated-severity status (`contradiction-detected`, not folded into ordinary `mismatch`) on either side — the fix isn't "which is right," it's "the input needs disambiguating." | "Conflicting evidence was found: \[span A\] suggests X, \[span B\] suggests Y, with no basis to prefer either." |
| **Resolved** | A single, confident, decided value exists via direct grounding + Decision Engine acceptance. | The "normal success" terminal state — today's Decision `preferred` + accepted Claim. | Satisfies readiness. | Full comparison behavior (ontology distance / geo / range / etc., per the field's value shape). | "Determined via \[resolver/evidence chain\] with confidence \[c\]." |
| **Inferred** | A value reached through rule/heuristic derivation chaining multiple weaker signals, rather than one direct grounding hit (e.g. category inferred from two weak co-occurring signals). | Distinct from Resolved: same terminal confidence tier, different provenance shape — a chain, not a single hit. | Can satisfy readiness; a policy MAY require extra confirmation for Inferred values on mandatory fields (a Layer-2 policy decision, not a Comparator concern). | Comparable normally, but the explanation must record the inference chain distinctly, since drift here likely has a different root cause (weak transitive logic) than drift on a Resolved field (grounding mismatch). | "Derived via inference: \[evidence + rule chain\], not directly stated." |
| **Estimated** | A numeric/range value approximated from partial or proxy information (e.g. a budget estimated from comparable listings, a vague temporal phrase converted to a window). | Distinct from Inferred: Inferred is symbolic/categorical derivation; Estimated is specifically numeric/range approximation carrying an inherent margin of error. | Can satisfy readiness for non-mandatory numeric fields; should not alone satisfy a mandatory numeric constraint (Layer-2 policy decision). | Uses range-overlap/tolerance-band comparison (the field's own declared shape config, not a policy concern) rather than exact equality. | "Estimated from \[proxy signal\], not directly stated; margin of error: \[x\]." |
| **Ambiguous** | Multiple plausible, *non-conflicting* candidates exist with comparable confidence (e.g. two neighborhoods with near-identical fuzzy-match scores). | Distinct from Contradictory: these don't conflict, they're all consistent with limited information — the gap is a *choice*, not a *conflict*. | Blocks readiness if mandatory — formalizes today's ad hoc `requiresClarification` boolean into a first-class state. | If the other side's resolved value matches **any** candidate in the ambiguous set (not just the top-ranked one) → `ambiguous-but-plausible`, not `mismatch`. This generalizes the exact `preferred`-vs-`accepted` distinction the investigation's Phase 4 uncovered into a first-class rule instead of a one-off special case. | "Multiple plausible candidates found with comparable confidence: \[list\]; comparison checked all of them, not only the top-ranked guess." |

Updated field-value contract:

```ts
type SemanticValueState =
  | 'unknown' | 'missing' | 'not-applicable' | 'contradictory'
  | 'resolved' | 'inferred' | 'estimated' | 'ambiguous';

interface SemanticFieldValue {
  fieldId: string;
  state: SemanticValueState;
  value: SemanticValue | null;          // null for unknown / missing / not-applicable
  candidates?: SemanticValue[];         // populated for ambiguous (co-plausible set) and contradictory (conflicting set)
  confidence: number | null;            // 0..1, normalized — see §8's adapter-normalization obligation
  provenance: {
    sourceSystem: string;
    evidenceRefs: string[];
    derivation: 'direct' | 'inferred' | 'estimated';
  };
}
```

### State-compatibility matrix (drives Layer 1's status output)

| Side A state | Side B state | Resulting status |
|---|---|---|
| `unknown` (either side) | any | `not-comparable` (reason: `NOT_YET_EVALUATED`) |
| `not-applicable` (either side) | any | `not-comparable` (reason: `SOURCE_NEVER_CONTAINED_VALUE`) |
| `contradictory` (either side) | any | `contradiction-detected` (elevated severity, never folded into `mismatch`) |
| `missing` | `missing` | `match` (reason: `BOTH_FOUND_NOTHING`, low-signal but logged) |
| `missing` | resolved-family (`resolved`/`inferred`/`estimated`) | `mismatch` (reason: `ONE_SIDE_FOUND_NOTHING`) |
| `ambiguous` | resolved-family, value ∈ candidate set | `ambiguous-but-plausible` |
| `ambiguous` | resolved-family, value ∉ candidate set | `mismatch` |
| resolved-family | resolved-family | per value shape: ontology distance (`match`/`refinement`/`mismatch`), geo, range-overlap, or set/graph similarity |

---

## 3. Comparator Contracts (Layer 1 — updated)

```ts
interface FieldComparisonResult {
  fieldId: string;
  status: 'match' | 'refinement' | 'semantic-equivalent' | 'ambiguous-but-plausible'
        | 'contradiction-detected' | 'mismatch' | 'not-comparable';
  legacyValue: SemanticFieldValue;
  cognitiveValue: SemanticFieldValue;
  relationship: OntologyRelationship | null;
  reasonCode: string;                          // stable, closed-ish vocabulary
  reasonParams: Record<string, unknown>;        // structured — see §8, replaces v1's baked-in reasonText string
  // NOTE: no `weight` field here anymore (moved to ScoringPolicy, §4).
}

interface ComparisonReport {
  reportId: string;
  comparedAt: string;
  legacySnapshotId: string;
  cognitiveSnapshotId: string;
  versionStamp: ComparatorVersionStamp;          // see §6
  fieldResults: FieldComparisonResult[];
  counts: {                                      // pure counts, NOT a weighted score — that's Layer 2's job
    comparable: number;
    match: number;
    refinement: number;
    semanticEquivalent: number;
    ambiguousButPlausible: number;
    contradictionDetected: number;
    mismatch: number;
    notComparable: number;
  };
}
```

Everything else from v1's §1–§2 (six value shapes, `OntologyProvider` interface, `FieldSpec`
registry driving Layer 1's core loop) is unchanged and still holds — restated briefly in §9 for
completeness, with one revision from §8's multilingual finding: `OntologyRef` drops `label`.

---

## 4. Scoring Policy Framework (Layer 2 — new)

The Comparator (Layer 1) never sees a marketplace, a vertical, or a weight. A separate,
independently deployable layer reads a `ComparisonReport` plus a chosen `ScoringPolicy` and
produces a `FinalEvaluation`. This is pure data-driven, deterministic computation — no code branch
in this layer is allowed to depend on wall-clock time, randomness, or an AI call.

```ts
interface ScoringPolicy {
  policyId: string;                    // e.g. 'vehicles-v1', 'real-estate-v1', 'jobs-v1', 'default-v1'
  policyVersion: string;               // semver — see §6
  appliesTo: PolicyScope;              // e.g. { marketplaceVertical: 'vehicles' } | { global: true }
  fieldWeights: Record<string, number>;      // fieldId -> weight; unlisted fields use defaultWeight
  defaultWeight: number;
  statusWeightModifiers?: Partial<Record<FieldComparisonResult['status'], number>>;
    // e.g. { refinement: 0.2, contradictionDetected: 2.0 } — a vertical can decide a refinement
    // barely matters (0.2x) while a contradiction matters twice as much as an ordinary mismatch.
  thresholds: {
    acceptableMaxScore: number;        // overallScore at/below this → verdict: 'acceptable'
    escalateMinScore: number;          // overallScore at/above this → verdict: 'escalate'
    // between the two → 'review-recommended'
  };
}

type PolicyScope = { global: true } | { marketplaceVertical: string } | { categoryBranch: string };

interface FinalEvaluation {
  evaluationId: string;
  comparisonReportId: string;          // links back to Layer 1's immutable output — never duplicates it
  versionStamp: EvaluationVersionStamp; // see §6 — includes policyId + policyVersion
  perField: Array<{
    fieldId: string;
    status: FieldComparisonResult['status'];
    distance: number | null;
    weight: number;                    // resolved from the policy, not the comparator
    weightedContribution: number;
  }>;
  overallScore: number;
  verdict: 'acceptable' | 'review-recommended' | 'escalate';
}
```

**Worked examples the user gave, now expressible directly**:
- Vehicle marketplace: `ScoringPolicy{policyId:'vehicles-v1', fieldWeights:{location: 1.0,
  category: 0.5}}` — location dominates.
- Job marketplace: `ScoringPolicy{policyId:'jobs-v1', fieldWeights:{'skills[]': 1.0, location:
  0.3}}` — skills dominate (once a `skills[]` field exists — a `set`-shaped field per v1's §1/§4,
  requires no new machinery).
- Real estate: `ScoringPolicy{policyId:'real-estate-v1', fieldWeights:{propertyType: 1.0, brand:
  0.1}}`.

**Determinism**: a `ScoringPolicy` is pure data (JSON-serializable, no functions) — the engine that
applies it is a pure function `(ComparisonReport, ScoringPolicy) → FinalEvaluation`. Same report +
same policy version ⇒ byte-identical `FinalEvaluation`, always.

**Policy resolution**: a `PolicyResolver` picks the most specific matching `PolicyScope` for a
given evaluation context (e.g. `categoryBranch` match beats `marketplaceVertical` beats `global`
default), falling back to a `default-v1` global policy when no vertical-specific policy exists yet.
This resolver is itself simple, data-driven, and deterministic — no ML, no AI.

**Policy versioning**: every `ScoringPolicy` is independently versioned (§6). Multiple versions of
the same `policyId` can be simultaneously "live" — e.g. a marketplace piloting a new weighting
scheme in shadow mode against the current one, mirroring exactly how this whole capability began
life as a Phase-7 shadow utility. Nothing about this design requires only one version of a policy
to exist at a time.

**Composability, explicitly deferred**: a future need for layered/inheriting policies (a global
baseline + a marketplace-specific overlay that only overrides a few weights) is a plausible,
low-risk future extension of `ScoringPolicy` — noted here so it isn't forgotten, not designed now,
since no real second marketplace vertical exists yet to validate the shape against (same
"don't fabricate a subsystem nothing uses yet" discipline the rest of the Cognitive Engine
already follows).

---

## 5. Ontology Provider Interface (reaffirmed, one revision)

Unchanged from v1: `OntologyProvider.relate(a, b) → OntologyRelationship`, namespace-keyed,
injected rather than imported by name. Category tree remains one interchangeable implementation
(`CategoryOntologyProvider`), not special-cased logic.

**Revision (driven by §8's multilingual finding)**: `OntologyRef` drops `label` from the semantic
contract entirely:

```ts
interface OntologyRef { namespace: string; id: string; }   // label removed
```

Human-readable labels are a presentation concern, resolved by looking up `(namespace, id)` against
the relevant ontology provider **at render time**, in whatever language is needed, not carried as
a fixed-language string through snapshots/reports that may be read back years later or rendered in
a different language than the one active when the comparison ran.

**Open question, explicitly not solved here**: if a future RFC-003 ontology and today's category
ontology both classify overlapping real-world concepts (e.g. a "marketplace-entity" namespace and
"category" namespace both trying to describe "apartment"), nothing in this design detects that
overlap — two providers could produce conflicting relationships for what is actually the same
concept. This is named as a known open question for RFC-003 to resolve (a namespace-overlap
registry/detection responsibility), not something this component should solve speculatively today,
since only one ontology provider exists in the entire platform right now.

---

## 6. Versioning Strategy & Deterministic Replay

Five independently-versioned axes, each semver'd (MAJOR.MINOR.PATCH):

| Axis | What it versions | Bumped when |
|---|---|---|
| **Comparator Engine Version** | The Layer-1 comparison algorithms (state-compatibility matrix, value-shape strategies) | Comparison *logic* changes — e.g. a new value shape, a change to how `ambiguous-but-plausible` is decided |
| **Semantic Contract Version** | The `SemanticSnapshot` / `SemanticFieldValue` / `SemanticValue` wire schema | The *shape* of inputs changes — new value shape, new state added to the enum |
| **Scoring Policy Version** | Each individual `ScoringPolicy` document | Any weight/threshold in that specific policy changes |
| **Ontology Version** | Each individual `OntologyProvider` implementation | Its underlying data changes in a way that could alter a `distance` result (e.g. `categories.ts` reparents a slug) |
| **Evaluation Report Version** | The `ComparisonReport` / `FinalEvaluation` *output* schema (data-at-rest format) | The persisted shape changes, independent of the engine that produced it |

```ts
interface ComparatorVersionStamp {
  comparatorEngineVersion: string;
  semanticContractVersion: string;
  ontologyVersions: Record<string, string>;      // namespace -> version, since multiple providers may be involved
}

interface EvaluationVersionStamp extends ComparatorVersionStamp {
  scoringPolicyId: string;
  scoringPolicyVersion: string;
  evaluationReportVersion: string;
}
```

**Deterministic replay — mandatory requirement, satisfied as follows:**

1. `SemanticSnapshot`s are persisted immutably, append-only, content-addressable by
   `snapshotId` — never overwritten. This mirrors RFC-002 ADR-008 (Evidence immutability),
   applied here to the semantic-contract layer instead of raw Evidence.
2. Every `ComparisonReport` and `FinalEvaluation` records its full version stamp at creation time.
   A versioned artifact registry (comparator engine builds, policy documents, ontology-provider
   snapshots) never deletes or overwrites a version — only supersedes it, the same
   supersede-don't-mutate discipline RFC-002 ADR-036 already applies to Claims.
3. Replay = look up the exact pinned comparator engine build + exact policy document + exact
   ontology-provider snapshot named in the stamp, and re-run against the same two immutable
   snapshots. A deterministic engine (INV-01) applied to identical inputs and identical pinned
   dependencies **must** produce a byte-identical output.
4. **Non-negotiable rule**: upgrading the Comparator, a Scoring Policy, or an Ontology Provider
   NEVER retroactively alters a previously persisted `ComparisonReport`/`FinalEvaluation`. Wanting
   to know "what would today's engine say about an old case" is a distinct, explicit action — a
   new evaluation, referencing the old snapshots plus a new version stamp — never an in-place
   mutation of history.
5. `Semantic Contract Version` uses compatibility ranges (adapters declare which version(s) they
   emit; the Comparator declares which range it accepts) so a contract upgrade can roll out
   gradually — old adapters and a new Comparator (or vice versa) coexist during migration, matching
   the additive-rollout discipline every phase of this project has used since Phase 1.

---

## 7. Architectural Invariants

| ID | Invariant | Inherits from / rationale |
|---|---|---|
| INV-01 | The Comparator SHALL be deterministic: identical `SemanticSnapshot` pair + identical pinned versions ⇒ identical `ComparisonReport`. | Required for replay (§6); matches RFC-002's Decision-determinism conformance check (Phase 6 self-test). |
| INV-02 | The Comparator SHALL never invoke an AI/LLM call, directly or indirectly, at comparison time. | Stronger than RFC-002 ADR-052 ("AI is swappable") — here AI is *absent entirely*, not merely swappable. |
| INV-03 | The Comparator SHALL never mutate its inputs. `SemanticSnapshot`s are read-only; every output is a new object. | Standard purity requirement; also required for §6's immutable-snapshot replay guarantee. |
| INV-04 | The Comparator SHALL attach a non-optional `reasonCode` + `reasonParams` to every field comparison result, regardless of status. | §3, §8 — explainability is not optional, and is renderable, not a fixed string. |
| INV-05 | The Comparator SHALL remain provider-independent: it SHALL NOT import a concrete `OntologyProvider` implementation by name. | §5 — providers are injected via a namespace-keyed map. |
| INV-06 | The Comparator SHALL operate only on `SemanticSnapshot` contracts. It SHALL NOT import any concrete source-system type (`NeedDraft`, `CognitivePipelineResult`, or any future engine's native output). | Prior design's independence requirement, unchanged. |
| INV-07 | The Comparator SHALL be replayable: any `ComparisonReport` SHALL be reproducible byte-for-byte from its `EvaluationVersionStamp` and the original immutable snapshots. | §6. |
| INV-08 | The Comparator SHALL support new fields, value shapes, and ontology providers via additive registry entries only — never a rewrite of existing field handling. | v1 §1/§4's 100-field test, reaffirmed. |
| INV-09 | The Comparator SHALL NOT be aware of business priority, marketplace vertical, or weighting. Importance-assignment lives exclusively in the Scoring Policy Engine. | §1, §4 — the core correction this revision makes. |
| INV-10 | The Comparator SHALL distinguish Unknown / Missing / Not-Applicable / Contradictory / Resolved / Inferred / Estimated / Ambiguous. It SHALL NOT collapse these into a single "absent"/null representation. | §2. |
| INV-11 | Persisted `ComparisonReport`s and `FinalEvaluation`s SHALL NOT be retroactively altered when the Comparator, a Policy, or an Ontology Provider is upgraded. | §6; mirrors RFC-002 ADR-008/ADR-036. |
| INV-12 | The Comparator's output SHALL be JSON-serializable with no live object references. | Enables both replay (§6) and safe promotion to a networked service later without an interface change (prior design §5). |
| INV-13 | The Comparator SHALL NOT branch its logic on the `sourceSystem` identifier of a snapshot — only on registered value shapes and ontology namespaces. | §8 — closes the "multiple engines" coupling risk found in the long-term review. |
| INV-14 | The Comparator SHALL NOT emit a `reasonCode` that is not a published entry in the central Reason Code Registry. Reason codes are looked up, never invented at comparison time. | §14 (Reason Code Governance) — added after Step 1 approval, before Step 2. |

---

## 8. Long-Term Extensibility Review (five-year lens)

Walking the architecture against each assumption the review asked for:

- **Multiple Cognitive Engines**: already sound structurally — every engine gets its own adapter;
  the Comparator only sees `sourceSystem` (a label) and a `SemanticContractVersion`. **Coupling
  found**: nothing previously stopped a future maintainer from having the Comparator branch on a
  specific `sourceSystem` string as a shortcut. **Fixed**: formalized as INV-13.
- **Multiple AI providers**: not the Comparator's concern at all (INV-02). **Coupling found**: the
  *adapters* are exactly where a provider-specific quirk could leak in un-normalized — this is
  literally the confidence-scale bug the investigation already found once (a 0–100 score reaching
  a 0–1 field unclamped). **Fixed**: formalized as a non-negotiable adapter obligation — adapters
  MUST normalize confidence to `[0,1]` and MUST classify into one of §2's eight states before
  producing a `SemanticFieldValue`; Zod schema validation (`.min(0).max(1)`) is the enforcement
  backstop, the same pattern already used elsewhere in this codebase (`GroundedCandidate.
  confidence`, `CNOSemanticEntity.confidence`).
- **Multiple ontologies**: handled by the namespace-keyed provider map. **Open question, not
  fixed** (see §5): overlapping namespaces from different ontologies aren't reconciled by this
  design — explicitly deferred to RFC-003.
- **Hundreds of semantic fields**: already addressed (v1's 100-field test) and unaffected by the
  state-model expansion in §2 — states are a per-value concern, orthogonal to field count.
- **Multilingual extraction — real coupling found and fixed now**: v1 baked `reasonText` as a
  single, implicitly-Persian, pre-rendered string directly into `FieldComparisonResult`, and
  `OntologyRef.label` similarly carried a fixed-language string through the whole pipeline. Both
  would have made multilingual support an expensive retrofit once real persisted reports existed
  with hardcoded Persian text baked into `reasonText`. **Fixed now, while it's cheap**: `reasonText`
  is replaced by `reasonCode` + structured `reasonParams` (§3) — human-readable rendering happens
  in a separate, replaceable presentation layer at read time, in whichever language is needed.
  `OntologyRef.label` is dropped from the contract entirely (§5) — labels are resolved from
  `(namespace, id)` at render time, not carried through storage.
- **Cross-marketplace evaluation**: this is exactly what §4's Scoring Policy Framework already
  solves — reaffirmed, no new coupling found.

**Net result of this review**: two concrete contract changes adopted directly into this document
(structured explanations instead of strings; `label`-free `OntologyRef`), one new invariant
(INV-13), and one explicitly-named-but-deferred open question (ontology namespace overlap, owned
by RFC-003, not this component).

---

## 9. Field Scope & Extensibility (reaffirmed from v1, condensed)

Layer 1's core loop is generic over six value shapes (`scalar-ontology`, `scalar-geo`, `set`,
`range`, `graph`, plus the state model in §2 layered on top of all of them) driven by a data-only
`FieldSpec` registry — no per-field-name branch exists anywhere in the core. Intent, Primary/
Secondary Objects, Entities, Attributes, Temporal, Relationships, and the whole CNO each fit one
of these shapes; adding any of them is a registry row plus adapter support, never new comparator
code. Full detail and the "100 fields in two years" walkthrough is unchanged from v1 and still
holds under this revision — the scoring split and state-model expansion are both orthogonal to
field count.

---

## 10. Independence / Package Boundary (reaffirmed from v1)

The dependency-boundary diagram from v1 §5 is unchanged and now extends cleanly to Layer 2:
the Scoring Policy Engine depends only on `ComparisonReport` (Layer 1's output contract) and
`ScoringPolicy` (its own data contract) — it likewise never imports `NeedDraft`,
`CognitivePipelineResult`, or any concrete engine type. Both layers remain recommended as
in-process modules for now (JSON-serializable contracts at every boundary keep promotion to a
networked service a pure infrastructure change later, per INV-12).

---

## 11. Non-goals (carried forward and extended from v1)

- No RFC-003 ontology providers built now (RFC-003 doesn't exist yet).
- No embedding/LLM-based semantic-similarity value shape built now (§4 of v1's reasoning stands:
  an unvalidated similarity judge inside the measurement layer would reintroduce the exact
  measurement-trust problem the original six-phase investigation resolved).
- No literal networked microservice built now.
- No policy storage/authoring mechanism (file? DB table? admin UI?) decided in this document —
  deliberately deferred to implementation planning, not a design gap.
- No ontology-namespace-overlap detection mechanism built now (§5, §8 — owned by RFC-003).
- No policy composability/inheritance mechanism built now (§4 — no second marketplace vertical
  exists yet to validate the shape against).
- No implementation of any kind in this document.
- No change yet to `src/app/api/need-intake/publish/route.ts`, `compare-with-legacy.ts`, or the
  `IntakeMigrationEvent` payload shape.

## 12. Suggested Implementation Order (once approved — not started)

1. Define contracts: `SemanticSnapshot`, `SemanticFieldValue` (with the 8-state model, §2),
   `FieldSpec`, `OntologyProvider`, `FieldComparisonResult` (structured explanation, §3),
   `ComparisonReport` — as real TypeScript + Zod, no behavior yet. Include version-stamp types
   (§6) from day one, not retrofitted later.
2. Implement `CategoryOntologyProvider` (unchanged from v1's plan).
3. Implement the two adapters for today's actual fields (category, location) — including
   `not-applicable` detection for the location/sourceText case, and the confidence-normalization
   obligation from §8.
4. Implement the Layer-1 Comparator core (scalar-ontology and scalar-geo strategies only, the two
   shapes in active use today) plus the state-compatibility matrix (§2).
5. Implement the Layer-2 Scoring Policy Engine with exactly one policy to start
   (`default-v1`, global scope, weights matching today's implicit equal-weighting) — proves the
   layer boundary works before any real marketplace-specific policy is authored.
6. Rewire `publish/route.ts`'s shadow call through Layers 1+2; decide the `IntakeMigrationEvent`
   payload migration.
7. Re-run the shadow batch for a trustworthy number — this remains the actual gate for Phase 8,
   unchanged by any of this design work.
8. `set` / `range` / `graph` strategies, additional `ScoringPolicy` verticals, and RFC-003
   ontology providers are built only when a real subsystem exists to feed them — never
   speculatively.

---

## 13. Architectural Readiness Statement

**The architecture is ready for implementation of Layers 1 and 2 as specified in this document.**

Justification: every concern raised in this review has either been resolved with a concrete
contract change (scoring separation, 8-state model, structured/language-neutral explanations,
label-free ontology refs, versioning/replay model, 13 formal invariants) or explicitly and
knowingly deferred with a named owner and reason (RFC-003 ontology overlap detection, policy
composability, policy storage mechanism) — nothing is deferred silently. The design was tested
against the specific five-year scenario given (multiple engines, multiple AI providers, multiple
ontologies, hundreds of fields, multilingual extraction, cross-marketplace evaluation) and every
assumption either already held or was fixed in this revision.

**Three items are flagged as explicitly non-blocking**, because they are external dependencies or
follow-up decisions, not defects in this design:

1. **Policy storage/authoring mechanism is undecided** (JSON file, DB table, or admin UI). This
   does not block building Layers 1–2 with an in-code default policy first (step 5 of §12); it
   needs a decision before a second real marketplace policy is authored.
2. **Ontology namespace-overlap detection does not exist** (§5, §8). Not blocking today, since
   exactly one ontology provider (`category`) exists in the entire platform — becomes relevant
   only once RFC-003 introduces a second one, and is explicitly RFC-003's problem to define, not
   this component's to guess at.
3. **Upstream phases (Evidence/Grounding/Decision) do not yet emit a distinct "Contradictory"
   signal.** The Comparator's state model (§2) correctly handles Contradictory values *if
   supplied*, but no current adapter can currently detect a real contradiction — until Evidence/
   Grounding are extended to surface it, Contradictory will simply never appear in practice
   (values will present as Missing or Ambiguous instead, which is safe — not incorrect, just less
   informative). This is a gap in upstream phases the state model exposes, not a flaw the state
   model needs to fix.

None of these three block starting implementation of the Comparator (Layer 1) and Scoring Policy
Engine (Layer 2) as specified — they are scoped, named follow-ups to track, not open architectural
questions about this component itself.

---

## 14. Reason Code Governance

**Status: Governance specification only. No implementation. Requested as a safeguard between
Step 1 (contracts, approved) and Step 2 (CategoryOntologyProvider), because `reasonCode` was
deliberately left open-ended in §3/§8 and an open-ended public-facing vocabulary with no governance
degrades over time. This section does not restrict extensibility — it defines how extension stays
consistent.**

Reason codes are treated as **public API identifiers**, not debug strings: stable, never
localized, never renamed casually, never carrying presentation text. Presentation is the
localization layer's job (`reasonParams` + a template registry, §8); a reason code's only job is to
be a permanent, machine-stable pointer to one specific, documented semantic outcome.

### 14.1 Naming Convention

`NAMESPACE.IDENTIFIER` — both segments `SCREAMING_SNAKE_CASE`, joined by a single dot:

```
^[A-Z][A-Z0-9_]*\.[A-Z][A-Z0-9_]*$
```

- `IDENTIFIER` names the *outcome*, never the field it happened on and never a sentence: e.g.
  `SOURCE_NEVER_CONTAINED_VALUE`, not `LOCATION_MISSING_IN_FREE_TEXT`. Which field it applied to is
  already on `FieldComparisonResult.fieldId`; encoding it again into the code string is exactly
  the fragmentation risk this governance model exists to prevent.
- A code never contains a language-specific word choice, a punctuation mark meant for reading
  aloud, or a version number. If a `fieldId` must appear inside a `FIELD.*` escape-hatch code
  (§14.2), it is upper-snake-cased deterministically (`object.secondary[]` → `OBJECT_SECONDARY`) —
  documented here as the one canonicalization rule, so it never needs a case-by-case judgment call.

### 14.2 Namespace Strategy — recommendation, with an explicit deviation from the suggested scheme

**Recommendation: namespace by *producing mechanism*, not by *field/ontology domain*.** This
deviates from the `CATEGORY.*` / `LOCATION.*` / `INTENT.*` scheme suggested for consideration —
reasoning below, open to being overruled.

| Namespace | Owns | Example codes | Who may add an entry |
|---|---|---|---|
| `STATE.*` | Outcomes of the §2 state-compatibility matrix — domain-agnostic by construction, fires identically for every field regardless of shape. | `STATE.NOT_YET_EVALUATED`, `STATE.SOURCE_NEVER_CONTAINED_VALUE`, `STATE.CONTRADICTORY_EVIDENCE`, `STATE.BOTH_MISSING`, `STATE.ONE_SIDE_MISSING`, `STATE.AMBIGUOUS_MATCH`, `STATE.AMBIGUOUS_MISMATCH` | Whoever changes the state-compatibility matrix itself (a Comparator-core-level change, reviewed like any other core change). |
| `ONTOLOGY.*` | Outcomes derived from an `OntologyRelationship`, reused identically across every ontology namespace. **Derivation rule, not free invention**: `code = 'ONTOLOGY.' + relationshipType.toUpperCase().replace(/-/g,'_')` — adding a new `OntologyRelationshipType` (e.g. RFC-003's `succeeds`) automatically and mechanically defines its reason code; nobody hand-picks a new `ONTOLOGY.*` string. | `ONTOLOGY.IDENTICAL`, `ONTOLOGY.PARENT_OF`, `ONTOLOGY.CHILD_OF`, `ONTOLOGY.SIBLING`, `ONTOLOGY.EQUIVALENT`, `ONTOLOGY.UNRELATED` | Whoever introduces the new `OntologyRelationshipType` value (today: RFC-002/this document; later: RFC-003) — the RFC is the code's owner of record, the derivation rule is mechanical. |
| `SHAPE.*` | Outcomes specific to one `ComparisonStrategy` kind, reused across every field that uses that strategy. | `SHAPE.GEO_EXACT_MATCH`, `SHAPE.GEO_MISMATCH` (today); `SHAPE.RANGE_OVERLAP`, `SHAPE.SET_PARTIAL_OVERLAP`, `SHAPE.GRAPH_DIVERGENT` (only once those strategies are actually implemented — §11 non-goals, not built speculatively) | Whoever implements that `ComparisonStrategy` kind — ships its codes in the same change. |
| `SYSTEM.*` | Operational/meta conditions, not a semantic comparison outcome (e.g. a version-compatibility failure). | `SYSTEM.VERSION_INCOMPATIBLE`, `SYSTEM.SCHEMA_VALIDATION_FAILED` | SEE platform maintainers. |
| `FIELD.<FIELD_ID>.*` | A deliberately rare escape hatch for a genuinely field-specific outcome that fits none of the above. | (none exist today) | Requires explicit architecture sign-off — see §14.7. |

**Why this, instead of the suggested `CATEGORY.*`/`LOCATION.*`/etc.**: every code in `STATE.*` and
most of `ONTOLOGY.*`/`SHAPE.*` already fires identically no matter which field triggered it — the
`category`-vs-`residential-rent` refinement and a hypothetical future `intent`-vs-`intent`
refinement are the *same kind of event* (`ONTOLOGY.PARENT_OF`), just with different `fieldId`s and
`reasonParams`, exactly mirroring why the Comparator's own core loop stays generic across fields
(INV-08). Namespacing codes per domain would mean every new field with an ontology behind it mints
its own `PARENT_CHILD`-equivalent code, so 100 fields would produce on the order of 100×N codes
instead of a fixed, small N — precisely the fragmentation this governance section is meant to
prevent, and precisely the coupling INV-08/INV-09 already forbid at the logic level. Encoding
per-field identity into the *vocabulary* would smuggle the same coupling back in one layer up.
Field identity is not lost — it is already present on `FieldComparisonResult.fieldId` next to the
reason code, so nothing is lost by keeping the code itself domain-agnostic.

**If per-domain namespacing was intended for a different reason** — e.g. giving each future RFC-003
vertical (marketplace ontology team) exclusive write-ownership over its own slice of the
vocabulary, independent of the Comparator core's release cycle — that is a legitimate governance
goal this scheme doesn't fully satisfy on its own. It is captured instead via **ownership
records** (§14.3) rather than namespace prefixes: `ONTOLOGY.*` entries are ontology-owned in
practice (each entry's `owner` field names the RFC/provider that introduced its relationship type)
without needing a separate top-level namespace per domain.

### 14.3 Ownership

Every registry entry names the **architectural artifact** responsible for it — never a person
(people rotate; artifacts persist), consistent with how this project already ties decisions to RFC
ADR numbers rather than individuals:

```ts
interface ReasonCodeDefinition {
  code: string;                      // e.g. 'ONTOLOGY.PARENT_OF' — permanent once published
  namespace: 'STATE' | 'ONTOLOGY' | 'SHAPE' | 'SYSTEM' | 'FIELD';
  owner: string;                     // e.g. 'SEE Comparator Core §2', 'RFC-002 OntologyRelationshipType'
  introducedAtEngineVersion: string; // ties to §6's Comparator Engine Version axis
  definition: string;                // one sentence, precise, English, never localized
  expectedParams: string[];          // documented reasonParams keys this code carries
  deprecated: boolean;
  deprecatedAt?: string;
  deprecatedReason?: string;
  supersededBy?: string[];
}
```

A code registered without `owner`, `definition`, or `expectedParams` is not a valid registry entry
— this is the documentation requirement, enforced structurally rather than by convention.

### 14.4 Backward Compatibility

- **A published code's string value is permanently frozen.** "Published" means merged into the
  registry and referenced by at least one persisted `ComparisonReport`/`FinalEvaluation`.
- **A published code's meaning is equally frozen.** If the logic that used to emit a code needs to
  become more nuanced, the fix is a *new, more specific* code — the old one is deprecated (§14.5),
  never redefined in place. This is the reason-code-vocabulary analog of INV-11 (never
  retroactively alter persisted history): a persisted report's `reasonCode` string is a promise
  about what was true when it was computed, and redefining the string later would silently rewrite
  that promise for every historical report that used it, exactly what INV-11 already forbids one
  layer down.
- Contract-version compatibility ranges (§6) apply here too: an older Comparator Engine Version may
  still legitimately emit an older code after a newer version stops emitting it, as long as the
  registry still defines that code (deprecated, not deleted) — consumers reading historical reports
  are never left holding an undefined string.

### 14.5 Deprecation Process

1. Mark the entry `deprecated: true`, set `deprecatedAt` and `deprecatedReason`, and list
   `supersededBy` (one or more replacement codes, or empty if the outcome no longer applies to
   anything).
2. The code is never emitted by any *new* Comparator Engine Version going forward, but its
   definition remains permanently in the registry — replay (INV-07) of an old `ComparisonReport`
   must always resolve every code it contains to a valid definition, forever.
3. A deprecated code's string is **never reused for a different meaning**, and it is never
   un-deprecated. A returning concept gets a new code.

### 14.6 Machine Stability vs. Human Readability

- **Machine-stable side**: the `code` string — safe as a database key, an alert-rule match target,
  a dashboard group-by dimension, a cross-report join key. Stable forever once published (§14.4).
- **Human-readable side**: never derived from the code at comparison time. A separate, independently
  versioned **template registry** (`code -> { locale -> template string using {paramName}
  placeholders from reasonParams }`) is resolved by the presentation layer at render time. This is
  the direct continuation of §8's multilingual finding — because the sentence is decoupled from the
  code, wording can be corrected or retranslated at any time without touching a single persisted
  report, and a single code can be rendered in Persian, English, or any future locale from the same
  stored data.

### 14.7 Centralized Registry

- **Single source of truth**: one versioned module owns every `ReasonCodeDefinition` — no reason
  code may be declared anywhere else. (Home decided at implementation time, e.g.
  `src/semantic-evaluation-engine/registry/reason-codes.ts` — a plain, statically-defined,
  Zod-validated array; not built this turn, since nothing yet needs to emit a real code until
  Step 4's Comparator core exists to do so.)
- **The Comparator never invents a code inline.** Every place that would produce a `reasonCode` —
  every state-compatibility-matrix branch, every strategy's outcome mapping — references a named
  export from the registry (e.g. `REASON_CODES.SOURCE_NEVER_CONTAINED_VALUE`), never a string
  literal typed by hand at the call site. INV-14 formalizes this as an architectural rule; Step 4's
  implementation should additionally validate at runtime (or via the exhaustive TS type of the
  registry export) that no other string can reach `FieldComparisonResult.reasonCode`.
- **`ONTOLOGY.*` entries are not hand-authored one at a time** — they are generated from
  `KNOWN_ONTOLOGY_RELATIONSHIP_TYPES` (§0/`ontology.ts`) via the §14.2 derivation rule, so the
  ontology-relationship vocabulary and the reason-code vocabulary can never drift out of sync with
  each other.
- **No separate 6th versioning axis is introduced for the registry.** Each entry's own
  `introducedAtEngineVersion` (§14.3) is sufficient — the registry's growth is already tracked
  through the existing Comparator Engine Version axis (§6), so adding one would be a redundant,
  unjustified extra axis.
- Registry growth is not an extra approval gate bolted on top of everything else — adding a
  `STATE.*`/`ONTOLOGY.*`/`SHAPE.*` entry is the *canonical record* of a capability change (a new
  matrix rule, a new relationship type, a new strategy) that already requires review for its own
  sake. The one namespace that IS an extra, deliberate gate is `FIELD.*` (below), precisely because
  it is the one way this vocabulary could still fragment.

### 14.8 Migration Note (not executed this turn — scoped for Step 4)

Step 1's placeholder `KNOWN_REASON_CODES` (`comparison-report.ts`) and `KNOWN_ONTOLOGY_RELATIONSHIP_TYPES`
(`ontology.ts`) predate this governance model and use flat, non-namespaced identifiers (e.g.
`SOURCE_NEVER_CONTAINED_VALUE` instead of `STATE.SOURCE_NEVER_CONTAINED_VALUE`). Per this session's
explicit instruction, no code changes are made in this step. This is recorded here as a concrete,
scoped follow-up: when Step 4 (Comparator core) actually needs to emit codes, the central registry
is built at that point using the `NAMESPACE.IDENTIFIER` convention, and Step 1's placeholder lists
are migrated to reference it rather than kept as a second, competing vocabulary.

### 14.9 Governance Readiness Statement

This governance model resolves every dimension requested (naming convention, ownership, namespace
strategy, backward compatibility, deprecation, documentation requirements, machine stability, human
readability) and adds one new invariant (INV-14). The one open decision is the namespace-strategy
deviation in §14.2 (mechanism-based instead of domain-based) — flagged explicitly for override, not
silently substituted. No implementation has been made; the registry itself is deferred to Step 4,
the first point in the approved order where a real component needs to emit a reason code.

---

## 15. Step 3 Findings — Adapter Boundary (Anti-Corruption Layer)

**Status: implemented and tested** (`src/semantic-evaluation-engine/adapters/`). Two findings from
this step change/extend the architecture; both are additive, neither breaks an existing invariant.

### 15.1 `not-applicable` is a Comparator-level judgment, not an adapter-level one

The original plan (§12 step 3) assigned "not-applicable detection for location-not-in-sourceText"
to the adapters. Implementing it under this round's strict one-way/pure/no-cross-referencing
adapter rules proved that assignment wrong: determining "the OTHER side's raw input structurally
never contained this value" requires knowing what the other side received — a cross-snapshot fact
neither adapter may reach for on its own. Resolution adopted: each adapter self-reports a new,
purely single-object, mechanical fact —
`provenance.rawInputContainsValue: boolean | null` (does *this side's own* raw input contain the
literal value it resolved) — computed with zero reference to the other source. The legacy adapter
computes it for `location` (`sourceText.includes(city)`, both fields of the same `NeedDraft`); the
cognitive adapter leaves it `null` (no meaningful single-object check available on that side). The
actual `not-applicable`/`not-comparable` classification is deferred to Step 4's Comparator, which
legitimately sees both sides and can read this flag from whichever side resolved a value the other
side is missing. Contract change: `SemanticFieldValue.provenance` gained this one required,
nullable field (`semantic-snapshot.ts`) — additive, all Step 1 fixtures updated and still passing.

### 15.2 Adapters must not defensively clamp/normalize confidence

Corrected a line in Step 1's own schema comment, which had said adapters "bear full responsibility
for normalizing whatever scale their source system uses." Under this round's "never repair data"
rule, that instruction was backwards: silently rescaling an out-of-range value **is** a repair, and
is structurally how the original confidence-scale bug (a 0–100 score silently absorbed by
`clamp01` into a false-maximum 1.0) went undetected in the first place. Both adapters now pass
confidence through exactly as their source reports it; an out-of-range value must fail Zod
validation loudly at the schema boundary, never be quietly corrected by the adapter. No contract
type changed — this is a documentation/behavioral correction, not a schema change.

### 15.3 Disclosed, not fixed: per-candidate confidence has no home in `SemanticValue`

Both adapters discard per-candidate confidence (`categoryCandidates[].confidence`,
`cityCandidates[].score`, `DecidedCandidate.scoreBreakdown`) when building an `ambiguous` field's
`candidates: SemanticValue[]` — the value-shape contract has no per-item confidence slot, only a
single field-level `confidence`. Not fixed in Step 3 (out of scope — a value-shape change is a
Step 1-level decision deserving its own review, not a quiet addition during adapter work).
Recommended for a future contract revision if per-candidate confidence ever becomes load-bearing
for a real consumer.

---

## 16. Evaluation Immutability & Replay Contract

**Status: clarification of §6, no contract type changes required — verified against Steps 1-3's
already-implemented types before concluding this. Written before Step 4 per explicit instruction;
no architectural issue found, so Step 4 begins immediately after this section.**

### 16.1 Three distinct operations — never conflated

| Operation | What runs | What it produces | What happens to the result |
|---|---|---|---|
| **Read** | Nothing — a stored `ComparisonReport`/`FinalEvaluation` is returned verbatim. | The exact bytes written at evaluation time. | Returned to the caller. Zero computation. |
| **Replay Verification** | The Comparator/Policy Engine re-run using the *original, pinned* versions named in the stored `versionStamp`. | A fresh `ComparisonReport`/`FinalEvaluation`, structurally identical to the stored one if determinism holds (INV-01). | **Discarded after comparison**, or logged to a separate audit channel — never written to the primary event store as if it were a new entry (§16.5). Exists only to answer "does this still reproduce?" |
| **Re-evaluation** | The Comparator/Policy Engine run using *current* versions against the *same* original snapshots. | A brand-new `ComparisonReport`/`FinalEvaluation`, its own `reportId`/`evaluationId`, its own (current) `versionStamp`. | **Persisted as an additional, independent record** — never overwrites or supersedes the old one in place. Both coexist, each correctly tagged with which versions answered it. |

This is the precise, formal answer to "should replay produce the old answer or the new answer?"
(the Ontology Evolution question, §16.4): **Replay Verification always reproduces the OLD answer.**
Producing a "new" answer is not replay under any name — it is Re-evaluation, a distinct, explicit
action that always creates a new record rather than touching an old one.

### 16.2 Historical Record vs. Derived View — classified per field, never mixed

**`ComparisonReport`** (Layer 1):

| Field | Classification | Why |
|---|---|---|
| `reportId`, `comparedAt`, `snapshotAId`, `snapshotBId`, `versionStamp` | **Historical Record** | Identifies what was compared and with which pinned dependencies — irreducible facts. |
| `fieldResults[]` (`status`, `relationship`, `reasonCode`, `reasonParams`) | **Historical Record** | `relationship` required a live call to `OntologyProvider.relate()` at evaluation time (§16.3) — a genuine external dependency resolution, not free to recompute without the exact pinned provider version. Frozen the instant it's produced. |
| `counts` | **Derived View, cached for convenience** | A pure, zero-information-added tally *of* `fieldResults`. Storing it avoids recomputing a sum on every read of a report with many fields, but it carries no fact `fieldResults` doesn't already contain. If they ever disagree, `fieldResults` is authoritative — that would indicate a serialization bug, never a "which is right" ambiguity. |

**`FinalEvaluation`** (Layer 2):

| Field | Classification | Why |
|---|---|---|
| `evaluationId`, `comparisonReportId`, `versionStamp` (incl. `scoringPolicyId`/`scoringPolicyVersion`) | **Historical Record** | Identifies which immutable `ComparisonReport` and which immutable, published `ScoringPolicy` (§16.2.1) produced this evaluation. |
| `perField[]`, `overallScore`, `verdict` | **Derived View, cached for convenience** | Pure arithmetic over two already-immutable inputs (`ComparisonReport.fieldResults` + the pinned `ScoringPolicy`'s weights/thresholds) — no live external dependency at this layer, unlike Layer 1's ontology calls. Mechanically re-derivable with total confidence from data already on record, stored only to avoid recomputing on every read. |

**16.2.1 — Published `ScoringPolicy` documents are themselves immutable**, exactly like reason
codes (§14.4): once a `policyId`/`policyVersion` pair has been used by any `FinalEvaluation`, its
weights and thresholds are frozen forever. A weight change is always a new `policyVersion`, never
an edit in place. (This was implied by §6's policy-versioning axis but not stated this explicitly
until now — no contract change, a clarification.)

**These two classifications must never be mixed in the same field.** A field is either
irreducible fact requiring a pinned external dependency to reproduce (Historical Record) or a pure,
dependency-free function of already-frozen data (Derived View, cached) — never a blend of the two,
and a Derived View field is never treated as more authoritative than the Historical Record it was
derived from.

A genuinely aggregate **Derived View** — e.g. a future drift dashboard's "% refinement this month" —
is a separate, distinct artifact type, computed on demand from many immutable `ComparisonReport`s
plus the *current* human-readable template registry (§14.6). It is never written back into, or
confused with, any individual stored `ComparisonReport`.

### 16.3 Reason Lifecycle

| Value | Recomputed on replay, or preserved exactly? | Why |
|---|---|---|
| `reasonCode` | **Preserved exactly**, forever, in the stored record. Freshly recomputed only during an explicit Replay Verification run (§16.1), and only to be diffed against the stored value, never to replace it. | It names a permanently-defined registry entry (§14) — even if deprecated later, its meaning at read time is exactly what it was at write time (§14.4). |
| `reasonParams` | Same as `reasonCode`. | Structured facts about *why* — computed once, alongside the code, from the same evaluation run. |
| `relationship.type` | Same. | Comes from `OntologyProvider.relate()` at evaluation time — see §16.3.1. |
| `relationship.distance` | Same. | Same reasoning — a live ontology call's numeric output, frozen. |
| State-compatibility outcome (which row of §2's matrix fired) | Same — it's exactly what produced `status`/`reasonCode` in the first place, not a separate value. | The matrix is a pure function of the two sides' `SemanticValueState`s, which are themselves part of the immutable input snapshots (§6) — its outcome is as frozen as the snapshots it read. |

**16.3.1 — why `relationship` is the one place ontology data enters an evaluation, and it only
enters once**: `OntologyProvider.relate()` is called exactly one time per field per evaluation, at
evaluation time, using whatever `OntologyProvider` version is live then. Its return value is
copied into `FieldComparisonResult.relationship` and never queried again for that report. Reading
an old report later never touches any `OntologyProvider`, current or historical — the relationship
is already sitting in the stored data.

### 16.4 Ontology Evolution Replay Contract

```
Ontology v3 → Evaluation → [ComparisonReport, frozen, tagged ontologyVersions.category = 'v3']
                                    │
                    (Ontology evolves to v8 — the stored report above is untouched)
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                             ▼
      "Replay" the v3 report                       "Re-evaluate" with v8
      → re-run using PINNED v3 provider            → run using CURRENT v8 provider
      → MUST reproduce the v3 answer               → produces a NEW report, tagged
        (if it doesn't, that's a determinism          ontologyVersions.category = 'v8'
         bug — INV-01 — not a reason to accept        both reports now coexist,
         the new number)                              independently, forever
```

**Explicit answer to the question as posed: replay produces the OLD (v3) answer, unconditionally.**
"Should it produce the new answer" is not a replay question at all — it is a decision about
whether to *re-evaluate*, which is always a separate, explicit, opt-in action that adds a new
record rather than reinterpreting an old one. A future Phase 8 go/no-go review, for instance,
would explicitly *re-evaluate* a historical sample against a newer engine/ontology to ask "how
would today's Cognitive Engine score against this same ground truth" — a legitimate, common
operation — but it must never be silently confused with "what did the original evaluation say."

### 16.5 Operational Implication (disclosed, bounded, non-critical)

Replay Verification (§16.1) requires the *original pinned* Comparator engine build and Ontology
Provider implementation to still be executable. This is a real, ongoing cost — old code/data must
be kept runnable indefinitely for this ONE capability. It is explicitly **not** required for
ordinary reads: a historical `ComparisonReport` is plain, self-contained data (§16.2) and remains
fully readable and meaningful even if the code that produced it could no longer run today. If a
sufficiently old version ever does become impractical to keep executable, the disclosed,
acceptable consequence is: Replay Verification for that vintage becomes unavailable (an audit
capability is lost), while every historical record it ever produced remains completely intact and
readable, forever. Durability of the historical record never depends on eternal code executability
— only the optional, secondary audit capability does.

### 16.6 New Invariants

| ID | Invariant |
|---|---|
| INV-15 | A stored `ComparisonReport`/`FinalEvaluation` SHALL NOT be recomputed to serve an ordinary read. Reading is data retrieval, never re-execution. |
| INV-16 | A Re-evaluation SHALL always create a new `reportId`/`evaluationId` with its own current `versionStamp`. It SHALL NEVER overwrite, supersede in place, or delete a prior record for the same snapshot pair. |
| INV-17 | A Replay Verification's freshly recomputed result SHALL NOT be written to the primary event store as a new historical entry. It exists only to be diffed against the original and is then discarded or logged to a separate audit channel. |

### 16.6a `EvaluationEvidence` — evaluated, not introduced

Before Step 5, evaluated whether a new internal concept named `EvaluationEvidence` would add
architectural value, against the five criteria requested:

- **Explainability**: already fully satisfied. `FieldComparisonResult` already carries both
  sides' complete `SemanticFieldValue` (state, value, confidence, provenance) alongside the
  decision (`status`, `relationship`, `reasonCode`, `reasonParams`) — a new evidence object would
  either duplicate this or become the same object under a different name.
- **Replay**: already fully satisfied by §16's `versionStamp` + immutable snapshots. Replay needs
  no additional evidence artifact — the snapshots themselves ARE the evidence, and they're already
  first-class, already immutable.
- **Debugging**: marginal convenience only — bundling `{snapshotA, snapshotB, report}` together
  for a single debugging session is a useful ephemeral utility, but not a new fact; nothing is
  learned that isn't already in the three existing objects. Not worth a persisted type.
- **A/B testing**: needs a genuinely different concept — an experiment/cohort tag grouping
  multiple `FinalEvaluation`s under a variant label. That is not "evidence for a decision," it's
  "metadata about why a trial ran." Calling it `EvaluationEvidence` would misname it and invite
  scope creep into this type later.
- **Future model benchmarking**: needs a different concept again — a benchmark dataset/suite
  correlating many reports against ground truth across engine versions. Also not "evidence."

**Decision: `EvaluationEvidence` is not introduced**, internally or publicly. Two of the five
criteria are already fully met by existing contracts (`FieldComparisonResult`, `ComparisonReport`,
`versionStamp`, immutable `SemanticSnapshot`s); the other two name real, legitimate future needs
that require their own distinctly-named, distinctly-shaped concepts (`ExperimentContext`/cohort
tagging; a benchmark-run type) rather than a mis-fitted reuse of "evidence." Introducing a
redundant wrapper now would repeat exactly the "build a subsystem nothing yet needs" mistake this
project has consistently avoided at every prior step. If A/B testing or benchmarking becomes a
real, scheduled need, the correct action is to design the specific concept it actually requires at
that time, not to retrofit this one.

### 16.7 Review Outcome

No architectural issue was found requiring a change to any type defined in Steps 1-3 —
`ComparisonReport`'s `reportId`/`snapshotAId`/`snapshotBId`/`versionStamp` shape already supports
multiple independent reports over the same snapshot pair (re-evaluation) and needs no "kind" tag
to distinguish replay-verification runs, since those are never persisted into the primary record
stream at all (§16.1, INV-17). This section is a clarification and three new invariants, not a
redesign. Per instruction, Step 4 begins immediately below.
