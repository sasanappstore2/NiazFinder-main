# RFC-004 — Cognitive Improvement Framework (CIF)

**Version:** 1.0
**Status:** Draft
**Depends on:** RFC-000 (NiazFinder Cognitive Engine), RFC-002 (Universal Need Representation Model)
**Companion architecture documents (normative inputs, not dependencies):**
`PLAN/semantic-comparator-architecture.md` (SEE), `PLAN/ccqs-architecture.md` (CCQS),
`PLAN/production-validation-window-architecture.md` (PVW), `PLAN/replay-determinism-audit.md`
**Numbering note:** RFC-003 is reserved for the Marketplace Ontology / Cognitive APIs series named
in the Phase-1 implementation plan and remains unwritten; this document deliberately takes the
next free number rather than filling the gap out of order. ADRs in this document continue RFC-002's
sequence (RFC-002 ends at ADR-056; this document begins at ADR-057). CIF invariants use their own
`CIF-INV-NN` series to avoid any collision with SEE's `INV-01..INV-17` series.

---

## Part 1 — Foundations

### §1. Purpose

RFC-002's Final Decision states: *"Future RFCs SHALL extend this specification. They SHALL NOT
contradict it."* This RFC extends UNRM in the one dimension every prior document leaves implicit:
**how the Cognitive Engine is allowed to change.**

RFC-000 defines what the engine is for. RFC-001/002 define what it computes. SEE defines how two
of its answers are compared. CCQS defines how its quality is measured and gated. PVW defines how
its production behavior will be watched. **None of them defines the lifecycle of an improvement
itself** — how a quality issue is detected, classified, investigated, fixed, validated, measured,
documented, and promoted, and what is forbidden at each step. Until now that lifecycle existed only
as practice: the Priority 1–3 investigations, the Production Readiness pass, and the two baseline
reports all followed the same unwritten discipline. This RFC writes it down and makes it law, so
that the discipline survives context loss, personnel change, tooling change, and time.

CIF is a **process architecture**. It ships no runtime component, no service, no schema that the
`/post` request path touches. Its artifacts are documents, version stamps, replay runs, and
decisions. Its enforcement points are review-time and promotion-time, never request-time.

Its founding decision, from which every other rule in this document derives:

- **ADR-057** — Every change to the Cognitive Engine's observable decision behavior SHALL pass
  through the CIF lifecycle. There is no second path: no quick fix, no drive-by tuning, no
  "trivial" exception. A change too small to justify the lifecycle is a change too small to
  justify its own risk — and the lifecycle scales down gracefully (a one-line fix with an obvious
  trace climbs the same ladder quickly; it does not skip rungs).

### §2. Position in the architecture

```
                 ┌────────────────────────────────────────────────────┐
                 │  CIF (this RFC) — governs how everything below      │
                 │  is allowed to CHANGE. Executes nothing at runtime. │
                 └────────────┬───────────────────────────────────────┘
                              │ constrains change to
      ┌───────────────┬───────┴────────┬───────────────┬──────────────┐
      ▼               ▼                ▼               ▼              ▼
 Cognitive Engine    SEE             CCQS         Release Gate       PVW
 (what a need       (how answers    (is quality   (is a release     (is production
  means)             differ & why)   improving)    safe)             healthy)
```

CIF sits above the platforms, not beside them. It is to *change* what SEE is to *comparison*:
a single, generic, versioned discipline that every specific instance flows through. And exactly as
CCQS never reimplements SEE's comparison logic (CCQS §0), CIF never reimplements any platform's
mechanism — it only prescribes **when each mechanism must be invoked, what its output must show,
and what may happen next.**

### §3. Relationship to prior documents

| Document | What CIF takes from it | What CIF adds on top |
|---|---|---|
| RFC-000 | Core Principles 3 (rules decide), 4 (never guess), 9 (stateless AI), 10 (replaceable models) as constitutional constraints on any fix | Nothing changed; CIF fixes must preserve all ten principles |
| RFC-002 Part 6 (Learning Signals) | §47's pipeline ends at "Offline Learning"; §48 states signals SHALL NOT directly change rules, policies, ontology, or thresholds — "those changes require controlled deployment" (ADR-025) | **CIF is the definition of that controlled deployment.** Part 6 defines how improvement *evidence* accumulates; CIF defines how an improvement *lands* |
| RFC-002 ADR-023/025/026 | Learning is offline, versioned, reviewed; runtime self-modification prohibited | The concrete lifecycle, states, and gates a reviewed change passes through |
| RFC-002 §50 | "Every future optimization must be traceable and evidence-based" | The exact evidence required at each lifecycle transition (§13) |
| SEE §14.4/14.5, §16.1/16.2, INV-11/16/17 | Freeze/deprecate/append-only/replay disciplines as the storage model for CIF's own records | Applies the same disciplines to issue records, reports, and promotion decisions |
| CCQS §1.1/§1.6/§5/§6 | Golden-dataset governance, gate policy immutability, run-diff classification, pass/warn/fail semantics | Rules for *when* datasets/policies may change and what a verdict obligates (§28, §34) |
| PVW §2.1/§5/§7 | Two-pillar detection model, alert architecture, the flagged-amendment convention | Alerts and pillar signals as formal Detection sources (§8); the flag-and-approve protocol as law (§33) |
| Replay Determinism Audit §3/§6 | Run-integrity findings (silent skips, unchecked `datasetRef`, the insulation property) | Turns each finding into a promotion-blocking invariant (§26, §27) |
| Baseline Report V1 / Production Readiness V2 | The practiced workflow, the 7-element deliverable, the report-series convention, four real precedents | Formalization; the precedents become the normative worked examples of Part 10 |

### §4. Scope and non-goals

**In scope:** every change that can alter the Cognitive Engine's observable decision behavior —
rules registry, packs, grounding logic, decision logic, prompts, evidence extraction parameters,
ontology data (`categories.ts`), location catalog data, and the measurement/governance surfaces
around them (golden dataset, gate policies, SEE/CCQS/PVW code) insofar as CIF regulates *who may
change them and how*, per §32.

