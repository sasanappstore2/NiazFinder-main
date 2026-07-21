# AGENTS.md

General repo guidance lives in `CLAUDE.md` (stack, run commands, where things live,
conventions, testing). Read it first. This file adds environment/runtime notes for
agents working in the Cursor Cloud VM.

## Cursor Cloud specific instructions

### Services & how to run (dev)

The product is a single Next.js 16 app (frontend + all API routes) plus a realtime
chat service. Data stores run natively in the VM (no Docker here).

| Service | Start command | Port | Notes |
|---|---|---|---|
| PostgreSQL 15 + pgvector | `sudo pg_ctlcluster 15 main start` | 5432 | DB `needfinder`, role `needfinder`/`change_me`. Not auto-started on boot — start it first. |
| Redis | `sudo service redis-server start` | 6379 | Optional but recommended; chat falls back to HTTP fanout without it. |
| Next.js app | `bun run dev` (tees to `dev.log`) | 3000 | Runs `prisma generate` first. Main product UI + 216 API routes. |
| Chat/realtime | `bun run dev:chat` | 3004 | Socket.io. Loads repo-root `.env`. |

`DATABASE_URL` (in `.env`) points at `localhost:5432`. Env is split across `.env`
(committed-style base) and `.env.local` (AI/LLM flags). Both are already present in
the VM.

Lint / typecheck / test: see `CLAUDE.md` (`npm run lint`, `npx tsc --noEmit`,
`npm run test:*` / `smoke:*`, full gate `npm run check:all`).

### Gotchas discovered during setup (important, non-obvious)

- Postgres and Redis are NOT started automatically after a VM (re)boot. Start them
  (commands above) before `bun run dev`, or DB-backed pages/APIs return 500.

- Rules-first intake is the default and works with NO LLM. `POST /api/intake/analyze`
  parses Persian need text via the rules engine (`source: "rule"`). `.env.local`
  enables the local LLM (LM Studio on :1234) with a Gemini fallback, but neither is
  required for the core "post a need" flow. If you need deterministic behavior, leave
  LM Studio off and it degrades to rules automatically.

- The app depends on several **gitignored, generated / local-only files** that are NOT
  in git. They are persisted in the VM snapshot; if a cold VM is ever missing them the
  app will fail to compile or 500. How to regenerate each:

  - Geo/map data under `src/data/geo/*.json` and `src/data/neighborhoods/known-areas.json`
    (statically imported by map/intake pages). Regenerate with:
    `bun run neighborhoods:generate-known-areas` and `bun run geo:all`.
    `geo:all` needs three small seed files that are also gitignored:
    `src/data/geo/province-slug-map.json` (geoBoundaries province name → our slug;
    derived from `src/data/admin-locations.json` nameEn, with `Hamadan→hamedan`,
    `Razavi Khorasan→khorasan-razavi`), `src/data/geo/divar-hub-overrides.json`
    (`{"byParent":{}}`) and `src/data/geo/city-province-overrides.json`
    (`{"byCityId":{"karaj":"alborz"},"bySlug":{"karaj":"alborz"}}` — Karaj must map to
    Alborz or `assert-city-boundaries` fails). `geo:all` downloads Iran boundaries from
    GitHub/geonames, so it needs network.
    NOTE: running `geo:all` rewrites `src/data/admin-locations.json` (originCityId hub
    reassignments) as a side effect — `git checkout -- src/data/admin-locations.json`
    afterward to keep tracked data pristine.

  - Local LLM integration modules (matched by the `.gitignore` `local-*` rule):
    `src/lib/local-llm/config.ts`, `src/lib/local-llm/local-embeddings-client.ts`,
    `src/lib/need-intake/local-model-config.ts`, `src/lib/need-intake/local-chat-client.ts`,
    `src/lib/need-intake/local-parse-bridge.ts`, `src/lib/need-intake/local-copy-bridge.ts`,
    `src/lib/ai-agent/local-handler.ts`. These are imported across `src/` (the intake
    orchestrator statically imports the AI resolver) so the project will not compile
    without them. The versions in this VM were reconstructed during environment setup as
    functional OpenAI-compatible clients that degrade gracefully (return `null`/`ok:false`)
    when no local LLM is reachable. If the maintainer has canonical versions, prefer those.

- Test OTP is enabled (`ALLOW_TEST_OTP=true`): phone login accepts OTP `1234` in dev.

- Lint currently reports one PRE-EXISTING error unrelated to setup
  (`react-hooks/immutability` in `src/components/chat/VoiceRecorder.tsx`); it is not
  caused by environment changes.
