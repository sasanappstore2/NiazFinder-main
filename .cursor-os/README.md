# NiazFinder Cursor Operating System

**Version:** 1.0  
**Location:** `/.cursor-os/`  
**Audience:** Cursor (and any coding agent) working in this repo

This is not a single mega-prompt. It is a **durable operating system**: short discovery rules, deep architecture docs, memory slots, ADR/RFC workflow, and a phased roadmap. Read the right subset for the task — never invent stack facts.

---

## Mandatory boot sequence (every non-trivial task)

Before writing code, changing schema, or proposing architecture:

1. Read **`.cursor-os/MISSION.md`** (Engineering Lead law — architecture > features).
2. Read **`.cursor-os/ARCHITECTURE_FREEZE_v1.md`** and **`.cursor-os/RED_LINES.md`**.
3. Read **this file** (`/.cursor-os/README.md`).
4. Read `/.cursor-os/00_MASTER_CHARTER.md` (role, halt conditions, gates).
5. Read **all** slots under `/.cursor-os/memory/` (minimum: CURRENT_STATE, VISION, GOALS, CONSTRAINTS, ARCHITECTURE, NEXT_PHASE, ANTI_PATTERNS).
6. Open `/.cursor-os/phases/SEQUENCE.md` — only the **active** phase.
7. Open `/.cursor-os/INDEX.md` and load the **read set** for the task type.
8. Read active ADRs; related RFC; for `/post` also `docs/POST_SYSTEM_REPORT.md`.
9. Prefer **code + Prisma + docker-compose + ENV_MAP** over outdated prose when docs conflict.

**SoT order:** POST_SYSTEM_REPORT → Constitution → RFC → ADR → **Freeze** → Current State → DB/Prisma/API/Types → Source Code (code wins).

**Trivial tasks** may skip deep OS reads — still respect **RED_LINES** and git rules.

---

## What this OS is for

| Goal | How |
|------|-----|
| Anti-drift | Architecture docs + ADRs + halt-on-conflict |
| Context recovery | `memory/` slots + INDEX read orders |
| Change control | ADR for irreversible / cross-cutting; RFC for multi-week design |
| Grounded work | Current truth sections cite real paths under `src/`, `prisma/`, `docs/` |
| Long horizon | `20_ROADMAP.md` phased backlog tied to reverse-marketplace flow |

---

## Product one-liner

NiazFinder (نیازفایندر) is a Persian **reverse marketplace**: users post a need (نیاز) in free text → intake structures it → businesses are matched → chat → proposal → review.

Flow: `home → /post → /n/{city} → matching/leads → chat → proposal → review`.

---

## Stack snapshot (current truth)

| Layer | Truth |
|-------|--------|
| App | Next.js 16 App Router + React 19 + TypeScript on **Bun**; APIs in `src/app/api/**/route.ts` |
| Legacy | NestJS in `mini-services/backend` — docker profile `legacy` only; do not extend as primary API |
| DB | PostgreSQL 15 + **pgvector**, Prisma; DB name `needfinder` |
| Search | Typesense **on by default**; Prisma fallback; **neighborhoods not indexed** |
| Queues | RabbitMQ + `worker-go` |
| Chat | `mini-services/chat-service` (Bun/Socket.io) on `:3004` |
| AI | Opt-in: LM Studio / local Gemma, docker `--profile ai` (`gemma4-intake`, `embed-tokenize`), `--profile ai-docker` (Ollama) |
| Intake default (prod docs) | Rules-first (`NEED_INTAKE_LLM_ENABLED=false`); hybrid/LLM local-opt-in |

Details: `03_ARCHITECTURE.md`, `07_TYPESENSE.md`, `06_AI_ENGINE.md`, `08_NEED_ENGINE.md`.

---

## File map

| Path | Role |
|------|------|
| `00_MASTER_CHARTER.md` | CTO role, gates, rollback, when to stop |
| `01_SYSTEM_RULES.md` | Anti-drift, hallucination prevention, decision trees |
| `02_MEMORY.md` | How to use `memory/` |
| `03_ARCHITECTURE.md` | System map |
| `04_DATABASE.md` | Prisma / Postgres / pgvector |
| `05_RULE_ENGINE.md` | Rules packs, thresholds, disambiguation |
| `06_AI_ENGINE.md` | Local LLM, hybrid, sidecars |
| `07_TYPESENSE.md` | Schema, sync, gaps, fallback |
| `08_NEED_ENGINE.md` | Intake pipeline, UX auto-apply |
| `09_RANKING.md` | Matching / leads |
| `10_PIPELINE.md` | Publish → browse → match → chat |
| `11_TESTING.md` | Gates and scripts |
| `12_DEPLOYMENT.md` | Docker / env / runbooks |
| `13_SECURITY.md` | Auth, secrets, RBAC |
| `14_MONITORING.md` | Telemetry, health |
| `15_ADR_GUIDE.md` | How to write ADRs |
| `16_RFC_GUIDE.md` | How to write RFCs |
| `17_CODE_STYLE.md` | Conventions |
| `18_GIT_RULES.md` | Commits / PR (aligned with user rules) |
| `19_SELF_REVIEW.md` | Pre-merge agent checklist |
| `20_ROADMAP.md` | Phased backlog |
| `memory/` | Durable short memory |
| `adr/` | Accepted / proposed decisions |
| `rfc/` | Design proposals |

---

## Discovery wiring

- Cursor rule: `.cursor/rules/cursor-os.mdc` (`alwaysApply: true`) — requires this README + INDEX for non-trivial work.
- Pointer: `CLAUDE.md` → **Cursor OS** section.

---

## Anti-hallucination (non-negotiable)

1. Do **not** invent deployed cloud infra, Kubernetes clusters, or SaaS that are not in `docker-compose.yml` / docs.
2. Separate **Current truth** vs **Target state** explicitly.
3. Typesense: no `neighborhood` field today — neighborhood filters use DB. Do not “fix” by adding a field without ADR + schema migration + reindex plan.
4. Category in Typesense = **occupation slug arrays** from `BusinessProfile.categorySlugs`, not free-text Persian labels.
5. Legal data connectors only — never guide illegal scraping. Frame Divar-like scripts as **allowed-source connectors / fixtures** under policy.
6. When uncertain: read code, then ask — do not guess env defaults.

---

## How to update this OS

- Factual corrections: edit the relevant numbered file + note in `memory/CURRENT_STATE.md`.
- Behavioral / architectural shifts: open or amend an **ADR**; large multi-phase work → **RFC**.
- Keep files dense; prefer checklists and decision trees over narrative essays.
- v1 is intentionally incomplete in edge ops (full SRE runbooks, multi-region) — expand when those become real.

---

## Quick start for agents

```text
Task: "fix Typesense neighborhood filter"
→ README → Charter → INDEX (search task) → 07_TYPESENSE + 04_DATABASE
→ memory/OPEN_DECISIONS → halt if adding index field without ADR
```

```text
Task: "tune intake category confidence"
→ README → Charter → INDEX (intake) → 05_RULE_ENGINE + 08_NEED_ENGINE + 06_AI_ENGINE
→ cite RULES_DISAMBIG_MIN_CONFIDENCE (0.85) in src/intake/rules/config.ts
```
