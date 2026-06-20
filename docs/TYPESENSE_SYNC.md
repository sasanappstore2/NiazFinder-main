# Typesense business search ? sync strategy

## Approach: explicit function calls (implemented)

After every `BusinessProfile` mutation that affects public browse, call:

```ts
import { queueBusinessProfileTypesenseSync } from '@/lib/search/typesense-sync';

queueBusinessProfileTypesenseSync(profileId);
```

Wired today in:

- `src/lib/business/ensure-profile.ts` ? create + category slug sync
- `src/app/api/business/me/route.ts` ? PATCH profile
- `src/app/api/business/me/onboarding/route.ts` ? publish onboarding
- `src/app/api/business/me/categories/route.ts` ? PATCH categories
- `src/app/api/super-admin/businesses/[id]/moderate/route.ts` ? approve/reject/suspend

`queueBusinessProfileTypesenseSync` is fire-and-forget; failures are logged and do not block API responses.

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

## Fallback

`/api/business/browse` uses Typesense when `TYPESENSE_ENABLED=true` and health check passes. Otherwise it falls back to Prisma `contains` search (`listBusinessesFromDb`). Neighborhood filters always use DB (not indexed in Typesense).
