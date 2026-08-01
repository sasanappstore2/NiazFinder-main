# Memory — Open Decisions

Remove or move to ADR when resolved.

---

### OD-20260712-01 — Typesense neighborhoods

- **Question:** Permanently keep neighborhood filters on Prisma, or add Typesense field?
- **Options:** A) DB-only (status quo) · B) Index neighborhood ids/slugs (ADR + reindex)
- **Blocks:** Phase 08 roadmap; geo browse performance work
- **Links:** `07_TYPESENSE.md`, `docs/TYPESENSE_SYNC.md`

### OD-20260712-02 — Production LLM policy long-term

- **Question:** Remain rules-only in production indefinitely, or schedule hybrid cutover?
- **Options:** A) Rules-only prod (ENV_MAP) · B) Shadow hybrid → gated cutover (ADR)
- **Blocks:** Phase 21
- **Links:** `06_AI_ENGINE.md`, `docs/ENV_MAP.md`, ADR-0001

### OD-20260712-03 — Hosting / deploy source of truth

- **Question:** Where is production hosted and what is the deploy pipeline?
- **Options:** Document real host when known — do not invent
- **Blocks:** Phase 29; `12_DEPLOYMENT.md` target section
- **Links:** PLAN deploy notes (PR-oriented only)

### OD-20260712-04 — Legal data connector productization

- **Question:** First-class allowed-source connector vs fixtures-only forever?
- **Options:** A) Fixtures/stress only · B) Partner/export connector API (RFC)
- **Constraints:** No illegal scrape guidance
- **Links:** `01_SYSTEM_RULES.md`, Phase 23, `rfc/RFC-0001-legal-data-connectors.md`
