# RFC-005 — Cognitive Governance Platform (CGP)

**Version:** 1.0
**Status:** Draft
**Depends on:** RFC-000, RFC-002, RFC-004 (CIF)
**Companion architecture documents (normative inputs):** SEE (`semantic-comparator-architecture.md`),
CCQS (`ccqs-architecture.md`), PVW (`production-validation-window-architecture.md`),
Replay Determinism Audit (`replay-determinism-audit.md`),
Architecture Conformance Audit v1 (`architecture-conformance-audit-v1.md`)
**Numbering:** ADRs continue the platform sequence — RFC-004 ended at ADR-072; this document
begins at **ADR-073**. Machine-enforceable invariants use their own **MEI-NN** series
(distinct from SEE's INV-NN and CIF's CIF-INV-NN). Sections are numbered continuously §1–§20.
**Traceability rule (binding on this document itself):** every rule below either cites its source
(RFC/ADR/INV/§) or carries the marker **[NEW-GOV]** with an explicit justification. A rule with
neither is invalid.

---

## Part 1 — Foundations

### §1. Purpose

Seven permanent architectural artifacts now exist — the Cognitive Engine (RFC-002), SEE, CCQS, the
Replay Platform, the Release Gate, the PVW design, and CIF (RFC-004). The Conformance Audit v1
verified they are individually disciplined but concluded the ensemble is **"measurement-grade, not
operations-grade"**: the parts can each measure and justify themselves, but nothing defines how
they operate *together* as one governed production platform — who acts, in what order, producing
which durable artifacts, under which machine-checkable guards.

CGP is that definition. It introduces **zero new Cognitive Engine capabilities** (hard constraint
of its commission) and zero new measurement logic (CCQS §0's non-duplication rule, applied one
level up, exactly as CIF applied it to process). Everything CGP does is orchestration: it names
the states, actors, artifacts, and transitions through which every change flows.

- **ADR-073** — CGP is the top-level governance document of the Cognitive platform. On questions
  of *process* (who may do what, when, producing what), CGP prevails over subsystem documents. On
  questions of *mechanism* (how comparison works, how metrics are computed, how issues are
  investigated), the subsystem documents prevail and CGP defers — it orchestrates mechanisms, it
  never redefines them. (Extends RFC-002's Final Decision — "future RFCs SHALL extend, not
  contradict" — into an explicit precedence rule; [NEW-GOV] for the precedence direction itself,
  justified because two governance documents now coexist and a conflict-resolution rule must
  predate the first conflict.)

### §2. Relationship to CIF — the one boundary that must be exact

CIF (RFC-004) governs the lifecycle of a **Quality Issue**: why the engine should change, and
whether a specific fix is admissible, validated, and honestly measured. CGP governs the lifecycle
of a **Cognitive Change**: how any alteration — including one that bundles several promoted CIF
issues, or one that contains no CIF issue at all (a dataset expansion, a policy recalibration, a
platform amendment) — flows from proposal to production to retirement, across every actor and
artifact.

```
   CIF (RFC-004):   issue-centric      "should this change exist, and is it sound?"
   CGP (RFC-005):   change-centric     "how does any change move through the platform,
                                        who acts, what is recorded, what can stop it?"

   ┌─────────────────────────── CGP: Cognitive Change lifecycle ───────────────────────────┐
   │  PROPOSED → IMPLEMENTED → REPLAYED → VALIDATED → GATED → APPROVED → SHADOW → PROD …   │
   │      ▲            ▲                                                                    │
   │      │            │                                                                    │
   │  ┌───┴────────────┴───┐                                                                │
   │  │  CIF issue records  │  (one or more, or none — CIF nests inside CGP's first two     │
   │  │  Detected…Promoted  │   states; a CIF "Promoted" disposition is CGP's admission     │
   │  └────────────────────┘   ticket, never a bypass of the remaining CGP states)          │
   └────────────────────────────────────────────────────────────────────────────────────────┘
```

