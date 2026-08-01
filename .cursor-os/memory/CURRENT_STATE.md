# Memory — Current State

Short durable facts. Append dated sections; strike obsolete lines.

---

### 2026-07-12 — RFC-0004 Compose Auto-Apply Discipline (Accepted + shipped)

- Audit 09 C1–C2 + H1–H5 + M2/M3/M4 remediated under Freeze (refuse-to-write, no chip theater)
- Key module: `src/lib/need-intake/compose-auto-apply.ts`
- Regression green: compose-auto-apply, calm-ux, location-priority, merge-policy, rules-disambig 6/6, post-pipeline 153/153
- Loop ticks: `.cursor-os/audits/11-COMPOSE-LOOP-TICK.md`

### 2026-07-12 — Knowledge Model Charter APPROVED

- Charter **Accepted**; principle: Knowledge Layer = **World Model, not Decision Engine**
- Added `KNOWLEDGE_LIFECYCLE.md` + `KNOWLEDGE_EVIDENCE_CHAIN.md`
- PHASE-02 open for **Design → RFC only** (no implementation until RFC Approved)

### 2026-07-12 — Knowledge Model Charter (draft)

- ~~draft~~ → superseded by APPROVED entry above
- Architecture Freeze: **human-confirmed**

### 2026-07-12 — Phase 01.5 Architecture Freeze (NOW)

- `ARCHITECTURE_FREEZE_v1.md` — core principles immutable until unfreeze ADR
- `RED_LINES.md` — absolute agent prohibitions
- Sequence: 00 → 01 → 01.5 → 02 Knowledge → 03 Need Engine → 04 Rule Engine → 05 Hybrid AI
- Freeze **approved** by product; Phase 02 still gated on Knowledge Charter

### 2026-07-12 — Phase 01 Project Audit (in progress → closing)

- PHASE-01 redefined as **audit-only** (no features)
- Mission: **Project Health Gate** added
- Audits published: `.cursor-os/audits/01`…`08` + README
- Critical drift closed: ARCHITECTURE_INDEX postgres; OS docs no longer claim live ambiguity prompts
- Score ~81 overall; Risk Medium→improving; merge-policy test OK

### 2026-07-12 — Phase 00 Engineering OS (in progress → completing)

- Mission law: `.cursor-os/MISSION.md`
- Memory slots: Vision/Goals/Constraints/Decisions/Architecture/Roadmap/Todo/Done/KnownIssues/AntiPatterns/Lessons/NextPhase/OpenQuestions/SystemMap/Dependencies (+ prior CURRENT/OPEN_DECISIONS/KNOWN_FAILURES)
- Phases: `.cursor-os/phases/PHASE-00` … `PHASE-27` + README
- ADR-0006 Draft: Mission governance
- Cursor rule updated for Mission boot + SoT

### 2026-07-12 — Engineering Constitution v1 (draft)

- Pack: `docs/engineering-constitution/` + skill `.cursor/skills/niazfinder-engineering-constitution`
- Status: **awaiting approval** — no large architecture/AI implementation until signed
- Roles: Claude Code = Chief Architect; Cursor = Implementation Engineer (Mission reinforces)
- Vision: AI-first Need Intelligence (not ads / not form-first)

### 2026-07-12 — Cursor OS v1 seeded

- OS lives at `/.cursor-os/`; discovery via `.cursor/rules/cursor-os.mdc` + `CLAUDE.md` pointer
- Product spine: need intake → publish → `/n/{city}` → match/leads → chat → proposal
- `/post` master report: `docs/POST_SYSTEM_REPORT.md` (**SoT #1** for intake)

### 2026-07-12 — Stack truth

- Next.js App Router owns APIs; Nest in `mini-services/backend` is **legacy** profile only
- Postgres+pgvector via Prisma; DB `needfinder` — **not** sqlite
- Schema model/enum counts: **recount** `prisma/schema.prisma` (≈75 models / ≈31 enums; CLAUDE.md may lag at 63/25)
- Docker default: postgres, redis, minio, typesense, rabbitmq, worker-go, chat
- Profiles: `ai` (gemma4-intake, embed-openai), `ai-docker` (ollama), `legacy` (Nest/frontend/caddy)

### 2026-07-12 — Typesense

- **On by default**; `TYPESENSE_ENABLED=false` forces Prisma browse fallback
- `predev` → `ensure:typesense`
- Category field = occupation **slug arrays** from `categorySlugs`
- **Neighborhoods not indexed** — DB filter path; parity test `test:neighborhood-filter-parity`

### 2026-07-12 — Intake

- Prod posture docs: rules-first, `NEED_INTAKE_LLM_ENABLED=false`
- Local often enables hybrid/LLM via `.env.local` (do not assume = prod)
- Category auto-apply / chips gate: **≥ 0.85** (`RULES_DISAMBIG_MIN_CONFIDENCE`)
- Auto-apply in background without mandatory confirmation chips for high-confidence category
- Audit loop (2026-07-12): hybrid-golden 54/54; post-pipeline 153/153 — see `PLAN/cursor-report-audit-loop-complete.md` (may lag branch)

### 2026-07-12 — Matching / chat

- Need→business rank: deterministic rules (`src/lib/need-match/rank-businesses.ts`)
- Chat gateway: Bun Socket.io `mini-services/chat-service` default `:3004`
