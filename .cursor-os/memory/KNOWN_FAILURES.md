# Memory — Known Failures & Footguns

Append dated entries. Include mitigation.

---

### 2026-07-12 — CLAUDE.md Prisma counts may lag

- **Symptom:** Docs say 63 models / 25 enums
- **Truth:** Recount from `prisma/schema.prisma` (observed ≈75 / ≈31)
- **Mitigation:** Trust schema; patch CLAUDE when touching that section

### 2026-07-12 — Sqlite mentions in old docs

- **Symptom:** Some older docs imply sqlite
- **Truth:** Postgres 15 + pgvector
- **Mitigation:** Ignore sqlite; fix docs when encountered

### 2026-07-12 — Typesense “off by default” stale mental model

- **Symptom:** Agents disable search unnecessarily
- **Truth:** On unless `TYPESENSE_ENABLED=false`; predev ensures container
- **Mitigation:** Read `07_TYPESENSE.md` / `docs/TYPESENSE_SYNC.md`

### 2026-07-12 — Neighborhoods expected in Typesense

- **Symptom:** Broken or empty results when filtering neighborhoods via search index assumptions
- **Truth:** Not in collection schema; DB path
- **Mitigation:** Use browse geo filters + parity test; ADR before indexing

### 2026-07-12 — Local `.env.local` ≠ prod ENV_MAP

- **Symptom:** “LLM works locally so prod must be hybrid”
- **Truth:** Prod launch posture rules-only; local may enable Gemma/hybrid
- **Mitigation:** Always state which env; don’t commit local flags as product defaults

### 2026-07-12 — Dual intake trees

- **Symptom:** Editing backup or shadow engines without affecting `/post`
- **Truth:** Live path `src/intake/` + `src/lib/need-intake/`; backups under `src/intake.backup.*`
- **Mitigation:** Trace from API/UI; don’t import backup tree

### 2026-07-12 — Nest as “the backend”

- **Symptom:** New features added under `mini-services/backend`
- **Truth:** Legacy profile only; Next `src/app/api` is primary
- **Mitigation:** ADR-0003; reject Nest-first feature work
