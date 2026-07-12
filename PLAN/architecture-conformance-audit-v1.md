# Architecture Conformance Audit — Version 1

**Status: Permanent architecture audit document. Pure verification — no code, no fixes, no design
was produced in its creation. Every status below carries a verification tag: `[code-read]` (file
read in full during this engineering cycle), `[grep]` (targeted check run for this audit),
`[empirical]` (real execution evidence — replay run IDs, the determinism repeat-run test),
`[self-test]` (a repo self-test exercising it), `[vacuous]` (satisfied because the triggering
condition cannot occur yet), `[paper]` (exists only in documents), `[unverified]` (no independent
verification method exists today — reported as such, never rounded up to "implemented").**

**Scope notes, stated before any row:**
- **RFC-003 does not exist.** It is a reserved number (Marketplace Ontology / Cognitive APIs
  series, named in the Phase-1 plan, never written). It cannot be audited; it appears below as one
  honest row, not a fabricated section.
- **RFC-000 was not in the commissioned list** (which starts at RFC-001). Its ten Core Principles
  are audited transitively: every one is operationalized by RFC-002 ADRs that ARE audited
  (Principle 3→ADR-016/018, 4→Invariant 4, 8→ADR-013, 9→ADR-050, 10→ADR-047/052).
- **The audit-execution constraint is disclosed:** the multi-agent verification fleet hit the
  session usage cap; this audit was executed inline, grounded in (a) the full-file reads performed
  across this engineering cycle, (b) eight targeted grep/DB-usage probes run specifically for this
  audit, (c) the empirical determinism test, and (d) the persisted replay runs. Rows resting only
  on session memory without one of those four groundings are tagged `[unverified]`.

---

## Part 1 + Part 2 — Architecture Matrix with Traceability Status

