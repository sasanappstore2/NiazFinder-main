# CONSTRAINTS

Hard constraints. Violating these requires an ADR (and usually an RFC) — never a silent PR.

## Authority

1. Rule Engine > LLM on conflict
2. `publishValidator` is publish authority
3. Merge policy + user locks beat soft AI fills
4. `NeedDraft` is mandatory for intake pipeline
5. Source code wins doc conflicts; then fix docs

## Product / UX

- Understanding-first; forms generated from understanding
- Category UI/auto-apply confidence floor: **≥ 0.85**
- No mandatory verification/gap/location-ambiguity chip theater on compose (see POST_SYSTEM_REPORT)
- Publish must work with LLM offline

## Stack

- New APIs only in Next.js `src/app/api/**` (Nest = legacy)
- Postgres + Prisma (not sqlite)
- Typesense = business browse search only; no neighborhood field today
- LLM (Gemma/local) assistive only — no DB/publish/validation authority

## Process

- RFC → Review → Implement → Test → Document
- One phase at a time; tests + docs green before next phase
- No commit unless user asks; on test failure → rollback
- Do not invent architecture; follow Mission + Constitution + ADR/RFC

## Legal

- Data connectors must be legal/consented only
