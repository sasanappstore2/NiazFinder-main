# Universal Business Profile System — Needs Finder

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation (Next.js)                   │
│  UniversalBusinessProfile + sections + AI Assistant Panel   │
│  Routes: /{city}/{category}/{slug}  |  /pro/{id}            │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    API (REST)                                │
│  GET  /api/business          — list + filters                │
│  GET  /api/business/[id]     — full Business DTO               │
│  POST /api/business/[id]/assistant — AI chat                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Domain layer (TypeScript contracts)             │
│  src/contracts/business-profile.ts — Business, Offer, etc.   │
│  map-profile.ts | ensure-profile.ts | ai-assistant.ts        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              Persistence (Prisma / SQLite)                   │
│  BusinessProfile | BusinessOffer | BusinessPortfolioItem     │
│  BusinessProfileReview | User (1:1 profile)                  │
└─────────────────────────────────────────────────────────────┘
```

## Design rules

| Rule | Implementation |
|------|----------------|
| 80% shared UI | `sections.tsx` — Hero, Identity, Offers, Portfolio, Trust, Contact, SEO |
| 20% extensions | `BusinessExtension` JSON + `BusinessExtensionsSection` |
| All sellable items → Offers | `BusinessOffer` table + `OfferCard` grid |
| One page structure | `UniversalBusinessProfile` for every category |
| AI per business | `aiAssistantConfig` + `/assistant` endpoint |
| SEO URLs | `/{city}/{category}/{slug}` with `/pro/{id}` fallback |

## TypeScript schema

Canonical types live in `src/contracts/business-profile.ts`:

- `Business` — root aggregate
- `BusinessOffer`, `BusinessPortfolioItem`, `BusinessReview`
- `BusinessExtension` — plugin fields (`restaurant`, `doctor`, …)
- `AiAssistantConfig`, `AssistantChatRequest/Response`

## Database (PostgreSQL-ready)

SQLite today; models in `prisma/schema.prisma`:

- **BusinessProfile** — identity, trust, contact, SEO, analytics, `extensions`, `aiAssistantConfig` (JSON strings)
- **BusinessOffer** — normalized offer cards
- **BusinessPortfolioItem** — image / video / before_after
- **BusinessProfileReview** — standalone reviews (migrated from legacy `Review`)

Run: `npx prisma db push`

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/business?city=&category=&minRating=&page=` | Paginated list |
| GET | `/api/business/:id` | Full profile (`?track=0` skips view increment) |
| POST | `/api/business/:id/assistant` | `{ messages: [{role, content}] }` |

## AI assistant

1. **Config** — `aiAssistantConfig` on profile; defaults from `buildDefaultAiConfig()` by extension/category.
2. **Prompt** — `buildLlmSystemPrompt(business)` for OpenAI/Anthropic swap-in.
3. **Runtime** — `runBusinessAssistant()` rule-based engine (offer scoring + CTA); replace POST handler body with LLM when ready.

Category presets: `restaurant`, `doctor`, `salon`, `mechanic`, `real-estate`, `default`.

## Frontend components

```
src/components/business-profile/
  UniversalBusinessProfile.tsx   # orchestrator
  sections.tsx                   # Hero, Offers, Portfolio, …
  BusinessAssistantPanel.tsx     # sticky FAB + modal chat
```

Hook: `src/hooks/use-business-profile.ts`

## URLs

| Pattern | Example |
|---------|---------|
| SEO | `/tehran/dentist/dr-nikbakht` |
| Fallback | `/pro/{userId}` |

`routeBuilder.businessSeo(city, category, slug)` in `src/config/routes.ts`.

## Hydration from legacy data

On first load, `ensureBusinessProfile()` creates a profile from `User`. Then:

- Skills → `BusinessOffer` seeds
- `Portfolio` → `BusinessPortfolioItem`
- `Review` → `BusinessProfileReview` + rating aggregate

## Next steps (production)

1. Admin CMS for offers, extensions, AI prompts
2. Wire LLM provider in `assistant/route.ts`
3. Conversion events (`clickCount`, `conversionCount`) on CTA clicks
4. PostgreSQL migration + PostGIS for `geo`
5. Full-text search index (Meilisearch / Elasticsearch)
6. Category assignment UI linking `categorySlugs` to canonical browse tree
