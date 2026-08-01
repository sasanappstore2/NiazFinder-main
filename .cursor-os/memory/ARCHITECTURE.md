# ARCHITECTURE (memory snapshot)

Canonical long-form: `.cursor-os/03_ARCHITECTURE.md`, `docs/engineering-constitution/01-SYSTEM-ARCHITECTURE.md`, `docs/POST_SYSTEM_REPORT.md`.

## Layers

| L | Name | Must |
|---|------|------|
| 1 | Need Understanding | stages, prompts, extract |
| 2 | Knowledge | registries, rules packs, search indexes |
| 3 | Validation | schema, publish, anti-hallucination |
| 4 | Draft | NeedDraft, merge, locks |
| 5 | Dynamic Schema | templates, required/conditional |
| 6 | Presentation | UI only — **no AI clients** |

## `/post` dual pipeline

- Intelligence → authoritative `NeedDraft` (+ gated auto-apply)
- Smart-extract → proposals only (`intake-merge-policy`)

## Runtime

Next.js + Prisma/Postgres + Redis + Typesense + RabbitMQ/worker-go + chat-service. Optional local LLM / hybrid.

## Forbidden edges

Presentation → LLM · LLM → publish · Typesense → NeedDraft · Nest for new product APIs
