# Cursor OS — Index & Read Orders

Use this file after `README.md` + `00_MASTER_CHARTER.md`. Load only the files listed for the task type (plus always memory slots).

---

## Always (non-trivial tasks)

| Order | File |
|------:|------|
| 0 | `MISSION.md` + `ARCHITECTURE_FREEZE_v1.md` + `RED_LINES.md` |
| 1 | `README.md` |
| 2 | `00_MASTER_CHARTER.md` |
| 3 | `memory/` (all slots; esp. CURRENT_STATE, GOALS, CONSTRAINTS, ARCHITECTURE, NEXT_PHASE, ANTI_PATTERNS) |
| 4 | Active ADRs + related RFC |
| 5 | `phases/` active phase only (`NEXT_PHASE.md`) |
| 6 | This `INDEX.md` → pick a pack below |
| 7 | `/post` work → `docs/POST_SYSTEM_REPORT.md` |

Also skim `memory/KNOWN_ISSUES.md` / `KNOWN_FAILURES.md` if debugging.

---

## Glossary (product terms)

| Persian | English | Notes |
|---------|---------|--------|
| نیاز | Need | User-posted demand (`ServiceRequest` / need listing) |
| محله | Neighborhood | Location leaf; **not** in Typesense today |
| شهر / استان | City / Province | Faceted in Typesense |
| رهن / اجاره | Deposit / Rent | Estate transaction fields |
| کسب‌وکار | Business | `BusinessProfile` |
| پیشنهاد | Proposal | Business offer on a need |
| دسته / شغل | Category / Occupation | Intake category vs business occupation slugs |

---

## Read packs by task type

### A — Need intake / `/post` / parsing accuracy

| Priority | File | Why |
|----------|------|-----|
| P0 | `08_NEED_ENGINE.md` | Pipeline, auto-apply, UX |
| P0 | `05_RULE_ENGINE.md` | Thresholds, packs, disambig |
| P1 | `06_AI_ENGINE.md` | Hybrid / LLM flags |
| P1 | `11_TESTING.md` | `test:post-pipeline`, hybrid-golden, gates |
| P2 | `adr/ADR-0001-rules-first-intake.md` | Decision baseline |
| Code | `src/intake/`, `src/lib/need-intake/`, `src/components/need-intake/` | |

**Halt if:** changing publish validation without running publish/parity tests; lowering category auto-apply below 0.85 without ADR.

---

### B — Typesense / business browse search

| Priority | File | Why |
|----------|------|-----|
| P0 | `07_TYPESENSE.md` | Schema, sync, gaps |
| P1 | `04_DATABASE.md` | Profile fields / fallback |
| P1 | `docs/TYPESENSE_SYNC.md` (repo) | Sync call sites |
| P2 | `adr/ADR-0002-typesense-browse-with-prisma-fallback.md` | |
| Code | `src/lib/search/typesense-*.ts`, `src/lib/business/load-profile.ts`, browse API | |

**Halt if:** inventing a Typesense `neighborhood` field without ADR + reindex plan.

---

### C — Matching / leads / ranking / VIP broadcast

| Priority | File | Why |
|----------|------|-----|
| P0 | `09_RANKING.md` | Rules ranking, fees |
| P1 | `10_PIPELINE.md` | Lead → chat phases |
| P1 | `04_DATABASE.md` | Outreach / wallet models |
| Code | `src/lib/need-match/`, `src/lib/smart-matching/`, `src/lib/need-leads/` | |

---

### D — Database / Prisma / migrations

| Priority | File | Why |
|----------|------|-----|
| P0 | `04_DATABASE.md` | |
| P1 | `13_SECURITY.md` | PII, secrets |
| P1 | `15_ADR_GUIDE.md` | Schema ADRs |
| Code | `prisma/schema.prisma` | **Source of truth for model counts** |

**Halt if:** sqlite assumptions; writing Nest-only schema paths.

---

### E — AI / LLM / Gemma / Ollama / embeddings

| Priority | File | Why |
|----------|------|-----|
| P0 | `06_AI_ENGINE.md` | |
| P1 | `05_RULE_ENGINE.md` | Rules remain publish authority |
| P1 | `docs/ENV_MAP.md` (repo) | Flag matrix |
| P2 | `adr/ADR-0001-rules-first-intake.md` | |

**Halt if:** enabling cloud LLM in prod without security review; removing rules path.

---

### F — Chat / Socket.io / realtime

| Priority | File | Why |
|----------|------|-----|
| P0 | `03_ARCHITECTURE.md` (chat section) | |
| P1 | `10_PIPELINE.md` | |
| P1 | `13_SECURITY.md` | `CHAT_INTERNAL_SECRET` |
| Code | `mini-services/chat-service/`, `src/lib/chat-socket*.ts`, `src/lib/chat/` | |

