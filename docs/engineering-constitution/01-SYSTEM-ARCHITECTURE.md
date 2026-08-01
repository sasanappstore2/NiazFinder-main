# System architecture

**Status:** Blueprint v1 · Current truth vs Target labeled  
**Constitution:** [00-ENGINEERING-CONSTITUTION.md](./00-ENGINEERING-CONSTITUTION.md)

---

## 1. Product spine

```
home → /post (Need Understanding) → marketplace /n/{city}
  → matching / leads → chat → proposal → review
```

NiazFinder is a **reverse marketplace**: needs are first-class; listings are structured projections of understanding — not ad inventory.

---

## 2. Runtime topology (Current truth)

| Component | Role | Location |
|-----------|------|----------|
| Next.js 16 App Router | UI + **primary API** (`src/app/api`) | root app |
| PostgreSQL 15 + pgvector | System of record | docker `postgres` |
| Prisma 6 | ORM | `prisma/schema.prisma` |
| Redis | cache / queues helpers | docker |
| Typesense | **business browse** search | docker; on unless `TYPESENSE_ENABLED=false` |
| RabbitMQ + worker-go | async jobs | docker |
| chat-service (Bun/Socket.io) | realtime chat | `mini-services/chat-service` |
| Local LLM (optional) | hybrid intake assist | llama-server / Ollama / `ai` profile |
| NestJS backend | **legacy** | `mini-services/backend` — do not add new product APIs here |

`npm run predev` → `ensure:typesense` keeps search up for local runs.

---

## 3. Layered logical architecture (Target)

```
┌─────────────────────────────────────────────────────────┐
│ L6 Presentation  (UI only — no AI calls)                │
├─────────────────────────────────────────────────────────┤
│ L5 Dynamic Schema (templates, required, conditionals)   │
├─────────────────────────────────────────────────────────┤
│ L4 Draft (NeedDraft, merge, locks, history)             │
├─────────────────────────────────────────────────────────┤
│ L3 Validation (schema, rules, confidence, anti-halluc.) │
├─────────────────────────────────────────────────────────┤
│ L2 Knowledge (registries, ontology, embeddings, search) │
├─────────────────────────────────────────────────────────┤
│ L1 Need Understanding (agent stages, prompts, extract)  │
└─────────────────────────────────────────────────────────┘
         │                         │
         ▼                         ▼
   Postgres/Prisma           Typesense / vector / files
```

**Dependency rule:** lower layers never import Presentation. Presentation never imports model clients.

---

## 4. Bounded contexts

| Context | Owns | Must not own |
|---------|------|--------------|
| Need Intelligence | understanding, draft, publish gate | payment UI |
| Knowledge & Search | registries, Typesense sync, RAG | draft merge |
| Matching & Leads | candidate ranking, lead fees | intake prompts |
| Communication | chat, proposals | category ontology |
| Trust & Admin | moderation, RBAC | field extraction |
| Identity | auth, sessions | need parsing |

---

## 5. Data principles

1. **NeedDraft** is the structured mirror of understanding (see `docs/INTAKE_NEED_DRAFT.md`).
2. User locks beat AI/rules soft-fills.
3. Intelligence draft beats smart-extract proposals for authoritative entities (merge policy).
4. Browse search may use Typesense; **neighborhood filters use DB** until RFC-0002 ships.
5. Publish validator ignores LLM health.

---

## 6. Integration style

- Prefer explicit function calls / queues over hidden Prisma middleware side effects.
- External data: **legal connectors only** (generic ingest; no illegal scrape guidance).
- Feature flags via env (`docs/ENV_MAP.md`); document Current vs Target when flags differ by environment.

---

## 7. Evolution

Architecture changes that alter layer boundaries, publish authority, or search source-of-truth require **ADR**. Multi-quarter shifts require **RFC** then phased migration ([05-MIGRATION-STRATEGY.md](./05-MIGRATION-STRATEGY.md)).
