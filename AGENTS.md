# AGENTS.md

See `CLAUDE.md` for the full product/architecture overview and the canonical run/test commands. This file adds environment-specific guidance.

## Cursor Cloud specific instructions

Durable, non-obvious notes for running this repo in the Cursor Cloud VM. Standard commands live in `CLAUDE.md` and `package.json` scripts — this section only records the gotchas.

### Runtime: use Bun, not npm

- Install dependencies with **`bun install`** (root) — the update script does this on startup. Do **not** use `npm install`: npm silently skips the platform-native optional deps this project needs (`lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`), which makes `next dev` crash every page with `Cannot find module '../lightningcss.linux-x64-gnu.node'`. Bun installs them correctly. `bun install` also runs `prisma generate` (postinstall).
- The chat service has its own deps: `bun install --cwd mini-services/chat-service` (also run by the update script).
- App is still launched normally (`npm run dev` / `npm run dev:chat`); only dependency installation must go through Bun.

### Services (start these yourself — the update script never starts services)

- **PostgreSQL 15 + pgvector** is installed natively (not Docker; Docker is not available in this VM). Start it with `sudo pg_ctlcluster 15 main start`. The `needfinder` role/DB, schema, seeded locations, synced categories, and the `vector` extension already exist in the VM snapshot — no need to recreate them. `DATABASE_URL` in `.env` points at `localhost:5432`.
- **Next.js app**: `npm run dev` (port 3000). Requires Postgres running.
- **Chat service** (realtime, port 3004): `npm run dev:chat`. Redis is optional — without it you'll see harmless `ioredis` "Connection is closed" logs; REST + HTTP fanout still deliver messages in single-instance dev.
- Redis / RabbitMQ / MinIO / Typesense / worker-go are optional and degrade gracefully (intake falls back to synchronous processing). They normally run via Docker, which is unavailable here.
- Local LLM / AI sidecars (gemma4-intake, embeddings, LM Studio) are opt-in; intake defaults to rules-only (`NEED_INTAKE_LLM_ENABLED=false`) and works fully without them.

### Overly-broad `.gitignore` hides required files (important)

`.gitignore` has broad patterns `data/` and `local-*` that exclude real, required files from git. They are **not** in the repo but are present in the VM snapshot. If they ever go missing, regenerate:

- `src/data/neighborhoods/known-areas.json` → `npm run neighborhoods:generate-known-areas`
- `src/data/geo/*` (province/city centroids, map configs, viewports, SVG paths, hex layout — imported statically by map/browse pages; missing them makes `/post`, `/n/{city}`, etc. fail to compile) → `npm run geo:all`. This also needs three seed files under `src/data/geo/` that are gitignored and were reconstructed for this environment: `province-slug-map.json` (maps geoBoundaries English province names → admin slugs), `divar-hub-overrides.json` (`{"byParent":{}}`), and `city-province-overrides.json` (`{"bySlug":{"karaj":"alborz"},"byCityId":{"karaj":"alborz"}}`). The raw boundary source is cached at `src/data/geo/raw/`.
- Categories must be present in the DB for publishing to succeed: `npm run categories:sync` (also part of `npm run db:migrate`). Missing categories cause publish to return 422 `دسته ... یافت نشد`.
- `src/lib/local-llm/config.ts` and the other `local-*` source files are gitignored. The snapshot's `config.ts` was completed with the `getLocalLlmParallelSlots` / `getLocalLlmTimeoutMs` exports that committed code (`src/ai/config/feature-flags.ts`) imports; without them the `/api/intake/analyze` route (and the whole publish flow) 500s.

### Expected dirty working tree

The VM snapshot intentionally carries some uncommitted working-tree changes so the env runs without a local LLM; leave them as-is (they are not meant to be committed):

- `.env.local` is set to **rules-only** here (the committed version points intake at a local LM Studio server on `:1234` that does not run in this VM, which would break `/api/intake/analyze`). It also enables `NEED_INTAKE_AUTO_APPROVE` and `ALLOW_TEST_OTP` for dev.
- `bun.lock` / `package-lock.json` reflect the local install; `src/data/admin-locations.json` was touched by `geo:all`. These are gitignored-data/lockfile churn, not intended commits.

### Known limitation

- The `/post` wizard's final publish **button** currently returns 400 `پیش‌نویس نامعتبر` (the client sends `templateVersion` as a number while `publishRequestSchema` expects a string) — a pre-existing app bug, not an environment issue. Publishing works end-to-end via the API (`POST /api/auth/otp` → `/api/auth/verify` → `/api/intake/analyze` → `/api/need-intake/publish`); test OTP is `1234` when `ALLOW_TEST_OTP=true`.
