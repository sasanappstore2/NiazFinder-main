# 12 — Deployment & Local Ops

## Current truth

Evidence in-repo is **docker-compose local/dev stack** + Next on host. There is **no** authoritative in-repo multi-cloud production manifest as of OS v1. PLAN notes may mention pushing branches/PRs — hosting is external to this OS until documented.

**Do not invent** Kubernetes, Terraform, or vendor deploy steps.

---

## Local bring-up

```bash
# Infra
docker compose up -d
# Optional AI sidecars:
docker compose --profile ai up -d
# Optional Ollama:
docker compose --profile ai-docker up -d
# Avoid legacy unless needed:
# docker compose --profile legacy up -d

cp .env.example .env.local   # then edit — do not commit

npm run db:push              # or db:migrate
npm run db:seed:locations
npm run dev                  # predev ensures Typesense
# Chat: compose `chat` service and/or npm run dev:chat
```

---

## Ports (default host bindings)

| Service | Port |
|---------|-----:|
| Next app | 3000 |
| Postgres | 5432 |
| Redis | 6379 |
| MinIO | 9000 / 9001 |
| Typesense | 8108 |
| RabbitMQ | 5672 (+ management) |
| worker-go health | 8081 |
| chat-service | 3004 |
| gemma4-intake (ai) | per compose |
| Nest legacy | 3001 |

Prefer `127.0.0.1` binds as in compose.

---

## Env sources of truth

1. `.env.example` — committed template
2. `docs/ENV_MAP.md` — intake/Typesense/Rabbit commentary
3. Code readers for defaults (e.g. Typesense on unless false)

Never commit `.env` / `.env.local`.

---

## Typesense ops

```bash
npm run ensure:typesense   # also via predev
npm run sync:typesense     # full rebuild
```

Disable: `TYPESENSE_ENABLED=false` → Prisma browse.

---

## Worker / queues

```bash
docker compose up -d rabbitmq worker-go
```

Set `RABBITMQ_*` and enable flag when testing async paths.

---

## Rollback levers

| Lever | Action |
|-------|--------|
| Search | Disable Typesense |
| AI | Disable LLM/hybrid / rules-only |
| Chat | `NEXT_PUBLIC_CHAT_SOCKET_URL=off` |
| Legacy | Do not start `legacy` profile |
| App | Revert deploy at host; keep DB backups outside OS scope |

---

## Production checklist (generic — fill when host known)

- [ ] Secrets set (`INTERNAL_API_SECRET`, `CHAT_INTERNAL_SECRET`, …)
- [ ] `NEED_INTAKE_LLM_ENABLED=false` unless ADR says otherwise
- [ ] Typesense keyed + reindexed
- [ ] Postgres backups verified
- [ ] Smokes: `smoke:routes`, need-intake home parse, estate scenarios with LLM off
- [ ] Chat URL points at real gateway
- [ ] Super-admin phones/allowlists configured

---

## Target state

Document real hosting (Vercel/Fly/VPS/etc.) in this file when chosen via ADR — until then keep “unspecified”.