Status vocabulary (Part 2's, exactly): **Implemented · Partial · Differently · Missing ·
Obsolete · Superseded · Impossible** — plus the qualifier **(dormant)** for code that exists and
is correct but has no live caller, and **(by-instruction)** for things unbuilt because the owner
explicitly ordered design-only.

### 1A. RFC-001 — Human Need Grammar

| ID | Requirement | Implementation location | Status | Evidence |
|---|---|---|---|---|
| HNG canonical 10-node chain | Actor→Intent→Action→Object→Attributes→Constraints→Location→Time→Budget→Preference | `src/cognitive-engine/types/evidence.ts` EvidenceType enum | **Differently** | `[code-read]` RFC-002's Evidence model (IDENTITY/ACTION/PROPERTY/STATE/CONTEXT/CONSTRAINT) superseded HNG's literal node chain as the working representation — sanctioned by RFC-001's own "RFC-002 derives the Universal Need Model from HNG." Actor, Time, Preference have no evidence type; the YAML intermediate HNG structure was never materialized `[grep]` |
| Design Rule 1 (every sentence maps) | — | Evidence extraction accepts any Persian text | Partial | Unmappable content lands as CONTEXT or is dropped; no conformance test exists for "every sentence" `[unverified]` |
| Design Rule 2 (category derived later) | — | Pipeline: evidence → grounding → decision | **Implemented** | `[code-read]` `run-cognitive-pipeline.ts` — category is a grounding/decision output, never an extraction input |
| Design Rule 3 (multiple intents allowed) | — | — | **Missing** | CNO `primaryIntent` = first ACTION evidence only (`build-canonical-need.ts:51`); no secondary-intent structure `[code-read]` |
| Design Rule 4 (unknown stays null) | — | CNO constraints/semantic nulls | **Implemented** | `[code-read]` `budgetMin` omitted rather than faked; `intentAccuracy` null; nulls never fabricated (pattern verified repeatedly) |
| Design Rule 5 (ambiguity preserved) | — | Decision `requiresClarification` + candidates | **Implemented** | `[self-test]` `test:cognitive-decision`; ambiguous candidate sets carried through to SEE comparison |
| Design Rule 6 (never invent missing info) | — | Whole pipeline | **Implemented** | `[code-read]` + the entire session's "wired, not fabricated" discipline |
| Budget: money never inferred | — | `budget-resolver.ts` (regex only) | **Implemented** | `[code-read]` numeric extraction only, no inference |
| Acceptance: identical HNG across models | — | — | **Missing** | No HNG structure exists to compare across models; the analogous property (identical *Evidence* across models) is empirically FALSE at temp=0.1 (determinism audit §4: 2/10 repeat variance) `[empirical]` |

### 1B. RFC-002 — Invariants 1–5 (§6)

| ID | Requirement | Implementation location | Status | Evidence |
|---|---|---|---|---|
| Invariant 1 | Exactly one primary intent | `build-canonical-need.ts` | Partial | `[code-read]` One primaryIntent exists, but it is raw ACTION text (e.g. "میخوام بخرم"), not RFC-001's canonical intent enum — documented honest gap |
| Invariant 2 | One publishable objective; multi-objective → multiple Needs | — | **Missing** | No multi-need splitting exists anywhere in the pipeline `[grep]` |
| Invariant 3 | Multiple Objects allowed | Evidence layer | Partial | Multiple IDENTITY evidence items can exist; CNO semantic entities are per-domain decisions (category/location), not per-object `[code-read]` |
| Invariant 4 | Unknown SHALL remain Unknown | Whole pipeline | **Implemented** | See Design Rule 4 row |
| Invariant 5 | Confidence belongs to observations | Evidence/candidate confidence | **Implemented** | `[code-read]` Per-evidence + per-candidate confidence; CNO `overallConfidence` is an aggregate in Metadata (metadata, not the Need's own property — conformant reading) |

### 1C. RFC-002 — ADR-001…056 (complete, one row each)

| ADR | Requirement (short) | Implementation location | Status | Evidence |
|---|---|---|---|---|
| 001 | Meaning before classification | pipeline order | **Implemented** | `[code-read]` category derived at grounding/decision |
| 002 | NL not the primary stored representation | CNO chain | Partial | Cognitive path: NL→Evidence→CNO holds; but no CNO is ever persisted, and the marketplace still stores the legacy representation (shadow mode) `[code-read]` |
| 003 | Need as graph; JSON one serialization | CNO + evidence ID refs | **Implemented** | `[code-read]` graph edges via `derivedFromEvidenceIds`; JSON-serializable |
| 004 | Evidence before inference | pipeline order | **Implemented** | `[code-read]` |
| 005 | Evidence carries no business meaning | Evidence types | **Implemented** | `[code-read]` type/value/sourceSpan/confidence only |
| 006 | Every inferred node references evidence | `claims.ts:21-23` | **Implemented** | `[self-test]` claims skipped when no evidence links — tested |
| 007 | Confidence never increases without new evidence | decision scoring | Partial | Conflict penalty only ever decreases scores `[code-read]`; but no guard enforces monotonicity system-wide `[unverified]` |
| 008 | Evidence append-only | in-memory per run | Partial `[vacuous]` | No persistence layer exists to mutate; the planned `IntakeEvidence` table was never built, so durability half of the ADR is unrealized |
| 009 | Extraction separated from inference | adapter vs grounding/decision | **Implemented** | `[code-read]` |
| 010 | Inference produces candidates | grounding multi-candidate | **Implemented** | `[code-read]` `[self-test]` |
| 011 | Clarifications minimize user effort | legacy `question-engine.ts`; cognitive clarificationQueue | Partial | Cognitive queue built (Phase 5) but not user-facing; legacy engine live; ADR-045's cost/benefit ranking absent (known gap) |
| 012 | Temperature-sensitive behavior SHALL NOT determine business outcomes | shadow mode + insulation property | **Implemented (conditionally)** | `[empirical]` No business outcome depends on the cognitive engine (shadow); gated fields structurally insulated from LLM variance (audit §1.1, 10/10 decision stability). The condition is unguarded in code — guarded only by RFC-004's CIF-INV-08 process rule |
| 013 | LLM never authoritative for marketplace knowledge | grounding via rules/LRE | **Implemented** | `[code-read]` grounding never consumes LLM output for category/location values |
| 014 | Raw text never canonical; entities grounded | grounding | Partial | Category/location grounded; `primaryIntent` and `context.notes` are raw text verbatim `[code-read]` |
| 015 | Knowledge technology-independent | resolver interfaces | **Implemented** | `[code-read]` |
| 016 | Resolvers retrieve; inference decides | `grounding/resolver.ts` header + structure | **Implemented** | `[code-read]` the depth-0 filter placement was explicitly argued under this ADR (V2 Issue 4) |
| 017 | Knowledge failure degrades, never stops | `Promise.allSettled` in `groundEvidence` | **Implemented** | `[code-read]` — with the audit's caveat: the DB-unavailable fallback silently swaps the candidate universe (conforms to the letter; determinism risk recorded) |
| 018 | LLM makes no final decisions | pipeline | **Implemented** | `[code-read]` |
| 019 | Multiple hypotheses preserved | decision engine | **Implemented** | `[self-test]` preferred + requiresClarification independent |
| 020 | Platform policies > statistical inference | `invalidatedIds` mechanism | Implemented **(dormant)** | `[code-read]` mechanism exists and is self-tested; no business-rule caller exists in the real pipeline — documented in `cognitive-to-snapshot.ts`'s own comment |
| 021 | User confirmation overrides inference | `confirmed` state handling | Implemented **(dormant)** | Same situation: tested, no live caller |
| 022 | Confidence evolves incrementally | — | **Missing** | Pipeline is single-shot per text; no incremental evidence accumulation is wired `[code-read]` |
| 023 | Feedback = learning data, not rules | `IntakeTrainingExample`, evolution engine | **Implemented** | `[code-read]` (legacy side; advisory-only evolution) |
| 024 | Explicit feedback > behavioral | training capture flags | Partial `[unverified]` | Fields exist (`hasUserCorrections`); no authority-ordering consumer verified |
| 025 | Runtime learning prohibited | everywhere | **Implemented** | `[grep]` no runtime self-modification path exists in the cognitive ecosystem |
| 026 | Learning via controlled artifacts | CIF (RFC-004) | **Implemented** | Process-level: RFC-004 §42 is now the controlled-deployment definition; practiced in all four promotions this cycle |
| 027 | CNO is the semantic API | CNO types | Implemented **(dormant)** | `[code-read]` well-formed, Zod-validated; zero downstream consumers until cutover |
| 028 | Explainability across lifecycle | claims + SEE reason codes | **Implemented** | `[self-test]` `[code-read]` |
| 029 | CNO backward compatibility / semver | `identity.version` | Partial | `version: 1` constant; no semver machinery, no migration path defined `[code-read]` |
| 030 | One authoritative owner per field | module structure | **Implemented** | `[code-read]` single writer per CNO section in `build-canonical-need.ts` |
| 031 | Consumers ignore unknown sections | — | `[vacuous]` | No consumers exist |
| 032 | Evidence/Claim/Truth distinction | types + claims.ts | **Implemented** | `[code-read]` |
| 033 | Claims traceable | `derivedFromEvidenceIds` | **Implemented** | `[self-test]` |
| 034 | Alternatives preserved until resolution | claims for all non-disqualified candidates | **Implemented** | `[code-read]` |
| 035 | Authority dominates confidence | decision engine ordering | Implemented **(dormant)** | Confirmed-state precedence tested; user-confirmation path has no live caller |
| 036 | Truth evolves by succession | `claims.ts` | Partial | `supersedes` always null — real supersession needs the persistent claim store Phase 5 deferred; disclosed in the file's own header `[grep]` |
| 037 | Semantic state, not conversational | `build-cognitive-state.ts` | **Implemented** | `[self-test]` |
| 038 | Linguistic redundancy discarded post-extraction | CNO | **Implemented** | `[code-read]` meaning-bearing fields only; raw survives as evidence sourceSpans (auditability, sanctioned by ADR-008) |
| 039 | Long-term memory needs permission | — | `[vacuous]` | No long-term semantic memory exists |
| 040 | Dependency-aware clarifications | legacy `showIf`; cognitive queue tiers | Partial | Blocking/non-blocking ordering exists; full dependency graph does not |
| 041 | Distinct objectives → independent states | — | **Missing** | Same root as Invariant 2: no multi-need handling |
| 042 | Three independent readiness dimensions | `compute-readiness.ts` | **Implemented** | `[self-test]` `test:cognitive-state` |
| 043 | Never publish from Interpretable | `computeReadiness` never returns published | **Implemented** `[vacuous]` | Publication unwired; the function structurally cannot emit `published` `[code-read]` |
| 044 | Confidence never bypasses mandatory constraints | `MANDATORY_DOMAINS` | **Implemented** | `[code-read]` `[self-test]` |
| 045 | Clarifications maximize progress per interaction | queue ordering | Partial | Blocking-first ordering approximates it; the explicit cost/benefit ranking is a known, named gap (Phase-5 plan note) |
| 046 | One owner per readiness dimension | single module | **Implemented** | `[code-read]` |
| 047 | AI models replaceable providers | `EvidenceProvider` | **Implemented** | `[self-test]` mock adapter swap in conformance test; Gemmafable→Gemma swap needed zero caller changes (historical evidence) |
| 048 | Stable AI boundary | `cognitive-contract.ts` | **Implemented** | `[code-read]` |
| 049 | AI extracts; platform owns truth | pipeline | **Implemented** | `[code-read]` |
| 050 | Stateless adapters | `openai-compatible-adapter.ts` | **Implemented** | `[code-read]` no state, no business logic |
| 051 | Provider failures terminate at adapter | null contract on failure | **Implemented** | `[code-read]` — with the audit's note that replay converts this into silent case skips (see 4-row below) |
| 052 | AI = infrastructure dependency | imports/DI structure | **Implemented** | `[code-read]` |
| 053 | Conformance by observable behavior | `run-conformance-self-test.ts` | **Implemented** | `[self-test]` 12/12 |
| 054 | Optimize execution, preserve semantics | pipeline ordering deviation | **Implemented** | `[code-read]` deviation documented in pipeline header, ADR cited |
| 055 | No explainability-violating shortcuts | — | **Implemented** | No counterexample found across the full cycle's traces `[unverified as a universal]` |
| 056 | Semver applies to architecture | version axes | Partial | SEE's five axes and `RULES_REGISTRY_VERSION` are semver `[code-read]`; `ENGINE_VERSION` is a label string (`cognitive-engine-v1-phase4-prod-readiness-1`), not semver — inconsistent with this ADR's spirit |
| §126 | Cutover flag `NEED_INTAKE_COGNITIVE_ENGINE_ENABLED`; shadow/parity + explicit approval before cutover | feature-flags.ts | Partial | `[grep]` The named cutover flag exists **nowhere in code** — paper-only. The actual flag is `INTAKE_COGNITIVE_ENGINE_SHADOW` (shadow only). Approval-gated-cutover discipline itself: honored (Phase 8 never started) |

### 1D. RFC-003

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| RFC-003 (all) | — | **Impossible** | The document does not exist; the number is reserved and unwritten. Nothing can conform or fail to conform to it. Any future claim of RFC-003 conformance should be treated as an error |

### 1E. RFC-004 — CIF (ADR-057…072, CIF-INV-01…08)

RFC-004 is days old and its own closing note makes adoption an owner decision (§33) — **formal
adoption is pending.** Conformance below is therefore: (a) retroactive — did the practice CIF
codifies actually happen; (b) prospective — is anything enforcing it in tooling.

| ID | Requirement (short) | Status | Evidence |
|---|---|---|---|
| ADR-057 | All engine changes through the lifecycle | Implemented (as practice), no tooling | All four V2 promotions followed the full workflow before the RFC existed `[code-read of reports]`; nothing mechanically blocks a bypass |
| ADR-058…061 | The four fix-admissibility rules | Implemented (as practice) | inv-12's refusal (061), the 8-cell خونه fix (060), no metric-motivated fix in the record (058/059) |
| ADR-062 | Ruler defects fixed in ruler | Implemented (as practice) | Root Cause E correctly routed away from the engine |
| ADR-063/064 | Ruler–object separation; no run-motivated thresholds | Implemented (as practice) | Dataset and thresholds untouched through both engine promotions (V2 §0 verification) |
| ADR-065 | Every investigation → permanent artifact | **Implemented** | Five permanent documents from this cycle, including two that changed zero code |
| ADR-066/067 | Run-integrity (skips disclosed; datasetRef match) | Partial | Both baseline runs happened to be clean/same-dataset `[empirical]`; **no tooling checks either condition** — the audit that found these gaps also found nothing enforces them |
| ADR-068…071 | Deferral triggers, lateral disclosure, freeze protocol, promotion completeness | Implemented (as practice) | inv-12 trigger, inv-23 disclosure, PVW flagged amendments, V2's complete promotion record |
| ADR-072 / CIF-INV-08 | Insulation property guarded | **Missing (tooling)** | The property is real `[empirical]` but no test or check would catch a violation — exactly the audit's original finding, unchanged |
| CIF-INV-01…05 | Append-only records, evidence trails, no silent closure, stable IDs, artifacts always | Implemented (as practice) | The report series conforms; no CIF-format issue records (`CIF-YYYY-NNN`) exist yet since the format postdates the work |
| CIF-INV-06/07 | No promotion on dirty runs | Same as ADR-066/067 | Partial — see above |

### 1F. SEE — INV-01…17 + governance contracts

| ID | Requirement (short) | Status | Evidence |
|---|---|---|---|
| INV-01 | Deterministic comparator | **Implemented** | `[grep]` zero `randomUUID/Date.now/new Date` in comparator/policy core (verified this audit); pure functions `[code-read]` |
| INV-02 | No AI at comparison time | **Implemented** | `[grep]` no LLM imports anywhere under `semantic-evaluation-engine/` |
| INV-03 | No input mutation | **Implemented** | `[code-read]` |
| INV-04 | reasonCode always present | **Implemented** | `[code-read]` `[self-test]` — this is what made every trace and lateral disclosure this cycle free |
| INV-05/06/13 | Provider-independent, contract-only, no sourceSystem branching | **Implemented** | `[code-read]` adapters are the only files touching source types |
| INV-07 | Byte-for-byte replayable | Partial | Version stamps carried `[code-read]`; but reproducing an old answer requires the old rules registry + old location catalog to be reconstructable — location catalog is **unversioned** (audit §3), so INV-07 is not actually guaranteed for location-bearing reports |
| INV-08 | Additive registries only | **Implemented** | Reason-code registry, field specs — additive throughout `[code-read]` |
| INV-09 | No business weighting in comparator | **Implemented** | `[code-read]` weights live in Scoring Policy only |
| INV-10 | 8-state distinction preserved | **Implemented** | `[code-read]` `[self-test]` |
| INV-11 | No retroactive alteration | **Implemented** | `[grep]` no UPDATE path against comparison data anywhere (CCQS §9 note verified when schema was read) |
| INV-12 | JSON-serializable outputs | **Implemented** | Persisted as JSON in two stores `[code-read]` |
| INV-14 | Registry-only reason codes | **Implemented** | `[code-read]` emission sites reference registry exports |
| INV-15 | Reads never recompute | **Implemented** | `[code-read]` `read-replay-records.ts` parses stored bytes |
| INV-16 | Re-evaluation = new IDs, never overwrite | **Implemented** | `[empirical]` two baseline runs coexist as separate records |
| INV-17 | Replay Verification: diff-then-discard, separate audit channel | **Missing (in practice)** | The operation has never been executed; no audit channel exists; the determinism audit was the first partial exercise of the idea and had to use scratchpad scripts `[empirical]` |
| §14.4/14.5 | Codes frozen once published; deprecate-never-delete | **Implemented** `[vacuous]` | No code has needed deprecation yet; the machinery (deprecated fields in registry entries) exists |
| §16.2 | Historical Record vs Derived View | **Implemented** | `[code-read]` verified true by the determinism audit's own §3 row 2 |
| §16.5 | Old engine builds stay executable for replay | **Missing** | No build archival exists; replay for old vintages relies on git checkout + identical environment — untested, and the unversioned location catalog breaks it regardless |

### 1G. CCQS — capabilities and contracts

| ID | Requirement (short) | Status | Evidence |
|---|---|---|---|
| §0 | Never reimplement SEE | **Implemented** | `[code-read]` `run-golden-replay.ts` calls SEE's real functions |
| §1.1 | Golden dataset: git-tracked, mandatory reason, deprecate-only | **Implemented** | `[code-read]` schema enforces reason; 33 cases in git |
| §1.2/§2 | EngineVersionManifest, rulesRegistryVersion axis | **Implemented** | `[code-read]` + two real manifests persisted `[empirical]` — **incomplete by one axis** (location catalog; audit §3) |
| §1.3/§4 | Replay orchestration, append-only records | **Implemented** | `[empirical]` runs `cmrc643xt…`, `cmrc8md8x…` |
| §1.5/§3 | Metrics aggregation (accuracy, histograms, ontology stats, coverage, FP/FN) | **Implemented** | `[code-read]` `[empirical]` — per-category/per-city breakdowns absent (PVW G2, acknowledged design gap, not drift) |
| §1.6 | Gate policy: named, versioned, immutable rows | **Differently + Partial** | `[grep — new finding this audit]` The `CcqsGatePolicy` and `CcqsGateVerdict` Prisma tables are **never written or read by any code path**. The gate runs off the in-code `DEFAULT_GATE_POLICY` constant, and verdicts are computed and printed, **never persisted**. The immutability discipline is honored trivially (rows can't be mutated if none exist), but the intended permanent record of gate decisions does not exist — both baseline gate verdicts survive only inside report documents |
| §3 #8 | intentAccuracy null until real classifier | **Implemented** | `[code-read]` wired-not-fabricated |
| §5 | Version comparison mechanics | **Implemented** | `[empirical]` V1↔V2 comparison ran; classifications correct — datasetRef equality **not checked** (audit §3) |
| §6 | Gate pass/warn/fail semantics | **Implemented** | `[empirical]` fail (V1) and warn (V2) both observed and correctly explained |
| §6/§10 | CI wiring, override authority | **Missing (deferred by the doc itself)** | Explicitly scoped out as a Phase-2/DevOps decision; RFC-004 §40 has since answered the authority question (no override) — pending adoption |
| §8 | Read-only dashboard | **Missing** `[paper]` | Never built; `getCognitiveEngineShadowStats` exists with zero consumers |
| §11 step 9 | Permanent v1 baseline | **Implemented** | `[empirical]` `cmrc643xt0002s5378cpek1zs` |

### 1H. Replay Platform, Release Gate, PVW, Determinism Audit

| ID | Requirement (short) | Status | Evidence |
|---|---|---|---|
| SEE §16.1 Read | Return stored bytes, zero recompute | **Implemented** | `[code-read]` |
| SEE §16.1 Replay Verification | Re-run pinned, diff, discard | **Missing** — see INV-17 row | |
| SEE §16.1 Re-evaluation | New run, new IDs | **Implemented** | `[empirical]` |
| `triggeredBy: 'scheduled'` | Scheduled replay | **Missing** `[paper]` | Typed, zero call sites (PVW G9, re-confirmed) |
| Replay skip handling | Complete runs distinguishable from incomplete | **Missing** | `skippedCaseIds` surfaced but nothing downstream reads it (audit §3; both real runs happened to have 0 skips) |
| PVW (all components) | Two pillars, time series, trends, alerts | **Missing (by-instruction)** | Explicitly design-only; the NOT READY verdict and G1–G9 stand unchanged. Not drift — sequenced work awaiting authorization |
| Audit D-narrow item 1 | Sort readdirSync; orderBy on catalog query | **Missing (by-instruction)** | `[grep]` both still unsorted/unordered — recommendations only, never authorized for implementation |
| Audit D-narrow item 2 | Replay-mode LLM pinning (temp 0, seed) | **Missing (by-instruction)** | `[code-read]` temp=0.1, no seed, unchanged |
| Audit D-narrow item 3 | `locationCatalogVersion` axis | **Missing (by-instruction)** | Adopted as requirement by RFC-004 §30 (pending), unimplemented |
| Audit D-narrow item 4 | Gate refuses/discloses dirty runs | **Missing (by-instruction)** | Same as CIF-INV-06 row |

---

## Part 3 — Dead Architecture (exists on paper or as unreachable code)

| # | Item | Kind | Explanation |
|---|---|---|---|
| D1 | `CcqsGatePolicy` + `CcqsGateVerdict` Prisma tables | Schema never instantiated | **New finding.** Migrated into the real database, referenced by FK design, written by nothing, read by nothing. Gate verdicts — arguably the most decision-bearing artifact in the whole system — are not persisted anywhere structured |
| D2 | `triggeredBy: 'scheduled'` | Enum member never sent | G9; every run to date is `'manual'` |
| D3 | Decision state `'published'` | Lifecycle state never reached | Documented as deliberate (Phase 3): publication belongs to real persistence, out of scope until cutover |
| D4 | `invalidatedIds` / `disqualifiedByRule` / `plausibleCandidates` filter | Mechanism with no live caller | Self-tested, correct, dormant; own code comment admits "no candidate is ever disqualified today" |
| D5 | `NEED_INTAKE_COGNITIVE_ENGINE_ENABLED` (RFC-002 §126) | Flag named in spec, absent in code | The cutover flag exists only in RFC-002's text; only the shadow flag is real |
| D6 | `getCognitiveEngineShadowStats` | Function with zero consumers | Production shadow data is written continuously and read by nothing (no dashboard, no PVW) |
| D7 | SEE Replay Verification operation + audit channel | Contract operation never executed | INV-17's entire discipline is unexercised; its first approximation (the determinism audit) had to improvise outside the contract |
| D8 | Cognitive State persistence / §88 recovery | Deferred subsystem | In-memory only `[grep]`; deliberate Phase-5 deferral, still a paper capability |
| D9 | HNG YAML intermediate (RFC-001) | Representation never materialized | Superseded in practice by RFC-002's Evidence model — should someday be recorded as formally Superseded rather than lingering as unimplemented |
| D10 | `GoldenCase.deprecated` | Field never yet used | Benign — the dataset is young; machinery correct |
| D11 | `maxNewMismatchCaseIds` in standalone gate runs | Threshold evaluable only with a comparison | Correctly reported not-evaluated; noted because a casual reader of a verdict may not realize one threshold is conditionally live |

---

## Part 4 — Runtime Conformance

| Property | Verdict | Evidence |
|---|---|---|
| Immutability / append-only | **Conforms** | No UPDATE path against any comparison/event record `[grep]`; the only mutable fields are `CcqsReplayRun.status/completedAt` (run lifecycle, sanctioned) |
| Version pinning | **Partially conforms** | Every persisted CCQS record carries its manifest `[empirical]`; but (a) production shadow events carry no version at all (G4), (b) the location catalog axis doesn't exist, (c) gate verdicts aren't persisted so their policy pinning lives only in reports |
| Ontology usage | **Conforms** | Category comparisons flow through the registered provider; distance recorded in every stored report `[code-read]` |
| Reason-code governance | **Conforms** | Registry-only emission (INV-14); no ad-hoc codes found `[code-read]` |
| Replay contracts | **Partially conforms** | Read ✓, Re-evaluation ✓ `[empirical]`; Replay Verification never executed; run-completeness and dataset-identity checks absent |
| Release gate | **Conforms functionally, nonconforms on persistence** | Semantics correct across a real fail and a real warn `[empirical]`; verdict/policy rows never written (D1) |
| CCQS assumptions | **Mostly hold** | The determinism audit's §3 table stands: Derived-View re-derivability TRUE; manifest completeness FALSE (one axis); run-completeness enforcement FALSE |
| SEE assumptions | **Mostly hold** | INV-01…16 verified or vacuously satisfied; INV-17 unexercised; INV-07 conditional on the unversioned catalog |
| Determinism | **Conforms at the gated surface, empirically** | 10/10 decision-level stability `[empirical]`; Evidence layer 8/10 — insulated, not eliminated; insulation unguarded in tooling |

---

## Part 5 — Architectural Drift

| # | Drift | Why it drifted | Risk | Recommended action (not performed) |
|---|---|---|---|---|
| DR1 | Rules packs: **125 files, 195MB, ~1.24M rules** vs `RULES_PACK_TARGET_SIZE = 10_000` `[grep]` | Generated packs accumulated without pruning; predates this cycle | High: ~2.4s/category-match, 3-min test hangs, and the legacy-vs-pack duplication that caused inv-12 | The already-flagged dedup/pruning task; also inv-12's named deferral trigger |
| DR2 | Legacy `car` bucket vs pack `car-ride` (and class-siblings) | Two rule-generation eras coexist | Medium: phantom ambiguity on brand/generic keywords | Same dedup effort |
| DR3 | `publishRequestSchema.templateVersion: z.string()` vs `NeedDraft.templateVersion: number` | Schema/contract divergence, pre-existing | High if real clients hit it (breaks Zod validation before the handler runs); already broke the smoke test | Already flagged as its own task (task_d4bd17db) |
| DR4 | Flag name drift: spec's `NEED_INTAKE_COGNITIVE_ENGINE_ENABLED` vs real `INTAKE_COGNITIVE_ENGINE_SHADOW` | Spec written before implementation | Low; becomes Medium at cutover time if someone implements the spec name and both flags float | Reconcile in RFC-002 Part 13 erratum at cutover design time |
| DR5 | LLM temp=0.1, no seed, unpinned top_p | Default carried from legacy client | Contained (insulation) but unguarded | Audit D-narrow item 2, awaiting authorization |
| DR6 | readdirSync unsorted / catalog query unordered / catalog unversioned | Never mattered until replay semantics existed | Latent (ordering) to High-on-occurrence (catalog fallback silently swaps datasets) | Audit D-narrow items 1 & 3 |
| DR7 | 6 pre-existing `hybrid-intake-golden` failures | Predate this cycle (test-oracle memory); individually cleared as unrelated in V2 §6 | Low-Medium: erodes the suite's signal value | Dedicated triage pass |
| DR8 | Dual synonym registries: `CATEGORY_SYNONYMS` (categoryIndex) + `CATEGORY_KEYWORDS` (intent-parser), both feeding legacy-bridge | Two eras of the same idea | Medium: the خونه class of bug existed precisely because a synonym registered in one place lacked guards in the other | Consolidation candidate (Part 6 R3) |

---

## Part 6 — Redundancy Audit

| # | Duplication | Assessment | Recommendation |
|---|---|---|---|
| R1 | `getShadowPublishStats` ≡ `getCognitiveEngineShadowStats` — near-identical bodies `[code-read]` | Copy-paste duplication, same file | Consolidate into one parameterized function when next touched; trivial |
| R2 | Two shadow-comparison systems (template-migration shadow + cognitive shadow) on one event table | **Sanctioned parallel** — different questions (template parity vs engine parity) | Keep; document the boundary; retire the template one when its migration completes |
| R3 | Dual synonym registries (DR8) | Genuine conceptual duplication with proven bug surface | Consolidate into a single synonym source feeding rule generation — candidate for the dedup effort (DR1/DR2), same root |
| R4 | Legacy intake engine vs Cognitive Engine | **The sanctioned big one** — shadow-mode design requires both until Phase 8 | Keep until cutover; this duplication is the architecture, not a violation of it |
| R5 | Version identity: semver axes (SEE, rules registry) vs label-string `ENGINE_VERSION` | Inconsistent versioning *style*, one source each (no true duplication) | Align `ENGINE_VERSION` to semver at next bump (ADR-056 spirit) |
| R6 | Gate policy in code constant + empty DB tables for the same concept | Split-brain: the concept exists twice, populated once | Either persist policies/verdicts (fills D1) or drop the tables; the current halfway state is the worst of both |

---

## Part 7 — Architectural Debt Register

| # | Debt | Class | Impact | Risk | Difficulty |
|---|---|---|---|---|---|
| T1 | Gate verdicts/policies not persisted (D1/R6) | **Critical** | The system's release decisions have no structured historical record — undermines CCQS's own reason for existing | Certain (already true) | Low — the tables exist; write/read paths are small |
| T2 | No production quality signal into CCQS (PVW G1–G4, unbuilt) | **Critical** | Cutover-blocking (the NOT READY verdict) | High post-cutover, none pre-cutover | Medium-High — PVW Pillars A+B |
| T3 | Run-integrity unenforced (skips, datasetRef) | **High** | A dirty run could silently ground a future gate claim | Latent, activates under LLM instability | Low |
| T4 | Location catalog unversioned + fallback swaps universe | **High** | Breaks INV-07/replay for location; invisible in manifests | Latent, activates on DB unavailability | Low-Medium |
| T5 | Rules-pack bloat + legacy/pack duplication (DR1/2, R3) | **High** | Performance + the inv-12 ambiguity class + collision-guard whack-a-mole | Active | High — generator archaeology needed |
| T6 | Insulation property unguarded (ADR-072 tooling) | **High** | One SEE field-spec change silently converts LLM variance into gate flakiness | Latent | Low (a targeted test) |
| T7 | INV-17 Replay Verification never exercised, old builds not archived (§16.5) | **Medium** | Historical replayability is a promise no one has ever collected on | Latent | Medium |
| T8 | publish schema type mismatch (DR3) | **Medium** (High if production-reachable) | Publish requests failing validation | Unknown-frequency active | Low |
| T9 | Claims supersession null / no persistent claim store (ADR-036 partial) | **Medium** | Blocks multi-turn truth evolution; irrelevant to single-shot shadow | None today | Medium |
| T10 | Multi-objective needs unhandled (Invariant 2, ADR-041) | **Medium** | Real user texts with two needs get one distorted parse | Active at low frequency | High |
| T11 | ENGINE_VERSION not semver (ADR-056) | **Low** | Cosmetic-until-tooling-parses-it | Low | Trivial |
| T12 | Dashboard/stats consumers absent (D6, CCQS §8) | **Low** | Observability data write-only | Low | Medium |
| T13 | Legacy question-engine vs cognitive clarification queue unreconciled (ADR-011/045) | **Low** (pre-cutover) | Duplicate clarification logic at cutover time | Deferred | Medium |
| T14 | 6 pre-existing golden-suite failures (DR7) | **Low** | Suite signal erosion | Active | Low-Medium |

---

## Part 8 — Final Verdict

**Ratings (qualitative, evidence-grounded; no invented composite numbers — consistent with
Baseline V1 §8's standing rule):**

| Dimension | Rating | Grounding |
|---|---|---|
| Implementation completeness | **Medium-High for the measurement core; Low for operations** | Engine+SEE+CCQS+Gate: real, tested, exercised end-to-end twice `[empirical]`. PVW: 0% built (by instruction). ~10 of 56 RFC-002 ADRs are partial, 3 missing, 4 dormant, 3 vacuous — the rest implemented |
| Architectural consistency | **High** | The layering discipline held under audit: no comparison logic duplicated, no UPDATE paths, registry-only codes, pure cores `[grep]`-clean of TODO/FIXME. The exceptions are enumerated (D1, DR4, R6), few, and boundary-level rather than structural |
| Governance maturity | **Medium** | Paper: excellent (CIF + practiced precedents). Enforcement: zero tooling; RFC-004 unadopted; single-person separation-by-artifact only |
| Replay maturity | **Medium** | Re-evaluation proven twice; determinism empirically characterized; but Replay Verification never run, integrity unenforced, one version axis missing, old builds unarchived |
| Operational maturity | **Low** | No scheduling, no alerting, no production signal, no persisted verdicts, no dashboards — the PVW NOT READY verdict restated |
| **Overall** | **Medium — "measurement-grade, not operations-grade"** | The system can measure itself rigorously on demand; it cannot yet watch itself, and parts of what it measures are not durably recorded |

**Can this architecture be considered architecturally complete? — NO.**

Not "yes with minor debt," because two of the blockers sit at the definition of complete:

1. **The release-decision record does not exist** (T1/D1): gate verdicts — the artifact the whole
   quality platform exists to produce — are persisted nowhere structured. A conformance audit
   cannot call an architecture complete when its most consequential output is ephemeral.
2. **The production half of the architecture is unbuilt** (T2): PVW G1–G9 stand; the system's own
   §7 verdict (NOT READY) is unchanged and this audit re-confirms every gap it cites.
3. **Replay guarantees are partly promissory** (T3/T4/T6/T7): INV-07 fails for location-bearing
   reports the day the catalog changes; INV-17 has never been collected on; the insulation
   property protecting the gate from LLM variance is guarded by process text alone.
4. **Governance is practiced but unadopted and unenforced**: RFC-004 awaits formal adoption; none
   of its run-integrity invariants exist as tooling.
5. **Known contract violations remain open by explicit instruction** (D-narrow items 1–4): correct
   sequencing, but "deliberately not yet fixed" is still "not complete."

What this verdict is **not**: a finding of decay. Every blocker above was either discovered by the
system's own prior audits (and confirmed here), or created by explicit design-only instructions —
none is silent rot. The architecture knows what it is missing, in writing, with owners and
sequence. That is the strongest thing that can honestly be said of it today — and it is a
statement about governance quality, not completeness.

---

*End of Architecture Conformance Audit v1. Successor audits append as v2, never overwriting this
document. Produced with zero code changes; the two new findings (D1 gate-verdict persistence gap;
D5/DR4 flag drift) were verified by targeted read-only probes recorded in Part 1's evidence tags.*