CIF's fix-admissibility rules (ADR-058…062), deferral/escalation semantics (RFC-004 §15–16), and
per-issue deliverable (RFC-004 §24) are incorporated by reference and **not restated** — CGP adds
the platform shell around them. Where CIF said "promotion" informally from the issue's viewpoint
(RFC-004 §29), CGP now owns the term end-to-end; RFC-004 §29's checklist becomes the *content
requirement* of CGP's `Gated → Approved` transition (§12), unchanged in substance.

### §3. Governed surfaces

A **governed surface** is any artifact whose change can alter platform behavior or platform
truth. The list is CIF's change-class table (RFC-004 §32) verbatim, restated here only as an
enumeration for the state machine to reference: **engine** (rules/packs/grounding/decision/
prompts/calibration), **instrument** (golden dataset, gate policies, metric definitions),
**platform** (SEE/CCQS/PVW/Replay code), **governance** (the RFCs and permanent documents
themselves), **infrastructure** (determinism/versioning/ordering), **knowledge-data** (ontology
tree, location catalog). Anything not on this list is ungoverned by CGP (ordinary product code
follows ordinary engineering practice).

- **ADR-074** — The Cognitive Change is the sole unit of governance: no governed surface changes
  except as part of a Cognitive Change in a defined lifecycle state. (Generalizes CIF ADR-057 —
  which bound only engine-behavior changes to the CIF lifecycle — to every governed surface;
  [NEW-GOV] for the generalization, justified by the Conformance Audit's finding D1: the gap it
  found was on a *platform* surface, which CIF's engine-scoped ADR-057 did not cover.)

---

## Part 2 — The Cognitive Change Lifecycle (Requirement 1)

### §4. Change identity

Every Cognitive Change receives **`CGC-YYYY-NNN`** at Proposal — year plus sequence, never
reused, never renumbered (the stability rule of CCQS `caseId`s, SEE reason codes, and CIF issue
IDs, applied a third time; CIF-INV-04 by analogy). The Change Record (§10, artifact A1) is created
at the same moment and accompanies the change through every state.

### §5. States

| # | State | Meaning |
|---|---|---|
| 1 | **PROPOSED** | The change exists as intent: scope, governed surface(s), linked CIF issues (if any), predicted blast radius (CIF §22). For engine changes, the nested CIF lifecycle typically runs *inside* this state and the next |
| 2 | **IMPLEMENTED** | The change exists as a diff on a branch, not merged. All CIF-level validation rungs 1–2 (targeted trace, regression self-tests; RFC-004 §23) complete |
| 3 | **REPLAYED** | A full golden ReplayRun exists for the changed engine (CCQS §4); for instrument changes, the re-baselining run of the *unchanged* engine against the new instrument exists (CIF §34 sequencing) |
| 4 | **VALIDATED** | The `VersionComparisonReport` against the current baseline exists (CCQS §5); every regressed case is fixed, accepted-with-rationale, or reclassified lateral-with-disclosure (RFC-004 §10, §25) |
| 5 | **GATED** | A persisted GateVerdict exists (artifact A6) under the designated release policy version (CCQS §6); run-integrity checks passed (MEI-02/03) |
| 6 | **APPROVED** | A human Release Manager has recorded approval (artifact A7). Automation cannot produce this state (ADR-075) |
| 7 | **SHADOW** | Merged and running in shadow mode on live traffic — today's production-of-record for the engine. Observability begins accumulating (PVW Pillar B when built; raw `CognitiveEngineShadowComparison` events today) |
| 8 | **PRODUCTION** | Post-Phase-8 only: the change's decisions are authoritative on live traffic. **The state machine is identical before and after cutover** — SHADOW and PRODUCTION differ only in blast radius, which is exactly why the same governance must already be in force now (RFC-002 §126's shadow-first migration discipline, made permanent rather than transitional) |
| 9 | **ROLLED-BACK** | Terminal for this change: superseded by an emergency or corrective successor change (§13). The lineage records both |
| 10 | **RETIRED** | Terminal: the change's content is deliberately withdrawn at end-of-life (a rule pack removed by deprecation, a legacy pathway decommissioned at cutover). Produces a Retirement Record (A11). **ADR-080** — retirement is a governed lifecycle end, executed by deprecation-and-successor, never by silent deletion (SEE §14.5's deprecate-never-delete, promoted from reason codes to every governed surface) |