---

### G — Security / auth / RBAC / admin

| Priority | File | Why |
|----------|------|-----|
| P0 | `13_SECURITY.md` | |
| P1 | `18_GIT_RULES.md` | No secrets in commits |
| Code | `src/lib/auth*`, `src/lib/rbac/`, middleware | |

---

### H — Testing / CI / quality gates

| Priority | File | Why |
|----------|------|-----|
| P0 | `11_TESTING.md` | |
| P1 | `19_SELF_REVIEW.md` | |
| P1 | Domain file for the area under test | |

---

### I — Deployment / Docker / env

| Priority | File | Why |
|----------|------|-----|
| P0 | `12_DEPLOYMENT.md` | |
| P1 | `03_ARCHITECTURE.md` | Profiles |
| P1 | `docs/ENV_MAP.md` (repo) | |

**Current truth:** local docker-compose stack; do not invent K8s unless docs later add it.

---

### J — Architecture change / cross-cutting refactor

| Priority | File | Why |
|----------|------|-----|
| P0 | `00_MASTER_CHARTER.md` | Gates |
| P0 | `15_ADR_GUIDE.md` + existing `adr/` | |
| P0 | `16_RFC_GUIDE.md` | If multi-week |
| P1 | `03_ARCHITECTURE.md` | |
| P1 | `01_SYSTEM_RULES.md` | Anti-drift |
| P2 | `20_ROADMAP.md` | Fit to phases |

**Halt if:** reintroducing Nest as primary API; dual-write without ADR.

---

### K — Docs / OS maintenance

| Priority | File | Why |
|----------|------|-----|
| P0 | `README.md`, this INDEX | |
| P1 | `02_MEMORY.md` | |
| P1 | Touched domain files | |
| Rule | Prefer correcting Current truth over expanding Target state | |

---

### L — Data connectors / import / “Divar-style” fixtures

| Priority | File | Why |
|----------|------|-----|
| P0 | `01_SYSTEM_RULES.md` (legal connectors) | |
| P1 | `08_NEED_ENGINE.md` | Fixture use |
| P1 | `13_SECURITY.md` | |
| Framing | **Generic legal data connector** for allowed sources only — no scrape-illegal guidance | |

---

### M — Frontend UI (intake / marketplace pages)

| Priority | File | Why |
|----------|------|-----|
| P0 | `17_CODE_STYLE.md` | RTL Persian UI, English code |
| P1 | Domain file (`08` for intake, `10` for marketplace) | |
| P1 | Existing design system in `src/components/` | Preserve patterns |

---

### N — Git / PR / commit hygiene

| Priority | File | Why |
|----------|------|-----|
| P0 | `18_GIT_RULES.md` | No commit unless asked |
| P1 | `19_SELF_REVIEW.md` | Before PR |

---

## Full TOC (numbered)

| # | File | Topic |
|---|------|--------|
| 00 | `00_MASTER_CHARTER.md` | CTO charter |
| 01 | `01_SYSTEM_RULES.md` | Operating rules |
| 02 | `02_MEMORY.md` | Memory protocol |
| 03 | `03_ARCHITECTURE.md` | Architecture |
| 04 | `04_DATABASE.md` | Database |
| 05 | `05_RULE_ENGINE.md` | Rules engine |
| 06 | `06_AI_ENGINE.md` | AI engine |
| 07 | `07_TYPESENSE.md` | Typesense |
| 08 | `08_NEED_ENGINE.md` | Need intake |
| 09 | `09_RANKING.md` | Ranking / match |
| 10 | `10_PIPELINE.md` | End-to-end pipeline |
| 11 | `11_TESTING.md` | Testing |
| 12 | `12_DEPLOYMENT.md` | Deployment |
| 13 | `13_SECURITY.md` | Security |
| 14 | `14_MONITORING.md` | Monitoring |
| 15 | `15_ADR_GUIDE.md` | ADR guide |
| 16 | `16_RFC_GUIDE.md` | RFC guide |
| 17 | `17_CODE_STYLE.md` | Code style |
| 18 | `18_GIT_RULES.md` | Git rules |
| 19 | `19_SELF_REVIEW.md` | Self review |
| 20 | `20_ROADMAP.md` | Roadmap |

---

## Decision: which pack when ambiguous

```
touches intake text / confidence / wizard?     → A
touches business search / Typesense?           → B
touches leads / match score / wallet fee?      → C
touches schema.prisma / migrations?            → D
touches LLM flags / Gemma / Ollama?            → E
touches socket / messages / voice call?        → F
touches auth / admin / secrets?                → G
"make CI green" / add self-test?               → H
docker / env / ports?                          → I
new subsystem or reverse prior ADR?            → J
import external listing text?                  → L
```
