# Debug Playbook — NiazFinder

Quick recovery steps when the site breaks (white screen, 500, stale types).

## 1. Clean Next.js cache

```bash
rm -rf .next
npm run dev
```

Stale `.next/types` often reference deleted routes (e.g. old `pro/[slug]/edit`).

## 2. Database migrations

```bash
npx prisma migrate status
npx prisma migrate deploy   # production-like
# or
npx prisma migrate dev      # development
```

If a migration failed mid-way (duplicate column):

```bash
npx prisma migrate resolve --applied MIGRATION_NAME
npx prisma migrate deploy
```

## 3. Health smoke tests

Requires dev server on port 3000:

```bash
npm run smoke:routes
npm run smoke:api
npm run health:baseline
```

## 4. Full check (CI-style)

```bash
npm run check:all
```

## 5. Services (full stack)

| Service | Command | Port |
|---------|---------|------|
| Next.js | `npm run dev` | 3000 |
| Nest backend | `npm run dev:backend` | 4000 |
| Chat (legacy) | `npm run dev:chat` | 3004 |

Env:

- `NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:4000` (Nest chat gateway)
- `NEST_API_URL=http://127.0.0.1:4000`
- `JWT_SECRET` — must match between Next auth and Nest

## 6. Common errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| White page / all routes 500 | Conflicting dynamic routes (`[id]` vs `[slug]`) | Use single param name under same segment |
| TS error in `.next/types` | Stale cache | `rm -rf .next` |
| `business/me` 403 | User role not SPECIALIST/ADMIN/SUPER_ADMIN | Upgrade role or use specialist account |
| Chat won't connect | Wrong socket URL or Nest not running | Start Nest; set `NEXT_PUBLIC_CHAT_SOCKET_URL` |
| Moderation not running | Pending migration | `prisma migrate deploy` |

## 7. E2E manual checklist

1. Login → dashboard
2. Menu → کسب‌وکار من → `/pro/{slug}/edit`
3. Save identity → view public `/b/{slug}`
4. Post need → browse `/n/iran`
5. Super-admin moderation (if SUPER_ADMIN)