**Non-goals:** CIF does not define metrics (CCQS does), comparison semantics (SEE does), alert
policies (PVW does), or any UI. CIF does not start Phase 8; the authoritative-cutover decision
remains gated by PVW §7's readiness review and is untouched here. CIF does not prescribe team
structure — §36 is explicit that roles are hats, not headcount.

### §5. Terminology

- **Quality Issue** — the unit of CIF work: one observed or suspected defect, gap, or degradation
  in Cognitive Engine quality, with its own identity, classification, lifecycle state, and record.
- **Promotion** — the act of making an improvement part of the engine of record: merged change +
  version-axis bump(s) + before/after replay runs + report-series entry. Today the engine of
  record runs in shadow mode; promotion semantics are identical after any future cutover, which is
  precisely why they are defined here and not deferred.
- **Lateral move** — a case/field outcome change between two non-good statuses (statuses outside
  CCQS's `GOOD_STATUSES`), with zero net effect on any accuracy metric. Precedent: inv-23.
- **Ruler / measured object** — the measurement apparatus (golden dataset, gate policy, SEE/CCQS
  metric definitions) versus the thing measured (the Cognitive Engine). CIF's central governance
  axiom is that the two never move in one promotion (§34, ADR-063).
- **Case A / Case B** — the two legitimate ends of an autonomous improvement cycle, from the
  Production Readiness mandate: (A) the gate passes legitimately; (B) a fundamental limitation
  requiring an architectural decision is discovered and escalated. §16 formalizes B.

---

## Part 2 — The Quality Issue

### §6. Definition

A Quality Issue is a first-class record, not a conversation. It exists from the moment a signal is
worth investigating, and it never disappears — it terminates in a disposition (§12) and remains
citable forever. An issue is **one defect at one root cause**: if investigation reveals two root
causes behind one symptom, the issue splits (each successor references its parent); if two issues
converge on one root cause, one supersedes the other (§12, Superseded).

Grouping discipline is inherited from Baseline Report V1 §3 verbatim: issues are grouped **by root
cause, never by symptom.** Five symptoms sharing a cause are one issue with five manifestations;
one symptom with two causes is two issues.

### §7. Identity and record format

- **Identity:** `CIF-YYYY-NNN` (year + sequence), assigned at Detection, never reused, never
  renumbered — the same stability rule as CCQS golden `caseId`s and SEE reason codes.
- **Record:** a git-tracked markdown file per issue (or per investigation batch, with per-issue
  sections) under `PLAN/`, following the report-series convention already in force: append-only,
  versioned by succession, never overwritten. A database table for issues is explicitly **not**
  required by this RFC: the golden dataset chose git over rows for the same reasons (reviewable in
  a PR diff, attributable, immune to silent runtime mutation — CCQS §1.1), and issue records have
  the same trust requirements with far lower volume. If automation ever needs queryable issue
  state, a Derived-View table may cache what the markdown says — the markdown remains the record
  (SEE §16.2 discipline applied to process artifacts).
- **Mandatory fields at creation:** detection source (§8), observed behavior, expected behavior,
  and the reproduction input(s) — for engine issues, the exact raw text(s). An issue that cannot
  state what was observed and what was expected is not an issue; it is a hunch, and hunches are
  recorded as Observations (§10) or not at all.

### §8. Detection sources

Every issue names exactly one primary detection source:

| Source | Description | Exists today? |
|---|---|---|
| `golden-replay` | A CCQS ReplayRun outcome: gate failure, warn-margin entry, regressed case in a `VersionComparisonReport`, new zero-candidate case | Yes |
| `production-shadow` | PVW Pillar B aggregation or a `CognitiveEngineShadowComparison` drift pattern | Events flow today; aggregation is designed (PVW), not built |
| `alert` | A fired `CcqsAlertEvent` under a versioned alert policy | Designed (PVW §5), not built |
| `audit` | A deliberate investigation (the determinism audit; the intake logic audit) | Yes — precedent-rich |
| `manual` | Human observation: user report, developer notice, review finding | Yes |
| `dataset-review` | A defect found in the ruler itself: wrong ground truth, composition gap, ambiguous case definition | Yes — Baseline V1 Recommendation #5/#6 are open dataset-review issues |

The detection source determines nothing about severity or priority by itself — a `manual` report
can outrank an `alert`. It exists for a different reason: PVW's pillars have different
evidentiary power (Pillar A carries ground truth; Pillar B carries only legacy-agreement, PVW
§2.1), and an issue's later validation plan (§23) must match what its detection source can and
cannot prove.

### §9. Classification: two orthogonal axes

The improvement mandate listed root-cause areas as a flat list (ontology / rules / evidence
extraction / ranking / ambiguity resolution / confidence calibration / prompt design / grounding /
location reasoning / category reasoning). Practice showed that list mixes two different questions,
so CIF classifies on two orthogonal axes:

**Axis 1 — Component domain: where does the defect live?** (exactly one)

| Component | Meaning | Precedent |
|---|---|---|
| `rules` | Rules registry, legacy bridge, packs, keyword/negative-rule coverage | V2 Issues 1–3 (خونه/خانه guard, کوتاه‌مدت, فروش) |
| `grounding` | Candidate retrieval/filtering at the grounding layer (ADR-016 side: retrieval) | V2 Issue 4 (depth-0 menu-category exclusion) |
| `decision` | Scoring, clear-winner gap, ambiguity thresholds (ADR-016 side: deciding) | inv-12's would-be fix location — and why it was refused there |
| `evidence-extraction` | LLM prompt, sampling parameters, adapter parsing | Determinism audit §4 findings |
| `ontology-data` | The category tree itself: missing leaf, wrong parent, depth misassignment | Priority 3's موتور سیکلت gap |
| `knowledge-catalog` | Location catalog contents (cities/neighborhoods/aliases) — data, not code | The unversioned-catalog finding (audit §2) |
| `confidence-calibration` | Confidence computation/normalization | Priority 1's scale bug |
| `measurement` | SEE/CCQS metric fidelity: the ruler misreads | Root Cause E (`refinement` direction-blindness) |
| `dataset` | Golden dataset composition or ground-truth correctness | 9-of-33 location-bearing cases (V1 §2) |
| `determinism-infrastructure` | Replay/versioning/ordering integrity | All three audit gaps (readdirSync, orderBy, catalog version) |

**Axis 2 — Capability domain: which user-visible capability degrades?** (one or more)
`category` | `location` | `intent` | `constraints` | `readiness` | `cross-cutting`.

The axes are deliberately independent: Root Cause E is `measurement` × `category`; the readdirSync
finding is `determinism-infrastructure` × `cross-cutting`. The two classes practice proved easiest
to misfile — `measurement` and `dataset` — are the two with a hard routing consequence: **a
`measurement` or `dataset` issue is never fixed by changing the engine** (ADR-062), and its fix
travels a different governance path (§32).

### §10. Severity

| Severity | Definition | Obligation |
|---|---|---|
| `gate-blocking` | A gate threshold is failing, and this issue contributes to it | Must be worked before any non-blocking issue; the improvement cycle continues until no gate-blocking issue remains (Case A) or a Case B is declared |
| `regression` | A previously-good outcome degraded (a `regressed` classification against the prior baseline that is not lateral) | Must be either fixed or explicitly accepted with rationale before the change that caused it is promoted |
| `lateral` | Zero-net-metric status shift between non-good statuses | No fix obligation; **disclosure obligation** (ADR-069). Precedent: inv-23 |
| `active` | Wrong or degraded behavior reproducible today, but no gate threshold failing | Prioritized by expected quality gain (Baseline V1 §10's Impact/Risk/Cost/Gain ranking) |
| `latent` | Correct behavior today that depends on an unguaranteed coincidence | Recorded and monitored; fix is discretionary until an activation path is shown. Precedent: the readdirSync ordering — harmless until an exact score tie spans pack files |
| `observation` | A pattern worth remembering that is not yet a defect | No obligation beyond the record itself |

Severity is re-evaluated at every state transition; it is a property of current evidence, not of
first impressions.

---

## Part 3 — Lifecycle

### §11. States

```
                              ┌──────────────┐
              signal ───────▶ │   DETECTED    │──────────────┐
                              └──────┬───────┘              │ (false positive,
                                     ▼                       │  cannot reproduce,
                              ┌──────────────┐              │  not a defect)
                              │  REPRODUCED   │──────────────┤
                              └──────┬───────┘              │
                                     ▼                       ▼
                              ┌──────────────┐        ┌────────────┐
                              │    TRACED     │        │  REJECTED   │ (terminal)
                              └──────┬───────┘        └────────────┘
                                     ▼
                              ┌──────────────┐   two+ causes → split
                              │ ROOT-CAUSED   │──────────────────────▶ child issues
                              └──────┬───────┘   duplicate cause → SUPERSEDED (terminal)
                                     ▼
                              ┌──────────────┐   fix requires frozen-surface change,
                              │  CLASSIFIED   │   threshold change, or architectural
                              └──────┬───────┘   decision beyond the engine
                                     ▼                       │
                              ┌──────────────┐              ▼
                              │ FIX-DESIGNED  │        ┌────────────┐
                              └──────┬───────┘        │  ESCALATED  │ (Case B, §16)
                                     ▼                 └────────────┘
                     no safe general fix exists              │ resolves to a decision,
                              │                              ▼ then re-enters as a new
                              ▼                        (unfreeze / policy change /     
                        ┌────────────┐                  architectural work)            
                        │  DEFERRED   │ (dormant, §15)                                  
                        └────────────┘                                                  
                                     ▼
                              ┌──────────────┐
                              │  VALIDATED    │  (validation ladder, §23)
                              └──────┬───────┘
                                     ▼
                              ┌──────────────┐
                              │   MEASURED    │  (replay + comparison + gate)
                              └──────┬───────┘
                                     ▼
                              ┌──────────────┐
                              │   PROMOTED    │ (terminal; §29)
                              └──────────────┘
```

Terminal dispositions: **Promoted, Rejected, Superseded**. Dormant: **Deferred** (re-enters at the
state it left when its trigger fires). Routed: **Escalated** (leaves the engine track; returns as
a new issue or a governance decision). Regression of a promoted fix is a **new issue** referencing
the old one — never a reopening; history is append-only (CIF-INV-01).

### §12. Transition evidence requirements

Every transition appends an entry to the issue record naming its evidence. No transition may cite
"obvious" or "known" as evidence.

| Transition | Required evidence |
|---|---|
| → Reproduced | The exact input(s) and the observed output, from a real execution (trace script output, replay record ID, or shadow event ID) — never from memory of past behavior |
| → Traced | The full path through the pipeline for the reproducing input: which rules fired/were suppressed, which candidates existed at each stage with scores, which threshold produced the final outcome. Precedent standard: the خونه/خانه investigation traced all 8 slug×spelling cells before concluding the guard covered 1 |
| → Root-Caused | A causal statement that predicts: "because X, inputs with property P will show behavior B" — testable beyond the original reproducing case. If the trace shows the engine behaved correctly and the expectation was wrong → Rejected (or reclassified `dataset` if the ground truth is wrong) |
| → Classified | Both axes assigned (§9); severity assigned (§10); routing consequence checked (`measurement`/`dataset` → §32's separate path) |
| → Fix-Designed | The smallest general solution (§22) written down **with its predicted blast radius**: which cases should change, which must not. The prediction is the regression contract the validation phase checks |
| → Validated | The validation ladder (§23) climbed to the rung the change class requires, results recorded |
| → Measured | Before/after ReplayRun IDs, `VersionComparisonReport`, gate verdicts on both sides |
| → Promoted | §29's checklist complete |
| → Deferred | §15's requirements: rationale + named trigger |
| → Escalated | §16's requirements: the limitation statement + why it exceeds engine scope |
| → Rejected / Superseded | The disconfirming evidence, or the surviving issue's ID |

### §13. CIF invariants (record discipline)

- **CIF-INV-01** — Issue records are append-only. State transitions append; nothing is edited or
  deleted. A wrong entry is corrected by a later entry that says so.
- **CIF-INV-02** — Every issue reaching Root-Caused names its evidence trail well enough that a
  stranger can re-run it: inputs, commands, run IDs. (The reproduction standard that made this
  session's investigations transferable across context loss.)
- **CIF-INV-03** — No issue is closed by silence. Every issue reaches a terminal disposition or
  Deferred-with-trigger; an issue nobody is working on and nobody deferred is a process defect.
- **CIF-INV-04** — Issue IDs, once assigned, are never reused or renumbered (the `caseId` /
  reason-code stability rule applied to process records).
- **CIF-INV-05** — Every investigation produces a permanent artifact even when the outcome is "no
  change": a Rejected issue's record is as permanent as a Promoted one's (ADR-065). The
  determinism audit — which changed zero lines of code — is the canonical precedent.

### §14. Priority

Within a working cycle: `gate-blocking` strictly first, then `regression`, then `active` ranked by
Baseline V1 §10's four-column discipline (Impact / Risk / Cost / Expected Quality Gain), then
`latent`/`observation` as capacity allows. The ranking itself is recorded — a priority decision is
an engineering decision and gets the same traceability as any other.

### §15. Deferral

Deferral is a first-class, honest outcome — not failure and not forgetting. Requirements
(formalizing the inv-12 precedent):

1. **Rationale** naming the specific engineering rule or constraint that blocks a safe fix (for
   inv-12: no fix without either a global threshold change forbidden by never-optimize-for-metrics,
   or registry deduplication work that is architectural in scope).
2. **A named re-evaluation trigger** (ADR-068) — an event, not a date: "when legacy/pack registry
   deduplication is undertaken," "when PVW Pillar B shows this pattern at production volume,"
   "when the gate next fails on this metric." A deferred issue with no trigger is a Rejected issue
   wearing the wrong label.
3. **Disclosure in the next report-series entry** — deferrals appear in the same document that
   reports the promotions they were deferred from (V2 §4 is the template).

### §16. Escalation — the Case B protocol

An issue escalates when its correct fix exceeds the Cognitive Engine's change authority: it
requires modifying a frozen surface (SEE, CCQS architecture, gate thresholds, golden dataset
ground truth), an architectural decision (registry deduplication, a new subsystem), or a tradeoff
only the owner can make. Escalation is the *success* mode of the constraint system — it is what
"stop immediately if the problem cannot be solved inside the Cognitive Engine" looks like as a
process.

An escalation record states: (a) the limitation, precisely; (b) why every in-scope fix was
rejected (with the rejected designs); (c) the smallest out-of-scope change that would unblock it;
(d) what remains possible if the answer is no. Precedents: the inv-23 analysis (SEE `valuesMatch`
exact-equality limitation — disclosed, explicitly judged *not* to rise to Case B because the gate
did not depend on it) and the PVW's three flagged amendments (each a §33 escalation in miniature).
Note the calibration in the first precedent: **naming a frozen-surface limitation is not by itself
an escalation** — escalation is warranted only when the improvement objective cannot be met
without crossing the boundary.

---

## Part 4 — Investigation Protocol

### §17. The eight steps

For every issue worked, in order, no steps skipped (this is the Production Readiness mandate,
promoted verbatim from instruction to law):

1. **Reproduce it** — real execution, exact inputs.
2. **Trace the entire reasoning pipeline** — not the first plausible stage; all of it. Precedent:
   V2 Issue 4's root cause (depth-0 phantom competitors) was invisible until tracing continued
   *past* an apparently-sufficient rules-level explanation.
3. **Identify the true root cause** — the causal, predictive statement of §12.
4. **Classify** — both axes, severity, routing.
5. **Design the smallest possible general solution** — §22.
6. **Validate** — §23's ladder.
7. **Measure the impact** — replay, comparison, gate, §24's deliverable.
8. **Move to the next failure** — priority order, §14.

### §18. Reproduction and tracing standards

- Reproduction uses the cheapest deterministic path that exercises the real code: direct calls to
  the real exported functions (`matchCategoryCandidatesFromRules`, `groundEvidence`,
  `decideCandidates`) with the real registry loaded — never reimplementations of their logic. The
  v1/v2 lesson of the depth-0 verification script is normative: a trace harness that bypasses the
  code under investigation produces confident, wrong conclusions; when a fix lives inside a
  non-exported path, the trace must call the nearest real exported wrapper.
- Trace scripts are session-scratchpad artifacts, not repository code — but their **outputs** (the
  decisive numbers: scores, gaps, rule IDs) are copied into the issue record, because the record
  must outlive the scratchpad (CIF-INV-02).
- When the Replay Platform gains targeted/partial replay (PVW §6 verdicts: those capabilities
  belong in the Replay Platform), targeted replay becomes the preferred reproduction vehicle and
  ad-hoc trace scripts become the fallback, not the default.
- Full-dataset replay is a *measurement* tool, not an *investigation* tool. The ~15–35s/case cost
  (V1 §1) makes replay-per-hypothesis economically wrong; hypotheses are tested with direct
  traces, and replay runs once per validated fix batch.

### §19. Fix admissibility — the five rules as ADRs

A designed fix is admissible only if it violates none of:

- **ADR-058** — Never optimize for metrics alone. A fix's justification must be a reasoning
  improvement ("this input class was misinterpreted because X") — never a metric movement ("this
  gets categoryAccuracy over the line"). Metric movement is the *consequence* checked at §24,
  never the *design input*.
- **ADR-059** — Never optimize for the Golden Dataset only. A fix keyed to the specific texts,
  spellings, or case list of the dataset is overfitting the ruler. Test: state the fix's scope as
  an input-class property ("bare خونه/خانه with no second real-estate signal"), not a case list.
- **ADR-060** — Never hardcode special cases. The fix must be the general rule that the failing
  case instantiates. The خونه/خانه precedent is exact: the admissible fix covered all 8
  slug×spelling cells of the collision class; a fix for only the observed cell would have been
  rejected under this ADR.
- **ADR-061** — Never reduce ambiguity by guessing. If the input genuinely underdetermines the
  answer, ambiguity is the *correct* output (RFC-000 Principle 4; RFC-001 Design Rule 5). Fixes
  that suppress ambiguity without adding discriminating signal are inadmissible — this is why
  inv-12 was deferred rather than "fixed" by widening `CLEAR_WINNER_GAP`.
- **ADR-062** — Measurement-layer and dataset defects are fixed in the measurement layer or
  dataset, never compensated in the engine. Engine changes that make a misreading ruler read
  better are double corruption: wrong engine *and* wrong ruler. Root Cause E is the standing
  precedent: the direction-blind `refinement` metric is a CCQS fidelity issue, routed to CCQS
  governance — not something the engine should contort to satisfy.

### §20. Scope: the narrowest input class

Given competing admissible designs, prefer the one scoped to the narrowest **input class** — not
the narrowest case list — that fully contains the root cause. An input class is stated as a
property ("bare خونه/خانه with no second real-estate signal"), which is what keeps ADR-059/060
satisfiable simultaneously: general enough to not be a case hack, narrow enough to not be a
shotgun.

### §21. Placement: where the root cause lives

The fix touches the component where the root cause *lives* (Axis 1), not the component where the
symptom *shows*. Two canonical resolutions from practice:

- Root cause in the rules, symptom at the decision layer → fix the rules, don't move the decision
  threshold (V2 Issues 1–3).
- Root cause is a whole class being wrongly *eligible*, symptom is per-case ambiguity → fix
  eligibility at the retrieval boundary, per ADR-016's "resolvers retrieve, inference decides"
  (V2 Issue 4: depth-0 exclusion in `groundCategory`, justified by ADR-016 at the time).

### §22. Blast radius: predicted, then falsified

The design states its predicted blast radius — which cases should change, which must not — before
validation begins, so the validation phase is a falsification attempt rather than a confirmation
lap. A fix whose observed effects exceed its predicted radius returns to Fix-Designed regardless
of whether the surprise looks beneficial: an unpredicted improvement is still an unpredicted
effect, and unpredicted effects are what regressions look like before you understand them.

---

## Part 5 — Validation and Measurement

### §23. The validation ladder

Ordered cheapest-first; every fix climbs from the bottom; the mandatory rung depends on change
class. Climbing stops upward, never skips downward — a fix that fails a lower rung never reaches a
higher one.

| Rung | Tool | What it proves | Mandatory for |
|---|---|---|---|
| 1. Targeted trace | Direct function calls on the fixed path, target + predicted-blast-radius inputs | The fix does what its design predicted, case by case | Every fix, no exceptions |
| 2. Regression self-tests | The repo's own suites (`test:cognitive-*`, `test:post-pipeline`, `test:hybrid-intake-golden`, …) | Nothing outside the predicted radius moved, at self-test resolution. Pre-existing failures are checked individually against the fix's trigger surface, never waved through (V2 §6 discipline) | Every fix |
| 3. Full golden replay | `runGoldenReplay` → new ReplayRun | Dataset-wide behavior under the real pipeline, persisted | Every promotion (one run may cover a batch of fixes) |
| 4. Version comparison | `compareReplayRuns` vs. the current baseline | Every improved/regressed/lateral case identified with reason codes | Every promotion |
| 5. Gate evaluation | `evaluateGate` under the active policy | The release-decision input | Every promotion |
| 6. Production shadow window | PVW Pillar B over a post-promotion window | Behavior at production volume and mix | Once PVW exists: promotions with production-scale risk noted at Classification (e.g. V1 Root Cause D's "blast radius at production scale" flag) |

### §24. The measurement deliverable

Every promoted issue reports the seven elements, verbatim from the V2 template (V2 §1):
**root cause · architectural explanation (with Axis-1 classification) · implementation summary ·
replay result · regression result · CCQS delta · Release Gate delta.** A promotion whose report
is missing any element is incomplete regardless of how good the fix is — the deliverable *is* the
audit trail ADR-033/§50 requires for the improvement loop.

### §25. Lateral-move disclosure (ADR-069)

Any case whose status shifts between non-good statuses is disclosed in the measurement deliverable
with the same rigor as a regression: before/after reason codes, why the shift occurred, why the
net metric effect is zero, and what (if anything) it reveals about a frozen surface. inv-23's
`ONTOLOGY.SIBLING → STATE.AMBIGUOUS_CANDIDATE_MISMATCH` shift under the depth-0 fix is the
template: zero accuracy effect, disclosed anyway, and it surfaced a real SEE characteristic
(`valuesMatch` exact-equality) that would otherwise have stayed invisible.

### §26. Run-integrity requirements

From the determinism audit's central pattern — *"a run with an incomplete or drifted input set is
not distinguished from a clean one"* — two invariants close the gap at the only place CIF
controls, the promotion decision:

- **CIF-INV-06 (ADR-066)** — A ReplayRun with `skippedCaseIds ≠ ∅` may not silently ground a
  promotion or gate claim. Either the skips are resolved and the run repeated, or the promotion
  record discloses the skip list and argues why the measured population still supports the
  decision. Silence is the only prohibited option.
- **CIF-INV-07 (ADR-067)** — A `VersionComparisonReport` used in a promotion must compare runs
  with identical `datasetRef`. Across a dataset version change, accuracy numbers are declared
  non-comparable and the promotion baseline is re-established (§34's sequencing).

### §27. Determinism preconditions

The audit established that gate-relevant replay stability currently rests on the **insulation
property**: the compared snapshot is built exclusively from `Decision` objects
(`cognitive-to-snapshot.ts`), which are grounded from `rawText` by deterministic rules — so LLM
sampling variance never reaches the gated fields. The audit also established this property is real
but **unguarded**. CIF makes it a guarded contract:

- **CIF-INV-08 (ADR-072)** — Any change that widens SEE's compared field set, or makes any
  compared field derive from Evidence content, CNO metadata, or timestamps, triggers a mandatory
  determinism re-audit (the audit document's method: structural trace + empirical repeat-run test)
  **before** the change is promoted. The determinism classification table (audit §5) is updated as
  part of the same promotion.
- Fixes classified `determinism-infrastructure` follow the audit's D-narrow recommendation
  structure: always-correct fixes (ordering, sorting) are unconditional; only genuinely
  divergent behavior (LLM sampling parameters) may differ between production and replay execution,
  and any such divergence is itself version-stamped.

---

## Part 6 — Release Decision and Promotion

### §28. Gate semantics and obligations

CIF adopts CCQS's verdict vocabulary unchanged and attaches obligations:

| Verdict | Meaning (CCQS §6) | CIF obligation |
|---|---|---|
| `pass` | All thresholds met, none within warn margin | Promotion may proceed; report notes the clean pass |
| `warn` | All thresholds met; ≥1 metric inside its soft margin | Promotion may proceed — **no threshold is failing, and warn is never rounded up to fail** — but the report must name the margin metric, its cause, and whether the promotion moved it toward or away from the edge (the V2 §5 honest-reporting convention: warn is presented plainly, rounded neither up nor down) |
| `fail` | ≥1 threshold violated | No promotion of engine changes except fixes targeting the failure. The improvement cycle continues per §14 until Case A or Case B |

"The gate passes legitimately" (Case A) means: verdict is `pass` or `warn`, on a run satisfying
§26's integrity invariants, produced by an engine whose changes all cleared §19's admissibility
rules. All three clauses matter — a technically-green verdict obtained by an inadmissible fix or
an incomplete run is not Case A.

### §29. Promotion requirements

A promotion is complete when all of the following exist (ADR-071):

1. The change, merged, with every touched surface consistent with its change-class authority (§32).
2. **Version bumps** per the §30 matrix — at least one axis always moves.
3. **Before/after ReplayRun IDs** and the `VersionComparisonReport` between them.
4. **Gate verdicts** on both runs under the same named policy version.
5. **The report-series entry** (next version number in the Baseline Report / Production Readiness
   series — append-only, never overwriting a predecessor), containing §24's deliverable for every
   included issue, §25's lateral disclosures, and §15's deferral notes.
6. Issue records transitioned to Promoted with all evidence links.

### §30. Version-axis bump matrix

| Change class | Axis that must bump | Owner document |
|---|---|---|
| Rules/packs matching behavior | `RULES_REGISTRY_VERSION` | CCQS §2 |
| Cognitive Engine pipeline/grounding/decision code | `ENGINE_VERSION` (cognitiveEngineVersion) | RFC-002 §62/CCQS §1.2 |
| Category ontology data | ontology version (category namespace) | SEE §6 |
| Location catalog data | `locationCatalogVersion` — **proposed by the determinism audit, adopted as a requirement by this RFC; until implemented, catalog changes are recorded manually in the promotion report** | Audit §6 item 3 |
| SEE comparison logic | `comparatorEngineVersion` | SEE §6 |
| Snapshot wire schema | `semanticContractVersion` | SEE §6 |
| Gate thresholds | `policyVersion` (new policy row; old rows immutable) | CCQS §1.6 |
| Golden dataset | dataset ref (`golden-dataset@vN`) | CCQS §1.1 |
| PVW bucketing / alert thresholds | `windowSpecVersion` / `alertPolicyVersion` | PVW §2.3 |
| Evidence-extraction prompt or sampling parameters | promptVersion in Diagnostics (RFC-002 §107) + `ENGINE_VERSION` | RFC-002 §107 |

### §31. Rollback and supersession

A promotion is never un-promoted in place. If a promoted change proves wrong, the reversal is a
**new** CIF issue (detection source: whichever signal exposed it), a new fix (possibly a literal
revert), a new replay pair, and a new report entry that names the superseded promotion. History
reads forward forever — the same succession-not-mutation rule as claims (ADR-036) and SEE records
(INV-11/16), applied to process.

---

## Part 7 — Governance

### §32. Change classes and authority

| Change class | Path | Constraints |
|---|---|---|
| Cognitive Engine (rules, grounding, decision, prompts, calibration) | Standard CIF lifecycle | §19 admissibility; §23 ladder; §29 promotion |
| Golden dataset — additions | Dataset-governance promotion: its own change, never bundled with an engine change | New cases need mandatory `reason` (CCQS §1.1); additions change denominators → §34 re-baselining |
| Golden dataset — ground-truth corrections | Dataset-governance promotion with the evidence that the old truth was wrong | The correction record must show the engine was measured against a wrong ruler; affected historical interpretations are annotated, never edited |
| Golden dataset — removals | Prohibited. Deprecation only (CCQS §1.1) | `caseId` never reused |
| Gate policy | New `policyVersion`; old versions immutable (CCQS §1.6) | **ADR-064**: threshold changes are grounded in accumulated run history (the recalibration Baseline V1 Rec #8 anticipated) and are never made in the same cycle as — or in response to — a specific run they would flip. The caller-picks-policy mechanism (CCQS §6) is not a loophole: promotions use the designated release policy, and changing *which* policy that is, is itself a governed change |
| SEE / CCQS / PVW architecture | Frozen-surface protocol (§33) | CCQS §0's boundary generalized: a needed capability in a frozen platform becomes a change request through that platform's own process, never an inline edit or a workaround in the engine |
| Determinism infrastructure | Standard lifecycle + §27's constraints | Always-correct fixes unconditional; replay/production divergences version-stamped |

### §33. The frozen-surface amendment protocol (ADR-070)

Formalizing the convention the PVW document practiced (three amendments flagged, zero applied):

1. The proposal is written into a permanent document: exact surface, exact change, why the
   objective cannot be met without it, and its blast radius on historical interpretability.
2. It is **not implemented** — not even partially, not even "harmlessly" — until the owner
   explicitly approves the unfreeze for that specific amendment.
3. On approval, the amendment executes as its own promotion with its own version bumps; the
   approval and its scope are recorded in the amending document.
4. On rejection, the proposal record remains (CIF-INV-05) — the reasoning is reusable the next
   time the pressure appears.

Standing flagged amendments at the time of writing (all PVW's, none approved):
shadow-event version-stamping; per-category/per-city metric breakdowns; `GoldenCase` city-slug
field — plus this RFC's own adoption of `locationCatalogVersion` (§30), which touches CCQS's
`EngineVersionManifest` and therefore itself awaits the same approval.

### §34. Ruler–object separation (ADR-063)

The measured object (engine) and the measuring instrument (dataset, gate policy, metric
definitions) never change in the same promotion. When both must change, the sequence is fixed:

1. **Instrument first.** Promote the dataset/policy/metric change alone. Re-run the *unchanged*
   engine against the new instrument. That run is the new baseline.
2. **Object second.** Promote the engine change measured against the new baseline.

This guarantees every `VersionComparisonReport` in history isolates exactly one moving part — the
property that makes improved/regressed classifications meaningful at all. It is the process-level
completion of CIF-INV-07's mechanical `datasetRef` check.

### §35. Anti-Goodhart provisions

Concentrated here because gate-adjacent pressure is where process discipline dies first:

- ADR-058/059 (no metric-driven, no dataset-overfit fixes) — §19.
- ADR-062 (ruler defects fixed in the ruler) — §19.
- ADR-063/064 (ruler–object separation; no run-motivated threshold changes) — §32/§34.
- The composite-score prohibition inherited from Baseline V1 §8 and PVW §3: no blended "health
  score" exists, so no promotion may cite one. If one is ever designed, it arrives as a versioned,
  documented CCQS metric through §33 — not as a report-writing convenience.
- `intentAccuracy` stays `null` until a real intent classifier exists (CCQS §3 #8): metrics are
  wired, never fabricated, and a promotion citing a fabricated number is invalid on its face.

### §36. Roles

Three roles, defined by conflict-of-interest boundaries, not headcount: **Engine Owner** (works
issues, designs fixes), **Instrument Steward** (golden dataset + gate policies + metric
definitions), **Platform Owner** (SEE/CCQS/PVW/Replay architecture; approves §33 unfreezes).
Today one person (Sasan, with agent assistance) wears all three hats. The separation still binds,
enforced by artifact structure rather than by persons: instrument changes and engine changes live
in separate promotions (§34), frozen-surface changes require an explicit recorded approval even
when the proposer and approver are the same person (§33), and every hat-switch is visible in the
record because the change classes route through different documents. The framework is therefore
already correct for a future where the hats sit on different heads.

---

## Part 8 — Integration Points

### §37. With CCQS
CIF **consumes**: ReplayRun records, `QualityMetricSnapshot`s, `VersionComparisonReport`s, gate
verdicts — as the evidence for Measured/Promoted transitions. CIF **triggers**: replay runs
(rung 3–5 of the ladder) and dataset/policy promotions under §32. CIF **never**: computes a
metric, re-derives a comparison, or reads raw `CcqsComparisonRecord`s to second-guess the
aggregation (the Derived-View is re-derivable, CCQS §1.5 — but re-deriving it differently for a
promotion argument would be a §35 violation).

### §38. With SEE
CIF **consumes**: reason codes as the finest-grained root-cause vocabulary — every trace and every
lateral disclosure cites them (INV-04 is what makes §25 free). CIF **respects**: the reason-code
lifecycle (§14.4/14.5) — a fix must never require redefining a published code; if an outcome needs
a new name, that is an SEE change request (§33). CIF **guards**: the insulation property (§27) on
SEE's behalf, since SEE cannot know what its adapter's inputs derive from.

### §39. With the Replay Platform
CIF **uses** replay in exactly the three-operation vocabulary of SEE §16.1: *Read* for citing
history, *Replay Verification* for determinism re-audits (§27), *Re-evaluation* for measuring a
new engine version. CIF **is the natural customer** for the PVW §6 evolution set
(targeted/category/reason-code/partial replay) — §18 pre-commits to preferring targeted replay
over ad-hoc traces the day it exists, which is the demand signal that should prioritize building
it.

### §40. With the Release Gate
The gate is CIF's decision input, never its decision. §28 defines what each verdict obligates; §35
defines what may never be done to the verdict. Gate-override authority — deliberately left
undefined by CCQS (§6/§10, "who can override a failed gate" was deferred as a CI/DevOps decision)
— is resolved by this RFC as follows: **there is no override.** A failed gate is worked (§28 fail
row) or escalated (§16); a promotion over a failing gate is definitionally not a promotion under
§29. If a genuine emergency ever demands shipping over a failure, that is a §33 amendment to this
RFC — recorded, approved, and permanent in history like everything else.

### §41. With PVW (when built)
Pillar A scheduled runs and Pillar B aggregations become standing Detection sources (§8); fired
`CcqsAlertEvent`s auto-open issues at Detected with the alert's evidence attached; the §5 alert
table's "recommended action" column maps each alert onto a CIF entry state (rule regression →
enters at Reproduced, since the regressed case IDs and both runs' evidence already exist; ambiguity
spike → enters at Detected, since cause is unknown). PVW's Replay Stability metric operationalizes
§27's re-audit as a scheduled measurement instead of an on-demand one.

### §42. With Learning Signals (RFC-002 Part 6)
The signal pipeline (§47: Interaction → Collection → Validation → Store → Analytics → Offline
Learning) terminates in analysis; §48 forbids signals from directly changing rules, policies,
ontology, or thresholds. **CIF is the bridge across that deliberate gap**: an insight from signal
analytics enters CIF as an issue (detection source `production-shadow` or `dataset-review`), and
lands — if it survives the lifecycle — as a versioned, reviewed, replay-validated promotion. This
closes the loop RFC-002 designed but left procedurally open, with ADR-025/026 satisfied by
construction: every learning-derived change is a controlled artifact because CIF permits no other
kind.

---

## Part 9 — Continuous Evolution

### §43. Amending this framework
RFC-004 versions like any RFC (document version; per-part status). Amendments follow §33 with the
Platform Owner as approver — the framework does not exempt itself from its own freeze discipline.
A CIF process failure (an issue mishandled *by the book*) is itself an issue, classified
`measurement` × `cross-cutting` at the process level, and its fix is an amendment here.

### §44. Recalibration cadence
Gate thresholds (`default-v1` is "honestly undertuned" by its own comment), PVW alert thresholds,
and the warn margin are recalibrated only from accumulated run history, as new policy/spec
versions per §30, on evidence-driven occasions (e.g. after the first N scheduled Pillar-A runs
exist — the PVW §7 readiness condition doubles as the first recalibration trigger). Never mid-cycle
(ADR-064).

### §45. Dataset growth policy
Baseline V1 Recommendations #5/#6 (more location-bearing cases; larger per-category n) are the
standing dataset-review issues. Growth is governed: additions in dedicated dataset promotions
(§34), each case with its mandatory reason, denominational impact declared, and the re-baselining
run executed before any engine work is measured against the enlarged set.

### §46. Precedent registry
Part 10's worked examples are normative interpretation aids. Future promotions that establish a
genuinely new pattern (first `measurement` fix, first dataset ground-truth correction, first §40
emergency amendment) append a precedent section in their report-series entry, and the next CIF
revision folds the best of them into Part 10.

---

## Part 10 — Worked Precedents (informative, but normative as interpretation aids)

### §47. A complete cycle: the خونه/خانه collision guard (V2 Issue 2)
Detected (`golden-replay`: p2-guard-01 + خانه-bare mismatches, Baseline V1 Root Cause D) →
Reproduced (isolated bare-word traces) → Traced (all 8 slug×spelling cells enumerated; guard found
on 1) → Root-Caused (collision class: real-estate synonym so generic it fires without any
real-estate co-signal) → Classified (`rules` × `category`, gate-blocking) → Fix-Designed (complete
the guard across the class — all 4 slugs × both spellings, `unless` co-signal list) → Validated
(targeted traces + regression suites; pre-existing failures individually cleared) → Measured
(replay `cmrc8md8x…`, p2-guard-01 improved to `STATE.BOTH_MISSING`, zero-candidate behavior
matching its control-case ground truth) → Promoted (`RULES_REGISTRY_VERSION` 1.0.0→1.1.0, V2
report entry). Every CIF state has a concrete referent in this one issue.

### §48. A canonical deferral: inv-12 (car vs car-ride)
Reached Fix-Designed and stopped: both candidate designs violated admissibility (global threshold
widening → ADR-058/061; per-case suppression → ADR-060), and the admissible fix (registry
deduplication) is architectural in scope. Deferred with rationale, disclosed in V2 §4, trigger:
legacy/pack registry deduplication work. Not a failure — the framework working as intended.

### §49. A canonical lateral move: inv-23
`ONTOLOGY.SIBLING → STATE.AMBIGUOUS_CANDIDATE_MISMATCH` under the depth-0 fix; zero net accuracy
effect (neither status is in `GOOD_STATUSES`); disclosed with full reason-code detail; surfaced a
real SEE limitation (`valuesMatch` exact-equality) that was named, judged below the Case B bar,
and left as a recorded frozen-surface observation. The template for §25.

### §50. A canonical measurement-layer issue: Root Cause E (inv-26)
Engine answered `car` for ground truth `car-heavy` — the *parent*, i.e. under-specified — and
SEE's direction-blind `refinement` counted it as good, inflating categoryAccuracy. Correctly
classified `measurement` × `category`; correctly *not* fixed in the engine (ADR-062); correctly
routed as a CCQS/SEE fidelity change request awaiting §33. The standing example of why Axis 1
exists.

### §51. A canonical infrastructure investigation: the Replay Determinism Audit
An `audit`-source investigation that changed zero lines yet produced permanent value (CIF-INV-05):
one empirically-confirmed bounded risk (LLM sampling variance, structurally insulated from gated
fields), three previously-unknown real gaps, two run-integrity contract violations, and a scoped
recommendation (D-narrow) — now §26/§27 of this RFC. The standard for what Rejected-or-no-fix
outcomes still owe the record.

---

## Part 11 — Conformance

### §52. Per-improvement conformance checklist

A promotion is CIF-conformant iff every line checks:

1. Issue record exists with ID, detection source, observed/expected behavior, reproduction inputs.
2. Grouped by root cause, not symptom; splits/supersessions recorded.
3. Both classification axes and severity assigned; `measurement`/`dataset` routing respected.
4. All eight protocol steps evidenced in order; no transition cites unverified memory.
5. Fix admissible under ADR-058…062, with predicted blast radius stated before validation.
6. Validation ladder climbed to the required rung; pre-existing failures individually cleared.
7. Seven-element deliverable complete; lateral moves disclosed; deferrals carry named triggers.
8. Replay pair + comparison + gate verdicts recorded; run integrity satisfied (no undisclosed
   skips; matching `datasetRef`).
9. Version axes bumped per §30; report-series entry appended, predecessor untouched.
10. No frozen surface modified without a recorded §33 approval; no instrument changed in the same
    promotion as the object.
11. Determinism preconditions honored: no compared-field widening without re-audit (CIF-INV-08).
12. Every artifact append-only; every prior record still byte-identical.

### §53. Prohibited behaviors (extending RFC-002 §117 to the improvement loop)

Fixes justified by metric movement · dataset-keyed fixes · hardcoded case exceptions ·
guess-based ambiguity suppression · engine compensation for ruler defects · threshold changes
motivated by a specific run · simultaneous ruler-and-object promotion · promotion over an
undisclosed-incomplete run · cross-`datasetRef` accuracy comparison presented as a delta ·
silent lateral moves · deferrals without triggers · unfreezing by inline edit · gate override ·
citing a composite score no versioned definition backs · editing any historical record.

---

*End of RFC-004 v1.0. This document was produced as a design artifact only: no code, schema,
threshold, dataset entry, or frozen surface was modified in its creation. Its own adoption is,
per §33, a decision that belongs to the owner.*
