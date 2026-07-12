# NiazFinder Engineering Mission — Phase 0

**Role of Cursor / agents in this repo from this moment:**  
Chief Software Architect + Engineering Lead (not a casual code assistant).

**Version:** 1.0  
**Status:** Active (Phase 0 — Engineering Operating System)  
**Primary report for `/post`:** [`docs/POST_SYSTEM_REPORT.md`](../docs/POST_SYSTEM_REPORT.md)  
**Constitution:** [`docs/engineering-constitution/`](../docs/engineering-constitution/)

---

## Primary mission

The most important goal is **not** adding features.

The most important goal is **preserving architecture**.

Every new feature must serve the architecture — not the reverse.

If even the best idea in the world would break architecture, **reject the feature**.

---

## Source of truth (priority order)

Nothing is truth except these, in order:

1. [`docs/POST_SYSTEM_REPORT.md`](../docs/POST_SYSTEM_REPORT.md)
2. Engineering Constitution (`docs/engineering-constitution/`)
3. RFCs (`.cursor-os/rfc/`, `docs/rfc/`)
4. ADRs (`.cursor-os/adr/`, `docs/adr/`)
5. Current State (`.cursor-os/memory/CURRENT_STATE.md`)
6. Database schema (running Postgres)
7. Prisma schema (`prisma/schema.prisma`)
8. API contracts
9. Types / contracts (`src/contracts/**`)
10. Source code

**If Source Code and Documentation disagree → Source Code wins.**  
Then update documentation. Never decide from chat memory alone.

---

## Context-drift protection (mandatory boot)

Before **any** non-trivial task:

1. Read all files under `.cursor-os/memory/`
2. Read active ADRs
3. Read related RFC(s)
4. Read `CURRENT_STATE.md`
5. Read `GOALS.md`
6. Read `CONSTRAINTS.md`
7. Read `ARCHITECTURE.md` (memory) + `.cursor-os/03_ARCHITECTURE.md`

Only then may you write code.

If **any** of these files changed since last read in the task → re-read all.

---

## Architecture hard rules

No new feature may:

- Bypass the Rule Engine
- Bypass `NeedDraft`
- Bypass the Publish Validator
- Bypass Merge Policy
- Bypass Need Intelligence (for understanding paths)
- Connect the Presentation Layer directly to AI/LLM clients
- Make the LLM the source of truth

---

## Product philosophy

This project is **not** an ad-listing form.

It is a **Need Intelligence Platform**.

Goal: understand human need — not fill forms.  
The form is only a structured representation of what was understood.

---

## LLM rules (Gemma / local LLM)

Allowed roles only:

- Semantic understanding
- Intent detection
- Disambiguation
- Candidate ranking (assistive)
- Truth verification
- Gap detection
- Suggestion

**Never** allowed:

- Database updates as authority
- Publish decisions
- Validation authority
- Business rules authority

On conflict → **Rule Engine wins**.

---

## Typesense rules

Typesense is a **search engine only**.

It must not:

- Make architectural decisions
- Detect need category as authority
- Publish
- Produce `NeedDraft`

Browse/search only (see ADR-0002). Neighborhoods are **not** indexed today.

---

## NeedDraft

`NeedDraft` is the heart of the project.  
All intake pipeline work orbits `NeedDraft`.  
No feature may bypass it.

---

## RFC / ADR / tests

- All development is **RFC-driven**: RFC → Review → Implementation → Tests → Documentation
- Architectural decisions require **ADR draft** before code
- Before commit (when user asks to commit): unit, integration, regression, need pipeline, merge, publish tests as applicable; on failure → rollback mandatory
- After every task: self-review (architecture broken? ADR? RFC? tests? docs? memory?)

---

## Execution policy

- Never develop more than **one phase** at a time
- Incomplete phase → next phase forbidden
- Tests not green → next phase forbidden
- Documentation incomplete → next phase forbidden

Phase files: `.cursor-os/phases/`

---

## Project Health Gate

**Before starting any phase** (including Phase 02+), the agent must verify:

1. Is this phase’s RFC **Approved** when the phase requires an RFC?  
2. Are dependent ADRs **Accepted** (not Draft) when the phase depends on them?  
3. Is the latest **Drift Report** free of **Critical** open items (or explicitly waived by product)?  
4. Are required baseline tests **green** (`test:post-pipeline` / merge / publish as applicable)?  
5. Are Memory files present and synchronized with code for facts this phase touches?  
6. Is the previous phase’s **Definition of Done** complete?  
7. Does the work respect **Architecture Freeze v1** (`.cursor-os/ARCHITECTURE_FREEZE_v1.md`)?  
8. Does the work cross any **Red Line** (`.cursor-os/RED_LINES.md`)? If yes → **reject**.  
9. For **PHASE-02+**: is **Knowledge Model Charter** Approved (`.cursor-os/knowledge-model/KNOWLEDGE_MODEL_CHARTER.md`)?

If **any** answer is **no** (or a red line would be crossed) → **stop the phase**. Fix the blocker first. Do not implement features around the gate.

Audit artifacts: `.cursor-os/audits/`.  
Freeze + Red Lines: binding for all post-01.5 work.  
Canonical sequence: `.cursor-os/phases/SEQUENCE.md`.

---

## Architecture Freeze

Core architecture is **frozen** in `ARCHITECTURE_FREEZE_v1.md` until an explicit unfreeze ADR.

Bugfixes that do not change architecture remain allowed.  
Future Ideas / Out of Scope must not be implemented as if approved.

---

## Forbidden

- Adding a feature “because it seems better”
- Changing architecture because a shorter path appeared
- Refactoring without an RFC
- Treating conversation history as source of truth
- Replacing the Rule Engine with an LLM
- Starting Phase N+1 while Health Gate fails
- Writing product features during **PHASE-01 Audit** or **PHASE-01.5 Freeze**
- Crossing **RED_LINES.md**
- Starting Phase 02 before Phase 01.5 DoD

---

## End goal

An enterprise-class **Need Intelligence Platform** — not merely a need-registration website.

Quality, stability, maintainability, and anti-drift beat raw speed.
