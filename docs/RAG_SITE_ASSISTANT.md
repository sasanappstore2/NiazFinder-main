# Site-wide RAG (Platform AI Assistant)

Durable vector RAG for the platform chat assistant (`دستیار نیازفایندر`).

## What is indexed

| Source | Storage | Visibility |
|--------|---------|------------|
| Public needs | `ServiceRequest.searchEmbedding` | `APPROVED` + `PUBLIC` + `OPEN/IN_PROGRESS` |
| Active businesses | `BusinessProfile.searchEmbedding` | `ACTIVE` + user `isActive` |
| Site knowledge | `site_knowledge_chunks` | allowlisted public docs only |

Durable jobs live in `rag_index_jobs` and are drained by:

```bash
# CLI
npm run rag:process

# Cron / supervisor
curl -X POST http://localhost:3000/api/internal/rag/process \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":20}'
```

Lag/health:

```bash
curl http://localhost:3000/api/internal/rag/process \
  -H "x-internal-secret: $INTERNAL_API_SECRET"
```

## Backfill

Requires Docker service `embed-intake` (`EMBED_LLM_URL`, default `http://127.0.0.1:8102`) and migration applied.

```bash
# Option A: Docker (needs models/EMBED GGUF + successful image build)
docker compose --profile ai up -d embed-intake

# Option B (recommended on Mac if Docker build fails): local uvicorn + Ollama
# requires: ollama pull qllama/multilingual-e5-small
cd mini-services/embed-intake
EMBED_BACKEND=ollama EMBED_MODEL_ID=qllama/multilingual-e5-small EMBED_PORT=8102 \
  uvicorn app.main:app --host 127.0.0.1 --port 8102
npm run db:generate
# apply migration 20260713120000_site_wide_rag
npm run rag:backfill            # knowledge + businesses + needs
npm run rag:index:knowledge     # knowledge only
npm run rag:embed:businesses
npm run rag:embed:needs
npm run rag:enqueue             # enqueue jobs without embedding inline
npm run rag:process             # drain queue
```

## Auto-update hooks

- Business create/update/onboarding/categories/offers/moderation/user status → Typesense + `RagIndexJob(BUSINESS)`
- Need publish (auto-approve), moderation approve/reject, unpublish/delete, VIP `PRIVATE→PUBLIC`, need edit → `RagIndexJob(NEED)`
- Knowledge corpus is re-indexed via `rag:index:knowledge` (ops job)

Inactive businesses and non-public needs are cleared from the vector index by the processor.

## Agent tools

- `search_needs_agent`
- `search_businesses_agent`
- `get_public_business_profile`
- `search_site_knowledge`

Listing/business text is treated as untrusted (prompt-injection filtered, truncated).

## Env

```bash
INTERNAL_API_SECRET=...
EMBED_LLM_URL=http://127.0.0.1:8102
EMBED_MODEL=multilingual-e5-small
EMBED_DIMENSION=384
EMBED_BATCH_SIZE=64
RAG_PROCESS_LIMIT=20
```

## Tests

```bash
npm run test:rag
npm run smoke:ai-agent-scenarios
npm run test:ai-agent
```

## Recovery

1. Check lag via GET `/api/internal/rag/process`.
2. Re-run `npm run rag:process` until pending≈0.
3. For model change: null `embeddedAt` / re-run `rag:backfill`.
4. Dead jobs: inspect `rag_index_jobs` where `status='DEAD'`, fix root cause, reset to `PENDING`.
