# Typesense business search — sync strategy

## Approach: unified search sync (Typesense + RAG)

After every `BusinessProfile` mutation that affects public browse, call:

```ts
import { queueBusinessProfileSearchSync } from '@/lib/rag/sync';

queueBusinessProfileSearchSync(profileId);
```

This queues Typesense keyword upsert/delete **and** a durable `RagIndexJob` for vector embeddings.
See also `docs/RAG_SITE_ASSISTANT.md`.

Wired today in:

- `src/lib/business/ensure-profile.ts` — create + category slug sync
- `src/app/api/business/me/route.ts` — PATCH profile
- `src/app/api/business/me/onboarding/route.ts` — publish onboarding
- `src/app/api/business/me/categories/route.ts` — PATCH categories
- `src/app/api/business/me/offers/**` — offer create/update/delete
- `src/app/api/super-admin/businesses/[id]/moderate/route.ts` — approve/reject/suspend
- `src/app/api/super-admin/users/[id]/route.ts` — user active status

`queueBusinessProfileSearchSync` is fire-and-forget for Typesense; RAG jobs are durable in `rag_index_jobs`.

## Legacy Typesense-only helper

`queueBusinessProfileTypesenseSync` in `src/lib/search/typesense-sync.ts` remains available but prefer the RAG sync coordinator above.

## Alternative: Prisma middleware (not enabled)

You can centralize sync with `$extends` on `PrismaClient`:

```ts
const prisma = new PrismaClient().$extends({
  query: {
    businessProfile: {
      async create({ args, query }) {
        const result = await query(args);
        queueBusinessProfileTypesenseSync(result.id);
        return result;
      },
      async update({ args, query }) {
        const result = await query(args);
        queueBusinessProfileTypesenseSync(result.id);
        return result;
      },
    },
  },
});
```

Trade-off: catches all DB writes automatically, but hides sync side-effects and runs on admin batch jobs too.

## Bootstrap / rebuild

```bash
docker compose up -d typesense
npm run sync:typesense
```

`npm run dev` runs `predev` → `ensure:typesense`, which starts the Typesense container, waits for `/health`, and auto-syncs when `business_profiles` is missing or empty.

Typesense stays **on by default** (`TYPESENSE_ENABLED` only disables when set to `false`). Local defaults live in `.env.local` / `.env.example`.

## Fallback

`/api/business/browse` uses Typesense when configured (not explicitly disabled) and health check passes. Otherwise it falls back to Prisma `contains` search (`listBusinessesFromDb`). Neighborhood filters always use DB (not indexed in Typesense).
