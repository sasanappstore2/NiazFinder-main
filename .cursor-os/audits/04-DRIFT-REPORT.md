# Audit 04 — Drift Report

**Date:** 2026-07-12  
**Phase:** PHASE-01  
**Rule:** Code wins; docs must be fixed or marked Target.

Severity: **Critical** = wrong SoT that can cause bad implementation · **High** = misleading · **Medium/Low** = stale wording

---

## Critical

| ID | Sources disagree | Reality (code) | Action |
|----|------------------|----------------|--------|
| DR-C1 | `docs/ARCHITECTURE_INDEX.md` claimed Prisma **sqlite** | `prisma/schema.prisma` → `provider = "postgresql"` | **Fixed in this audit** |
| DR-C2 | Cursor OS implied live **location ambiguity prompt** | Live `NeedIntakePanel` does **not** mount ambiguity/verify/gap prompts | **Fixed** in 01/05/08/10 OS docs this audit |

---

## High

| ID | Drift | Reality | Action |
|----|-------|---------|--------|
| DR-H1 | Engineering Constitution **draft / unapproved** vs agents treating it as binding law | Mission + Constitution both active as vision; approval table empty | Product sign-off or mark “operative draft” |
| DR-H2 | ADR-0006 Mission governance still **Draft** | Mission already wired in Cursor rule | Accept ADR-0006 or waive explicitly |
| DR-H3 | Local `.env.local` hybrid/LLM vs ENV_MAP prod “LLM off” | Two environments | Always label Current vs Target; never assume |
| DR-H4 | CLAUDE.md model/enum counts may lag | Prisma ≈ **75 models / 31 enums** | Recount in CLAUDE when convenient |

---

## Medium

| ID | Drift | Reality | Action |
|----|-------|---------|--------|
| DR-M1 | `.cursor-os/10_PIPELINE.md` “ambiguity prompts” as gates | Compose UX is auto-apply + form correction | Update pipeline doc |
| DR-M2 | KI-02 / `08_NEED_ENGINE` ambiguity wording | Same as DR-C2 | Update Need Engine doc |
| DR-M3 | Two ADR-001 locations (`docs/adr/001` vs `.cursor-os/adr/ADR-0001`) | Same decision, dual homes | Cross-link; avoid contradictory edits |
| DR-M4 | Constitution “no large AI impl until approved” vs local hybrid already on | Local experimentation ≠ prod | Document in CURRENT_STATE (done) |

---

## Low / Info

| ID | Note |
|----|------|
| DR-L1 | `/post/[id]` social vs intake naming |
| DR-L2 | Typesense “off by default” mental model — code/env now default on |
| DR-L3 | Backup trees still under `src/` |

---

## Critical open after this audit

- **None.** DR-C1 and DR-C2 closed (docs aligned to code).
- Remaining **High**: unsigned Constitution / ADR-0006 — governance, not code drift.

**Health Gate:** Critical drift clear. Phase 02+ still needs prior DoD + tests + RFC/ADR rules per Mission.

---

## Patch list (doc-only, this phase)

- [x] ARCHITECTURE_INDEX sqlite → postgresql  
- [x] `.cursor-os/01_SYSTEM_RULES.md` ambiguity row  
- [x] `.cursor-os/05_RULE_ENGINE.md` UI prompt claim  
- [x] `.cursor-os/10_PIPELINE.md` gates line  
- [x] `.cursor-os/08_NEED_ENGINE.md` location ambiguity row  
