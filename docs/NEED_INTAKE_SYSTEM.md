# Need Intake System

AI-first conversational need posting for Needs Finder.

## Flow

1. User enters natural language on homepage (`NeedHeroInput`)
2. `POST /api/need-intake/parse-intent` — LM Studio (optional) + rule-based fallback
3. After each answer (optional): `POST /api/need-intake/extract-slots` — LLM fills only schema keys; `next-question` still picks the field
4. Conversational Q&A via `POST /api/need-intake/next-question` (schema-driven, rule-based)
5. Live summary sidebar + clarifying chips per vertical
6. Summary + `POST /api/need-intake/publish` → `ServiceRequest` (optional LLM title/description)
5. Redirect to `/v/{slug}/{id}`

## LM Studio / Gemma integration

All LLM calls run **server-side only** (Next.js API routes). The browser never talks to `localhost:1234`.

| Env | Purpose |
|-----|---------|
| `NEED_INTAKE_AI_ENABLED` | `true` to enable LLM parsing |
| `NEED_INTAKE_AI_PROVIDER` | `lmstudio` (default) or `rules` (force keyword parser) |
| `LM_STUDIO_BASE_URL` | e.g. `http://localhost:1234/v1` |
| `LM_STUDIO_API_KEY` | Usually `lm-studio` |
| `LM_STUDIO_MODEL` | Model id from LM Studio; empty = first model from `/v1/models` |
| `NEED_INTAKE_AI_TIMEOUT_MS` | Parse timeout (default 45000) |
| `NEED_INTAKE_ENRICH_TIMEOUT_MS` | Publish enrich timeout (default 20000) |
| `NEED_INTAKE_PARSE_CACHE_TTL_MS` | In-memory parse cache TTL (default 900000) |

Copy `.env.example` to `.env.local` and set `NEED_INTAKE_AI_ENABLED=true`.

### Local setup

1. LM Studio → load model (e.g. Gemma) → **Start Server**
2. Verify: `curl http://localhost:1234/v1/models`
3. Optional: set `LM_STUDIO_MODEL` to the exact model id from the response
4. `npm run dev` — submit Persian text on homepage or `/need/new`

### Hybrid parsing

- **Per-vertical prompts** ([`src/lib/need-intake/prompts/`](../src/lib/need-intake/prompts/)) — shorter system prompts for real-estate, vehicles, products, services, jobs
- **Parse cache** — same text hash → instant response ([`parse-cache.ts`](../src/lib/need-intake/parse-cache.ts))
- LLM returns structured JSON (`ParsedIntent`)
- Zod validation + category/intent whitelist ([`validate-parsed-intent.ts`](../src/lib/need-intake/validate-parsed-intent.ts))
- Budget/city merged with rule parser ([`intent-parser.ts`](../src/lib/need-intake/intent-parser.ts))
- On LM Studio error/timeout → full rule-based fallback (no user-facing crash)
- Rate limit on parse/extract-slots (~30 req/min per IP)

### Health check

`GET /api/need-intake/ai-health`

- Development: open without secret
- Production: set `NEED_INTAKE_AI_HEALTH_SECRET` and send header `x-ai-health-secret`

### Production (tunnel)

Point `LM_STUDIO_BASE_URL` at your tunnel URL (Cloudflare Tunnel, ngrok, etc.). Keep LM Studio on a GPU machine; Next.js production only needs outbound HTTPS to the tunnel.

## Modules

| Path | Role |
|------|------|
| `src/contracts/need-intake.ts` | Types |
| `src/config/need-intents.ts` | Intent registry |
| `src/config/need-schemas/` | Schema-driven fields per intent |
| `src/lib/ai/` | OpenAI-compatible client + env |
| `src/lib/need-intake/` | Rule parser, LLM parse, question engine, mapper |
| `src/components/need-intake/` | UI |
| `src/stores/need-intake-store.ts` | Client state |

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/need-intake/parse-intent` | POST | Parse user text → `ParsedIntent` |
| `/api/need-intake/extract-slots` | POST | LLM fills allowed answer slots only |
| `/api/need-intake/next-question` | POST | Next schema question |
| `/api/need-intake/publish` | POST | Create `ServiceRequest` (auth) |
| `/api/need-intake/ai-health` | GET | LM Studio connectivity |

## Rule parser fixtures

```bash
npm run test:intake-parser
```

Runs Persian fixtures against the rule-only parser (no LM Studio). See [`parser-cases.ts`](../src/lib/need-intake/fixtures/parser-cases.ts).

## Category schemas

| Schema | Categories |
|--------|------------|
| `property-intake` | Real estate (buy/sell/rent/رهن) |
| `vehicle-intake` | Vehicles |
| `product-intake` | Electronics, appliances, personal, entertainment |
| `services-intake` | Services |
| `jobs-intake` | Jobs |
| `social-intake` | Social / lost-found / volunteering |
| `pre-sale-intake` | Pre-sale real estate |
| `general` | Fallback |

## Deferred

Voice, image AI, full matching ranker, analytics, LLM-driven `next-question` (stays schema/rule-based).