### §6. The two production modes, stated without euphemism

Until Phase 8, SHADOW **is** the terminal operating state, and its risk is real but bounded:
wasted compute, corrupted observability data, wrong drift conclusions — not wrong user outcomes.
After Phase 8, PRODUCTION adds user-visible consequence. CGP deliberately gives both the same
upstream lifecycle so that cutover changes **nothing procedural** — Phase 8, whenever authorized
(it is not authorized by this document; PVW §7's NOT READY verdict stands), is itself one
Cognitive Change of class `platform`, flowing through these same states.

---

## Part 3 — Governance Actors (Requirement 2)

### §7. Actor roster

| Actor | Kind | Duties | Authority |
|---|---|---|---|
| **Developer** | Human | Proposes changes; runs the nested CIF lifecycle; implements; executes validation rungs 1–2; assembles artifacts | May advance a change to VALIDATED. May not approve, merge to the governed mainline, or alter instruments in the same change (CIF ADR-063) |
| **Reviewer** | Human | Verifies CIF conformance (RFC-004 §52 checklist), admissibility (ADR-058…062), artifact completeness; challenges root-cause claims | May block at any pre-APPROVED state; concurrence required at GATED→APPROVED. In today's single-person reality, Reviewer is a hat (CIF §36): review is performed as a recorded, checklist-driven act by the same person, and the record must show it happened as a distinct act |
| **Release Manager** | Human | Owns GATED→APPROVED and SHADOW/PRODUCTION deployment decisions; owns rollback initiation; owns the designated-release-policy selection (CCQS §6's "caller picks policy," pinned by CIF §32 to a governed choice) | The only actor who can produce APPROVED. Cannot bypass GATED (ADR-075/076) |
| **Automated Gate** | Machine | Computes `evaluateGate` under the designated policy; enforces MEI checks | **Can block, cannot approve** (ADR-075). Its verdict is a necessary input to APPROVED, never sufficient |
| **Scheduled Replay** | Machine | PVW Pillar A: recurring + on-deploy golden replays (`triggeredBy: 'scheduled'`/`'deploy'`, closing gap G9 when built) | Produces artifacts and Detection signals (CIF §8); no lifecycle authority |
| **CI** | Machine | Executes validation rungs mechanically on IMPLEMENTED→…→GATED; evaluates every MEI; refuses merge on any MEI failure | Executor of guards, author of none: CI enforces rules defined here, it never defines rules (ADR-079) |
| **Production Monitor** | Machine | PVW Pillar B bucketing + Alert Evaluator; auto-opens CIF issues from alerts (RFC-004 §41) | Detection only; can trigger the *human* rollback procedure, never execute an unattended rollback of an APPROVED change ([NEW-GOV], justified: an unattended actor reverting approved changes is a bigger integrity risk than a delayed human response, at this platform's volume) |

### §8. The authority axioms

- **ADR-075** — Automation may block; only humans approve. Machine verdicts are necessary
  conditions, never sufficient ones. (Derives from RFC-000 Principle 3 — "AI extracts meaning;
  business rules make decisions" — generalized: *no* automated judgment, statistical or
  deterministic, is a decision; decisions are human acts with machine evidence. Also RFC-002
  §126: "the responsible engineer explicitly approves cutover.")
- **ADR-076** — There is no forward override of a failing gate, by any actor, ever (RFC-004 §40
  verbatim). Emergencies move **backward** (rollback, §13) or **sideways** (disable flag, §14),
  never forward over a red gate.
- Separation-of-duties: the actor who implements may not be the recorded approver *in the same
  act* — with one person, the acts are separated in time and artifact, not in identity (CIF §36's
  hats-not-headcount, unchanged).

---

## Part 4 — State Transitions (Requirement 3)

### §9. Transition table

Every transition names: acting actor(s), guard conditions (machine-checkable ones reference MEIs,
§17), and artifacts produced (§10). No other transitions exist.

| Transition | Actor | Guards | Artifacts produced |
|---|---|---|---|
| ∅ → PROPOSED | Developer | Governed surface(s) named; CIF issues linked or "none" declared with reason; instrument/object disjointness declared (MEI-05) | A1 Change Record |
| PROPOSED → IMPLEMENTED | Developer | CIF rungs 1–2 evidence attached; predicted blast radius recorded (CIF §22) | A1 updated (append-only), diff ref |
| IMPLEMENTED → REPLAYED | Developer or CI | Replay executed on the change's build; run completeness satisfied or disclosed (MEI-02) | A2 EngineVersionManifest, A3 ReplayRun + ComparisonRecords, A4 QualityMetricSnapshot |
| REPLAYED → VALIDATED | Developer, checked by CI | Comparison vs. correct baseline (MEI-03 datasetRef equality); regressions dispositioned; laterals disclosed (CIF ADR-069) | A5 VersionComparisonReport + disposition notes in A1 |
| VALIDATED → GATED | Automated Gate | Designated release policy resolved; verdict computed; **verdict persisted** (MEI-01) | A6 GateVerdict (persisted) |
| GATED → APPROVED | Release Manager (+ Reviewer concurrence recorded) | Verdict ∈ {pass, warn} (ADR-076); warn obligations met (RFC-004 §28); RFC-004 §52 checklist attached; all MEIs green | A7 Approval Record |
| APPROVED → SHADOW | Release Manager (deploy), CI (mechanics) | Version bumps merged (MEI-04); report-series entry exists (MEI-06) | A8 Deployment Record; A12 report-series entry |
| SHADOW → PRODUCTION | Release Manager | **Blocked until Phase 8 is separately authorized**; then: PVW §7 readiness conditions met; post-shadow observation window clean (A9) | A8' cutover Deployment Record |
| SHADOW/PRODUCTION → ROLLED-BACK | Release Manager (initiates), Developer (executes) | §13's rules | A10 Rollback Record + successor CGC |
| any pre-APPROVED → withdrawn | Developer | Reason recorded | A1 closed (append-only) — a withdrawn proposal is Rejected-equivalent, permanent (CIF-INV-05) |
| SHADOW/PRODUCTION → RETIRED | Release Manager | Successor or sunset justification; deprecation not deletion (ADR-080) | A11 Retirement Record |

Illegal-by-construction: skipping REPLAYED or GATED (no edge exists); APPROVED produced by a
machine (no machine actor on that row); instrument and engine surfaces in one CGC (MEI-05 at the
first transition); re-entering a terminal state (succession only, ADR-077).

---

## Part 5 — Immutable Artifacts (Requirement 4)

### §10. Artifact catalog

Every artifact is append-only/immutable once produced (SEE §16.2 Historical Record discipline,
CCQS §9, CIF-INV-01 — one discipline, third application). "Producer" = the only actor allowed to
create it.

| ID | Artifact | Producer | Store | Source of requirement |
|---|---|---|---|---|
| A1 | Change Record (`CGC-YYYY-NNN`, append-only log of states, guards, links) | Developer | Git-tracked markdown (CIF §7's reasoning: reviewable, attributable, mutation-immune) | [NEW-GOV] — the one artifact no prior document defined; justification: the audit showed every subsystem records its own outputs but nothing records the *change* that connects them |
| A2 | EngineVersionManifest | Replay orchestration | CCQS DB | CCQS §1.2 |
| A3 | ReplayRun + CcqsComparisonRecords | Replay orchestration | CCQS DB | CCQS §1.3/§4 |
| A4 | QualityMetricSnapshot | CCQS aggregation | Derived View, cacheable (PVW A-store when built) | CCQS §1.5 |
| A5 | VersionComparisonReport | CCQS comparison | Attached to A1 + reproducible | CCQS §5 |
| A6 | **GateVerdict — persisted** | Automated Gate | CCQS DB (`CcqsGateVerdict`, with its `CcqsGatePolicy` row) | CCQS §1.6/§6 — **and Conformance Audit finding D1/T1: the tables exist and are written by nothing. CGP makes persistence a hard guard (MEI-01): an unpersisted verdict is no verdict** |
| A7 | Approval Record (approver, timestamp, checklist ref, verdict ref) | Release Manager | Git (in A1) | RFC-002 §126 (explicit engineer approval); ADR-075 |
| A8 | Deployment Record (what, when, mode, manifest label) | Release Manager/CI | Git (in A1) | [NEW-GOV] — required for PVW §4.2's release-comparison mode to have exact boundaries instead of timestamp guesses (closes the process half of gap G4) |
| A9 | Shadow Observation Summary (post-deploy window: drift stats, alerts fired) | Production Monitor | PVW time-series store when built; manual summary in A1 until then | PVW §2.2/§4 |
| A10 | Rollback Record (§13) | Release Manager | Git (in A1) + successor CGC | [NEW-GOV] — §13's justification |
| A11 | Retirement Record | Release Manager | Git | ADR-080 |
| A12 | Report-series entry (Baseline/Readiness vN+1) | Developer | Git, PLAN/ | Baseline V1 closing note; RFC-004 §29.5 |
| A13 | CIF Issue Records | Developer | Git, PLAN/ | RFC-004 §7 |
| A14 | Alert Events | Production Monitor | `CcqsAlertEvent` (append-only) when built | PVW §5 |

---

## Part 6 — Version Lineage (Requirement 5)

### §11. The lineage model

- Each governed surface has its own **linear** version line (engine: `ENGINE_VERSION` +
  `RULES_REGISTRY_VERSION` + ontology/catalog axes; instrument: dataset ref + policy versions;
  platform: SEE's five axes; PVW's spec versions). The axis-to-surface map is RFC-004 §30,
  incorporated unchanged.
- **ADR-078** — At most one Cognitive Change is in flight (post-PROPOSED, pre-terminal) per
  governed surface at a time. This makes each surface's lineage a chain, not a graph — which is
  what makes every `VersionComparisonReport` interpretable as "exactly one thing moved" (the
  property CIF §34 established for ruler-vs-object, extended to sibling changes on the same
  surface). [NEW-GOV] for the serialization itself; justified by scale (single-maintainer
  platform) and by the audit's confirmation that comparison semantics assume a single moving
  part. Revisit if the team grows — the revisit is an RFC-004 §33-style amendment, not a silent drift.
- Every A2 manifest names its **parent manifest** ([NEW-GOV], trivially: today parentage is
  implicit in time-ordering; explicit parentage survives rollbacks, where time-order lies).
- Lineage never rewinds: **ADR-077** — a rollback produces a **new** version whose content
  restores an old state ("roll forward to the past"): succession, never history mutation
  (RFC-002 ADR-036; SEE INV-11/INV-16 — the platform's oldest rule, applied to deployments).
- Cross-line joins: a GateVerdict (A6) is the canonical join point — it names one engine manifest
  + one policy version + one dataset ref. Lineage queries ("which policy judged which engine
  against which ruler, when") resolve entirely through persisted A6 rows — a further reason MEI-01
  is non-negotiable.

---

## Part 7 — Promotion Rules (Requirement 6)

### §12. Promotion = the GATED → APPROVED → SHADOW path

The content requirements are RFC-004 §29's six items, incorporated verbatim (change merged;
version bumps; before/after runs; verdicts both sides; report-series entry; issue records closed).
CGP adds the platform shell:

1. **Ordering:** instrument-first sequencing across changes (CIF §34), serialized per surface
   (ADR-078).
2. **Persistence:** no APPROVED without a *persisted* A6 (MEI-01) — a verdict that exists only in
   a terminal log or a report document does not satisfy the guard.
3. **Human act:** no APPROVED without A7 (ADR-075).
4. **Disclosure:** warn-verdict obligations (RFC-004 §28), lateral disclosures (ADR-069),
   run-integrity disclosures (CIF-INV-06) all attach to A1 before approval, so the approver signs
   what was actually measured, not a summary of it.

---

## Part 8 — Rollback Rules (Requirement 7)

### §13. Rules

1. **Trigger:** the Release Manager initiates rollback on evidence (a fired alert, a shadow
   observation, a post-promotion CIF issue) — recorded in A10 with the evidence links.
2. **Target:** the restored content must correspond to a version that previously reached
   APPROVED (MEI-07). Rolling back to a never-gated state is a forward change wearing a costume,
   and takes the normal path.
3. **Mechanism:** a successor Cognitive Change (`CGC-…`) of class matching the surface, flagged
   `rollback-of: <CGC-id>`. It takes the **expedited path**: PROPOSED and IMPLEMENTED collapse to
   the revert diff; REPLAYED and GATED are **not skipped** but may follow deployment within a
   bounded window (§14) when user-facing harm is active. Under no circumstance is the replay
   omitted — a rollback that is never re-measured is an unmeasured engine, which the platform
   forbids existing (CCQS's founding premise).
4. **Lineage:** the rolled-back change transitions to ROLLED-BACK (terminal); its version remains
   in the chain forever; the successor's manifest names it as parent (ADR-077).
5. **Post-rollback obligation:** a CIF issue opens automatically for the defect that forced the
   rollback (detection source per §7's Production Monitor row, or `manual`), and the next
   report-series entry carries the incident narrative (CIF-INV-05).

---

## Part 9 — Emergency Procedures (Requirement 8)

### §14. Emergency classes and the two legal moves

| Class | Example | Legal response |
|---|---|---|
| E1 — Shadow-mode incident (today's only class) | Shadow pipeline consuming runaway LLM cost; corrupting observability events | **Sideways:** disable via the governed flag (`INTAKE_COGNITIVE_ENGINE_SHADOW=false`) — an observability-only loss, reversible, recorded in A1 of an emergency CGC. No gate involved because no gated behavior changes |
| E2 — Post-cutover production incident | Authoritative engine mis-categorizing live needs | **Backward:** expedited rollback (§13.3): deploy the revert immediately, complete REPLAYED+GATED within the bounded window — **72 hours** [NEW-GOV: a bound must exist for "post-hoc" to mean anything; 72h chosen as an explicit, amendable starting value in the spirit of every other "honestly undertuned default" in this platform (CCQS default-v1, PVW alert thresholds)] |
| E3 — Data/history integrity incident | A bug wrote malformed rows to an append-only store | Contain (stop the writer via E1-style disable), **never repair in place**: corrupted historical rows are marked superseded by annotation records, not edited (SEE INV-11; the append-only rule binds hardest exactly when it is most tempting to break) |

What emergencies **never** authorize: forward-shipping over a failing gate (ADR-076); editing
history (INV-11); skipping the post-hoc replay (§13.3); silence (every emergency produces an A10
or emergency A1, a CIF issue, and a report-series narrative — CIF-INV-05).

---

## Part 10 — Audit Trail (Requirement 9)

### §15. Requirements

1. Every state transition appends to A1: actor, timestamp, guard evidence refs. Machine
   transitions record the tool version that executed them ([NEW-GOV], trivial extension of the
   version-stamping discipline to the governance tooling itself).
2. Every artifact A2–A14 is discoverable from A1, and A1 from any artifact (§16's linking model).
3. The trail is reconstructible offline: git history + CCQS DB together suffice to replay the
   *governance* history of any change — mirroring SEE §16.1's replay contract at the process
   level: reading history is retrieval, never recomputation (INV-15).
4. Single-person disclosure: where one human holds multiple hats, the trail must still show each
   hat's act as a separate, timestamped entry (§8) — the audit trail is precisely what makes
   hats-not-headcount honest rather than theatrical.

### §16. Cross-linking model (Requirement 11)

Linkage is achieved by **identifier conventions over existing artifacts**, requiring no new
storage ([NEW-GOV] as a design choice; justified: a link table would be a new migration, which
this commission forbids, and conventions are automation-parseable anyway):

- Every ReplayRun `label` embeds the CGC id and any CIF ids it measures (the existing free-text
  label — e.g. `v2-production-readiness-pass1-2026-07-08` — becomes structured:
  `<CGC-id>[+<CIF-id>…]-<description>-<date>`).
- Every A6 GateVerdict row already carries `replayRunId` (CCQS schema) → joins to the manifest →
  joins via label to the CGC.
- Every CIF issue record lists its replay run IDs and its CGC (RFC-004 §12's evidence
  requirements already demand run IDs; the CGC back-reference is the one new field).
- Every Alert Event (A14, when built) carries the window/bucket ref and, when a
  correlated deployment exists, the A8 Deployment Record ref — giving PVW §4.2's release
  comparison exact endpoints.
- **Automatic linkage flows:** alert → auto-opened CIF issue (RFC-004 §41) → carries alert id;
  scheduled replay regression → auto-opened CIF issue at Reproduced (RFC-004 §41) → carries both
  run ids; promotion → report-series entry lists all CGC/CIF/run/verdict ids (RFC-004 §29.5).
  Every flow is a naming/recording rule, executable by hand today and by CI tomorrow, unchanged.

---

## Part 11 — Machine-Enforceable Invariants (Requirement 10)

### §17. The MEI register

Each MEI is a predicate over artifacts — no judgment, no interpretation — so CI can evaluate it
mechanically (that is the definition of belonging in this register; rules requiring judgment stay
in CIF/CGP prose and bind humans instead).

| ID | Predicate | Blocks | Source |
|---|---|---|---|
| MEI-01 | APPROVED requires a persisted A6 row (verdict ∈ {pass, warn}) whose `replayRunId` matches the change's A3 | Approval | CCQS §6 + Audit D1/T1 |
| MEI-02 | The A3 run grounding a promotion has `skippedCaseIds = ∅`, OR A1 contains an explicit skip-disclosure block | Approval | CIF-INV-06 / Audit §3 |
| MEI-03 | The A5 comparison's two runs have identical `datasetRef` | Validation | CIF-INV-07 / Audit §3 |
| MEI-04 | A merged engine-behavior diff (paths under governed engine surfaces) includes a bump to ≥1 version axis file | Merge | RFC-004 §30 / ADR-071 |
| MEI-05 | One CGC's diff never touches both instrument paths (dataset/policy/metric definitions) and engine paths | Proposal & merge | CIF ADR-063 |
| MEI-06 | A promotion's merge is accompanied by a new report-series entry (a new file in the series, predecessor byte-identical) | Deploy | RFC-004 §29.5 / CIF-INV-01 |
| MEI-07 | A rollback CGC's restored manifest label matches some historical A6 row with verdict ∈ {pass, warn} | Rollback deploy | §13.2 |
| MEI-08 | No diff modifies a row-producing code path to UPDATE/DELETE any Historical Record table (comparison records, verdicts, alert events, migration events) | Merge | SEE INV-11 / CCQS §9 |
| MEI-09 | Any diff touching SEE's compared-field registry (`SEE_FIELD_SPECS`) or the snapshot adapter's decision-only sourcing carries a determinism re-audit artifact ref in A1 | Merge | CIF ADR-072 / CIF-INV-08 / Audit §1.1 |
| MEI-10 | Any diff touching golden dataset files carries `reason` on every added case and never deletes a `caseId` | Merge | CCQS §1.1 |
| MEI-11 | Any diff changing gate-policy values creates a new `policyVersion`, never edits an existing one | Merge | CCQS §1.6 / SEE §14.4 |
| MEI-12 | Every fired A14 alert has, within its policy's SLA, a linked CIF issue or a recorded dismissal | Standing (monitor) | RFC-004 §41 / CIF-INV-03 |

**Honest present-tense note (audit discipline):** MEI-01 is unimplementable until the verdict
persistence gap (Audit T1) is closed, and MEI-12 until PVW alerts exist. CGP defines the target
state; the Conformance Audit series tracks distance to it. Defining an invariant whose
precondition is a known open debt is deliberate — it converts the debt from "someone should fix
this" into "this specific guard cannot come online until it is fixed."

---

## Part 12 — Automation Readiness (Requirement 12)

### §18. The automation mapping

- **ADR-079** — The governance model is automation-agnostic: every guard is a predicate over
  artifacts (§17), every duty is assigned to an actor role (§7), and automation *implements a
  role's mechanical duties without acquiring new authority*. Therefore adding GitHub Actions, CI
  jobs, cron schedules, or dashboards requires **zero change to this document** — exactly the
  pattern RFC-002 §125 set for tunable weights ("without requiring an RFC change") and PVW §2.2
  set for its thin I/O triggers.

| Actor duty | Future automation (illustrative, non-normative) |
|---|---|
| CI: MEI-04/05/08/09/10/11 | Merge-blocking checks on governed paths (pure diff predicates) |
| CI: validation rungs 2–5 | Pipeline stages invoking the existing `npm run test:*` / `ccqs:replay` / `ccqs:compare` CLIs |
| Automated Gate: MEI-01/02/03 | A gate step that runs `evaluateGate`, persists A6, fails the pipeline on `fail` |
| Scheduled Replay | Cron/CI schedule invoking the existing replay CLI with `triggeredBy: 'scheduled'` |
| Production Monitor | PVW's designed modules on a schedule; alert rows evaluated per MEI-12 |
| Dashboards | Read-only consumers of A2–A14 (CCQS §8's read-only rule binds every future dashboard) |

What automation may never do, restated as the closing rule of the platform: produce an A7,
forward-ship over a red gate, mutate history, or reinterpret a guard. Those four prohibitions are
the entire reason this document can safely hand everything else to machines.

---

## Part 13 — Conformance and Adoption

### §19. Adoption

Like RFC-004, this document's own adoption is an owner decision under the frozen-surface protocol
(RFC-004 §33) — it becomes binding when Sasan approves it, and its first Conformance Audit row
appears in Audit v2. Its known unimplementable guards (§17's honest note) become the natural first
Cognitive Changes proposed under it.

### §20. Per-change conformance checklist

A Cognitive Change is CGP-conformant iff: (1) it has a CGC id and A1 record from Proposal;
(2) every state it passed is evidenced per §9's guards; (3) every artifact its states require
exists and is immutable; (4) all applicable MEIs were green at their blocking points (or their
failure disclosed and the change stopped); (5) approval is a recorded human act; (6) its lineage
entries (parent manifest, policy version, dataset ref) resolve; (7) any rollback/emergency
followed §13/§14 including post-hoc obligations; (8) the nested CIF issues, if any, are themselves
RFC-004 §52-conformant.

---

*End of RFC-005 v1.0. Design only: no code, no migrations, no APIs, no UI were produced. Every
rule above cites its source or carries [NEW-GOV] with justification; the count of genuinely new
governance rules is deliberately small (A1/A8/A10 artifacts, ADR-073/074/075's generalizations,
ADR-077/078, the 72-hour bound, the linking conventions) — the platform already contained most of
its own governance; this document's main act was assembly, not invention.*
