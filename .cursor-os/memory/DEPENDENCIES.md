# DEPENDENCIES

## Runtime (product)

- Next.js 16 / React 19 / TypeScript / Bun (dev)
- PostgreSQL 15 + pgvector / Prisma 6
- Redis, RabbitMQ, MinIO, Typesense 27.x
- worker-go, chat-service (Bun/Socket.io)

## Intake / AI (optional)

- Local llama-server / Gemma (`.env.local`)
- Hybrid flags: `NEED_INTAKE_HYBRID_ENABLED`, etc.
- Publish does **not** depend on these

## Doc / process dependencies

| Artifact | Depends on |
|----------|------------|
| Implementation | Approved RFC + memory boot |
| Architecture change | ADR Accepted |
| Phase N+1 | Phase N DoD + green tests |
| `/post` work | POST_SYSTEM_REPORT + ADR-0001 |

## Do not introduce without ADR

- New search authority for needs
- New publish authority
- Nest product APIs
- Cloud LLM as default prod publish path
