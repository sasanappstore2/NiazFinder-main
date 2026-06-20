# NiazFinder — ایندکس کامل پروژه

> آخرین بازایندکس: ۱۴۰۵/۰۳/۲۹ (۲۰۲۶-۰۶-۱۸)  
> هدف: نقشه سکتوربه‌سکتور کل کدبیس، سرویس‌ها، داده‌ها و مستندات برای جهت‌یابی سریع

---

## آمار کلی

| مورد | تعداد |
|------|-------|
| فایل‌های TypeScript/TSX در `src/` | ~۱٬۶۵۷ |
| API Route Handlers | ۱۹۹ |
| صفحات Next.js (`page.tsx`) | ۸۵ |
| Prisma Models | ۵۸ |
| ماژول‌های `src/lib/` | ۴۶ |
| پوشه‌های `src/components/` | ۲۶ |
| هوک‌های `src/hooks/` | ۵۶ |
| فایل‌های `src/intake/` | ~۱۷۶ |
| اسکریپت‌های `scripts/` | ~۱۳۹ |
| مستندات `docs/` | ۱۳۱ |
| سرویس‌های جانبی `mini-services/` | ۸ |
| فایل‌های `reports/` | ~۱۱۱ |
| ADR / RFC | ۶ + ۲ |

---

## ۱. نمای کلی معماری

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Next.js 16 App Router)                          │
│  src/app/(main|auth|chat|admin) + src/components + src/hooks         │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ apiFetch('/api/...')
┌────────────────────────────▼─────────────────────────────────────────┐
│  BFF Layer — src/app/api/**/route.ts (۱۹۹ endpoint)                    │
│  Domain logic — src/lib/** + src/intake/** + src/ai/**               │
└──────────┬─────────────────────────────┬───────────────────────────────┘
           │ Prisma (PostgreSQL)          │ HTTP / WebSocket / RabbitMQ
┌──────────▼──────────┐    ┌─────────────▼──────────────────────────────┐
│  prisma/schema      │    │  mini-services/                             │
│  (۵۸ model)         │    │  chat-service (۳۰۰۴) — Socket.io            │
│                     │    │  chat-go (۳۰۰۴) — Go replacement            │
│                     │    │  gemma4-intake (۸۱۰۰) — FastAPI + GEMMA4    │
│                     │    │  worker-go (۸۰۸۱) — RabbitMQ intake worker  │
│                     │    │  estate-scrape (۸۲۰۰) — ScrapeGraphAI       │
│                     │    │  backend (۳۰۰۱) — NestJS legacy              │
└─────────────────────┘    └────────────────────────────────────────────┘
```

**الگوی اصلی:** UI فقط `/api/*` را صدا می‌زند (BFF). NestJS backend فقط در پروفایل legacy/docker استفاده می‌شود.

**مستندات مرتبط:** `docs/API_ARCHITECTURE.md`, `docs/LOCAL_DEV_RUNBOOK.md`, `docs/ENV_MAP.md`, `docs/ARCHITECTURE_INDEX.md`

---

## ۲. سطح بالا — دایرکتوری‌های ریشه

| مسیر | نقش |
|------|-----|
| `src/` | اپلیکیشن اصلی Next.js (~۱٬۶۵۷ فایل TS/TSX) |
| `prisma/` | اسکیمای PostgreSQL، migrations، seed |
| `mini-services/` | chat، Go worker، GEMMA4 inference، NestJS، scraping |
| `scripts/` | dev، seed، dataset، ML، health، geo، crawl |
| `docs/` | مستندات معماری، intake، runbook (۱۳۱ فایل) |
| `data/` | دیتاست‌های آموزش، cache نقشه، crawl marathon (~۳.۲ GB) |
| `reports/` | خروجی QA، geo gates، دیتاست‌های marketplace (~۱.۵ GB) |
| `models/` | مدل‌های GEMMA4، Qwen3.5-2B، Gemma-4-12B + adapter registry |
| `config/` | Janus/TURN برای WebRTC |
| `public/` | فونت، تصاویر، PWA manifest |
| `docker-compose.yml` | Postgres + Redis + MinIO + chat + frontend (legacy) |
| `mini-services/docker-compose.go.yml` | RabbitMQ + chat-go + worker-go + gemma4 |
| `Caddyfile` | Reverse proxy (WebSocket → chat، HTTP → frontend) |
| `Scrapegraph-ai-main/` | وابستگی vendored برای estate scraping |

---

## ۳. `src/app/` — App Router

### ۳.۱ Route Groups (۴ گروه)

| گروه | صفحات | URL نمونه | هدف |
|------|-------|-----------|-----|
| `(main)` | ۵۰ | `/`, `/n/...`, `/b/...`, `/dashboard` | marketplace و صفحات کاربری |
| `(auth)` | ۲ | `/login`, `/register` | احراز هویت |
| `(chat)` | ۳ | `/chat/*` | چت تمام‌صفحه |
| `(admin)` | ۲۸ | `/super-admin/*` | پنل super-admin |
| root (بدون گروه) | ۲ | `/`, `/en` | صفحه اصلی و نسخه انگلیسی |

### ۳.۲ صفحات کلیدی — Marketplace

| URL | هدف |
|-----|-----|
| `/` | صفحه اصلی (خارج از `(main)`) |
| `/en` | نسخه انگلیسی |
| `/n`, `/n/{location}`, `/n/{location}/[...segments]` | مرور **نیازها** |
| `/n/{location}/propose` | پیشنهاد برای نیاز |
| `/b`, `/b/{slug}`, `/b/{slug}/[...segments]` | مرور و پروفایل **کسب‌وکارها** |
| `/b/{slug}/p/{offerId}` | جزئیات محصول/خدمت |
| `/b/{slug}/review`, `/b/{slug}/invite` | نظر و دعوت |
| `/v/{...path}` | جزئیات آگهی نیاز (canonical) |
| `/s/*`, `/browse/*` | legacy — ۳۰۱ به `/n` یا `/b` |
| `/[city]/[category]/[slug]` | SEO catch-all |
| `/search` | جستجو |
| `/discover` | کشف |

### ۳.۳ صفحات — ثبت نیاز و پیشنهاد

| URL | هدف |
|-----|-----|
| `/post` | ثبت نیاز (intake wizard) |
| `/post/edit/[id]` | ویرایش نیاز |
| `/post/[id]` | جزئیات post (غیر canonical) |
| `/create-post` | نقطه ورود جایگزین |
| `/propose/[id]` | پیشنهاد |

### ۳.۴ صفحات — کاربر و کسب‌وکار

| URL | هدف |
|-----|-----|
| `/dashboard`, `/dashboard/settings`, `/dashboard/referral` | داشبورد کاربر |
| `/my-business` | مدیریت کسب‌وکار |
| `/pro/[id]`, `/pro/[id]/edit` | پروفایل legacy |
| `/profile/[id]`, `/edit-profile` | پروفایل کاربر |
| `/bookmarks` | نشان‌شده‌ها |
| `/notifications`, `/notification-settings` | اعلان‌ها |
| `/messages` | پیام‌ها (legacy → `/chat`) |
| `/referral`, `/pricing` | معرفی و قیمت‌گذاری |
| `/social-feed` | فید اجتماعی |
| `/submit-review` | ثبت نظر |

### ۳.۵ صفحات — چت، admin، محتوا

| URL | هدف |
|-----|-----|
| `/chat`, `/chat/new`, `/chat/[conversationId]` | چت |
| `/admin`, `/admin/users` | admin در `(main)` |
| `/admin/system/intake-migration` | migration dashboard (duplicate) |
| `/super-admin/*` | ۲۸ صفحه super-admin |
| `/blog`, `/blog/[slug]` | وبلاگ |
| `/help`, `/faq`, `/privacy`, `/terms` | محتوا و قانونی |
| `/dev/mashhad-map` | dev-only نقشه مشهد |

### ۳.۶ Layouts و Middleware

| فایل | نقش |
|------|-----|
| `src/app/layout.tsx` | Root: Vazirmatn، SEO، ThemeProvider، GlobalVoiceCallLayer |
| `src/app/(main)/layout.tsx` | AppShell (server component) |
| `src/app/not-found.tsx` | ۴۰۴ |
| `src/app/sitemap.ts` | تولید sitemap |
| `src/middleware.ts` | ریدایرکت canonical: `/n/{slug}/{id}` → `/v/...`، legacy category |
| `src/config/routes.ts` | **Single source of truth** برای URLها (`routeBuilder`) |
| `src/config/market-routes.ts` | prefixهای `/n/`, `/b/`, `/s/` |

---

## ۴. `src/app/api/` — ۱۹۹ API Route

### Auth & Users (۱۷)
```
auth, auth/check-phone, auth/login-phone, auth/register-phone
auth/otp, auth/verify, auth/logout, auth/sessions/revoke
users, users/me, users/profile, users/search, users/block
users/[id], users/[id]/contact, users/[id]/follow, users/[id]/stars
```

### Needs / Requests (۵)
```
requests, requests/[id], requests/[id]/resubmit
requests/[id]/matched-businesses, requests/map-pins
```

### Need Intake (۱۶)
```
intake/analyze, intake/schema-insights, intake/schema-evolution/proposals
intake/migration/telemetry
need-intake/parse-intent, need-intake/extract-slots
need-intake/next-question, need-intake/preview-listing, need-intake/publish
telemetry/post-intake
ai/intake-test
```

### Business (۳۱)
```
business, business/[id], business/[id]/assistant, business/[id]/needs
business/[id]/stars, business/browse, business/leads, business/map-pins
business/occupations, business/online-stores
business/slug/[slug]/contact-points
business/me (+ analytics, categories, contact-points, extensions
  layout, locations, media, needs, offers, onboarding, portfolio, team
  site-import/preview, site-import/apply)
```

### Chat & Voice (۲۲)
```
chat, chat/[conversationId], chat/[conversationId]/read, chat/[conversationId]/typing
chat/attachment, chat/messages/[messageId] (+ pin, react)
chat/templates, chat/templates/[id]
conversations, conversations/[id]
calls, calls/[id] (+ answer, invite, offer)
voice/credentials, push/subscribe
```

### Search, Map, Locations (۱۶)
```
search, search/unified, categories
locations, locations/neighborhoods, locations/neighborhoods/geo
locations/reverse-geocode
map/tiles/[z]/[x]/[y], map/glyphs/[fontstack]/[range]
map/vector/iran/tilejson, map/vector/iran/[z]/[x]/[y]
map/vector/mashhad/tilejson, map/vector/mashhad/[z]/[x]/[y]
```

### Social & Content (۱۰)
```
posts, posts/[id]/comment, posts/[id]/like
blog, blog/[slug], bookmarks, reviews
specialists, specialists/[id]
proposals, proposals/[id]
```

### Wallet & Analytics (۴)
```
wallet, referral/me, analytics/collect, dashboard
```

### Admin Legacy (۳)
```
admin/stats, admin/users/[id], admin/need-leads/dispatch
```

### Super Admin (۷۹)
```
super-admin/overview, me, audit, settings, workflow
super-admin/users (+ [id])
super-admin/requests (+ [id], moderate, claim, unpublish, bulk, moderation-stats)
super-admin/businesses (+ [id], moderate)
super-admin/proposals (+ [id], moderate/bulk)
super-admin/reviews, business-reviews, reports (+ [id]), notifications (+ broadcast)
super-admin/coupons, referrals, transactions (+ [id]/refund), wallets/[userId]
super-admin/outreach (+ dispatch, [id]/retry)
super-admin/need-alerts, voice-calls (+ [id]), files, blog (+ [id])
super-admin/categories (+ [id]), locations
super-admin/business-occupations (+ [slug]), online-stores (+ [slug])
super-admin/intake-migration, intake-ai-evaluation
super-admin/rbac (roles, permissions, assignments)
super-admin/chat-review (conversations, messages, blocks)
super-admin/analytics/* (۲۱ endpoint: summary, realtime, timeline, events,
  engagement, retention, funnel, pages, dimensions, technology, explorer,
  platform, acquisition, geo, sparklines, correlation, landing, matrix, cities, detail, layout)
```

### Internal (۲)
```
internal/request-moderation, internal/intake-queue/execute
```

### Singletons (۵)
```
api (root), need-alerts, notifications, bookmarks, categories
```

---

## ۵. `src/lib/` — منطق دامنه (۴۶ ماژول)

| ماژول | فایل | نقش | نقطه ورود کلیدی |
|-------|------|-----|-----------------|
| `need-intake/` | ۱۴۷ | موتور ثبت نیاز، orchestrator، MLX local chat | `orchestrator.ts`, `intake-client.ts` |
| `business/` | ۸۰ | onboarding، map pins، site-import | `index.ts`, `site-import/` |
| `map/` | ۴۵ | Iran vector tiles، clusters، MapLibre/Mapbox | `cluster-config.ts`, `iran/` |
| `chat/` | ۲۶ | message actions، socket policy | `message-edit.ts` |
| `search/` | ۱۳ | unified search، browse path | `browse-path.ts` |
| `neighborhoods/` | ۱۷ | محله‌ها، disambiguation | `match-managed-neighborhood.ts` |
| `analytics/` | ۱۵ | جمع‌آوری، geo MaxMind، rollups | `geo-maxmind.ts` |
| `voice/` | ۱۳ | WebRTC/Janus، call log | `publish-call-invite.ts` |
| `need/` | ۱۱ | browse filters، map pins | `request-browse-filters.ts` |
| `need-leads/` | ۱۰ | outreach به کسب‌وکارها | |
| `seo/` | ۹ | metadata، JSON-LD | `index.ts` |
| `typing-analysis/` | ۱۲ | پیشنهاد real-time هنگام تایپ | `analyzer.ts` |
| `auth/` | ۷ | احراز هویت، session | |
| `browse/` | ۷ | page heading | |
| `contact/` | ۷ | contact points | |
| `communication/` | ۶ | bridge به chat service | |
| `geo/` | ۶ | نقشه استان/شهر | |
| `rbac/` | ۶ | کنترل دسترسی staff | |
| `admin/` | ۵ | ابزار super-admin | |
| `need-match/` | ۴ | تطبیق نیاز با کسب‌وکار | |
| `need-alerts/` | ۴ | اعلان‌های مرور نیاز | `match-request.ts` |
| `categories/` | ۴ | رنگ‌ها، sync | `category-colors.ts` |
| `format/` | ۴ | formatting | |
| `security/` | ۴ | CSP | `content-security-policy.ts` |
| `location/` | ۴ | location resolution | |
| `filters/` | ۳ | filter utilities | |
| `image/` | ۳ | image processing | |
| `bookmarks/`, `blog/`, `dashboard/`, `intake/`, `locations/`, `media/`, `storage/`, `wallet/`, `audit/`, `color/`, `fonts/`, `sounds/`, `platform-ai/`, `request-moderation/`, `category-filters/`, `http/`, `perf/`, `zod/` | ۱–۲ | ماژول‌های تخصصی | |

**کلاینت API canonical:** `src/lib/api-client.ts` → `apiFetch('/api/...')`

---

## ۶. `src/intake/` — موتور Rule-Based (~۱۷۶ فایل)

| پوشه | نقش |
|------|-----|
| `intelligence-engine/` | **۴۷ فایل** — pipeline چندلایه: normalize → extract → resolve → AI → truth-verify |
| `fixtures/` | ۲۰ self-test |
| `rules/` | ۱۶ — category rule packs، generators |
| `template/` | ۱۳ — vertical templates، section builder |
| `projections/` | ۱۰ — flatten draft برای publish/listing/match |
| `intelligence/` | ۸ — schema drift، funnel analysis |
| `migration/` | ۷ — shadow publish، feature flags |
| `legacy/` | ۶ — payload bridge |
| `telemetry/` | ۶ — post-intake funnel |
| `evolution/` | ۵ — schema evolution proposals |
| `rendering/` | ۵ — field renderer registry |
| `engine/` | موتور اصلی intake (`analyzeNeedText`) |
| `extractors/`, `matchers/`, `normalizer/`, `tokenizer/`, `ngrams/` | NLP فارسی |
| `dictionaries/`, `entities/`, `schema/` | واژه‌نامه و schema |
| `validation/`, `scoring/`, `state/`, `wizard/`, `aggregate/` | validation و flow |
| `training/` | dataset builder |
| `api/` | DTOs (Zod) |

---

## ۷. `src/ai/` — لایه AI (۲۹ فایل)

| پوشه | نقش |
|------|-----|
| `providers/` | Ollama, OpenAI, Gemini, local chat (MLX), mock |
| `router/` | `aiRouter.ts` — routing بین providerها |
| `services/` | semantic resolver، candidate builder |
| `evaluation/` | evaluation runner، dataset loader |
| `schema/`, `prompts/`, `config/`, `observability/`, `analytics/`, `types/`, `tests/` | پشتیبانی |

---

## ۸. `src/components/` — UI (۲۶ پوشه، ~۴۶۷ فایل)

| پوشه | فایل | محتوا |
|------|------|-------|
| `admin/` | ۹۷ | SuperAdminShell، modules، RBAC، analytics |
| `business-profile/` | ۷۸ | Hub مدیریت پروفایل، onboarding، site-import |
| `ui/` | ۵۷ | shadcn/Radix، map cluster layer |
| `need-intake/` | ۳۷ | فرم ثبت نیاز، NeedMapPinPicker |
| `chat/` | ۳۵ | bubble، attachment، read receipt |
| `map/` | ۳۶ | MapLibre/Mapbox Iran maps، GPU clusters |
| `need/` | ۲۶ | BrowseRequests، NeedBrowseCard، `map/` |
| `shared/` | ۲۴ | HeaderSearchBar، breadcrumbs |
| `browse/` | ۹ | SearchMarketplacePage، BrowseFilterBar |
| `business/` | ۱۴ | BrowseSpecialists، `map/` (Leaflet) |
| `dashboard/` | ۸ | UserDashboard، WalletHistory |
| `home/` | ۷ | HomeLeadLanding، NeedLeadPromptBox |
| `layout/` | ۸ | AppShell, Header, Footer |
| `social/` | ۸ | UserProfile، starred businesses |
| `auth/`, `voice/`, `notifications/`, `bookmarks/`, `search/`, `seo/`, `pwa/`, `legal/`, `contact/`, `navigation/`, `providers/` | ۱–۵ | |

---

## ۹. سایر پوشه‌های `src/`

| پوشه | نقش |
|------|-----|
| `config/` | routes، categories، locations، need-schemas (۱۱)، category-filters (۹)، business-occupations |
| `contracts/` | ۱۶ TypeScript contract (need-intake، business-profile، typing-analysis، …) |
| `data/` | geo JSON، neighborhoods supplements |
| `hooks/` | ۵۶ هوک (intake، map، browse، chat/voice، business) |
| `stores/` | Zustand: `need-intake-store.ts` |
| `services/business/` | API row → card mappers |
| `styles/` | CSS تخصصی (business-map، chat، auth، admin، intake-golden) |
| `content/` | legal، seo content |
| `types/` | `api.ts`, `domain.ts` |

---

## ۱۰. `mini-services/` — ۸ سرویس

| سرویس | پورت | نقش | وضعیت |
|--------|------|-----|-------|
| `chat-service/` | ۳۰۰۴ | Socket.io + Redis adapter | default در docker-compose |
| `chat-go/` | ۳۰۰۴ | Go WebSocket (جایگزین) | docker-compose.go.yml |
| `worker-go/` | ۸۰۸۱ | RabbitMQ consumer برای intake AI | docker-compose.go.yml |
| `gemma4-intake/` | ۸۱۰۰ | FastAPI + `models/GEMMA4` | profile `ai` |
| `estate-scrape/` | ۸۲۰۰ | ScrapeGraphAI + dataset builder | dev only |
| `backend/` | ۳۰۰۱ | NestJS legacy (intent parser، BullMQ) | profile `legacy` |
| `scrapegraph-estate/` | — | stub placeholder | |
| `intake-mlx/` | ۸۱۰۰ | MLX Qwen3.5-2B (قدیمی، جایگزین gemma4) | legacy |

**Rooms چت:** `user:{userId}`, `conv:{conversationId}`

---

## ۱۱. `scripts/` — دسته‌بندی (~۱۳۹ فایل)

| پوشه | فایل | نقش |
|------|------|-----|
| `neighborhoods/` | ۲۳ | import OSM/Divar، coverage، geo enrichment |
| `geo/` | ۲۲ | province/city boundaries، viewports، quality gates |
| `health/` | ۱۵ | smoke: api، routes، map، intake، gemma4 |
| `divar/` | ۱۴ | crawl API دیوار، city tree، category sync |
| `crawl/` | ۱۲ | site crawler، marathon، UX heuristics |
| `ci/` | ۹ | pre-commit smoke، coverage gates، boundary checks |
| `datasets/` | ۷ | smart marketplace cleaning، finetune prep |
| `stress/` | ۴ | intake batch stress، zero-defect loops |
| `map/` | ۴ | vector tile prewarm، cache verify |
| `analytics/` | ۲ | rollup، retention cleanup |
| `business/`, `dev/`, `generate/`, `categories/`, `locations/`, `migrate/`, `git/` | ۱–۲ | |
| root | ۲۱ | seeds، E2E tests، security smoke، sync |

**دستورات crawl:** `npm run crawl:run`, `npm run crawl:marathon`

---

## ۱۲. Prisma — ۵۸ Model

| دامنه | Models |
|-------|--------|
| Users & Auth | `User`, `AuthToken` |
| Staff RBAC | `StaffRole`, `StaffPermission`, `StaffRolePermission`, `UserStaffRole`, `AdminAuditLog`, `StaffAuditLog` |
| Intake Locations | `IntakeProvince`, `IntakeCity`, `IntakeNeighborhood`, `IntakeLocationAlias` |
| Categories | `Category`, `Skill`, `UserSkill` |
| Service Requests | `ServiceRequest`, `NeedIntakeSession` |
| Intake ML | `IntakeMigrationEvent`, `IntakeTrainingExample`, `IntakeValidationRejectEvent`, `IntakeCandidateFailureEvent` |
| Proposals | `Proposal` |
| Business | `BusinessProfile`, `BusinessOffer`, `BusinessPortfolioItem`, `BusinessProfileReview`, `BusinessMember`, `BusinessContactPoint`, `BusinessMemberInvite`, `BusinessLocation`, `BusinessAnalyticsDaily` |
| Chat | `Conversation`, `Message`, `MessageDelivery`, `MessageReaction`, `UserBlock`, `ChatReplyTemplate` |
| Voice | `VoiceCall` |
| Leads | `NeedLeadOutreach` |
| Reviews | `Review` |
| Wallet | `Wallet`, `Transaction` |
| Alerts | `NeedBrowseAlert` |
| Notifications | `Notification` |
| Admin | `AdminLog`, `Report` |
| Social | `Bookmark`, `UserPost`, `PostComment`, `PostLike`, `Follow` |
| Analytics | `AnalyticsSession`, `AnalyticsEvent`, `AnalyticsDailyRollup` |
| Blog | `BlogPost` |
| Portfolio | `Portfolio` |
| Coupons/Referrals | `Coupon`, `Referral` |

---

## ۱۳. `data/` و `reports/` — دیتاست‌ها

### `data/` (~۳.۲ GB)

| پوشه | حجم | نقش |
|------|-----|-----|
| `crawl-marathon/` | ۲.۵ GB | خروجی crawl سایت |
| `map-vector-cache/` | ۴۰۲ MB | vector tiles ایران/مشهد |
| `map-tiles-cache/` | ۲۳ MB | raster tiles |
| `neighborhoods/` | ۱۹ MB | cache محله‌ها |
| `divar/` | ۲.۵ MB | city tree، research |
| `v2-conv-qa/` | ۷.۸ MB | QA مکالمه intake |
| `estate-knowledge/` | ۱۸۰ KB | estate scrape chunks |
| `telemetry/` | ۱۲۰ KB | post-intake telemetry |

### `reports/` (~۱.۵ GB)

| دسته | فایل‌های کلیدی |
|------|----------------|
| Marketplace training | `smart-marketplace-clean.jsonl` (۴۰۸K خط), `smart-marketplace-curated.jsonl` (۳۸۳K خط) |
| Catalog trees | `iran-categories-tree.json`, `iran-locations-tree.json` |
| Intake QA | `zero-defect-round-*.json`, `gemma-intake-*.json`, `rules-coverage-gate-*.json` |
| Geo | `geo-gates/` (۳۱ استان), `geo-cross-verify/` |
| Health | `site-health.json`, `wiring-matrix.json`, `api-inventory.json` |

---

## ۱۴. `models/` — ML Models

| مسیر | نقش |
|------|-----|
| `models/GEMMA4/` | **فعال** — inference intake (gemma4-intake:8100) |
| `models/Qwen3.5-2B-bf16/` | Qwen base (MLX/estate-scrape) |
| `models/google:gemma-4-12B-it-qat-w4a16-ct/` | Gemma 4 12B quantized (LoRA base) |
| `models/intake-adapter-registry.json` | ۵ adapter (۲ active، ۳ candidate) |

---

## ۱۵. Docker & Infra

### `docker-compose.yml` (۷ سرویس)

| سرویس | پورت | Profile |
|--------|------|---------|
| postgres | ۵۴۳۲ | default |
| redis | ۶۳۷۹ | default |
| minio | ۹۰۰۰, ۹۰۰۱ | default |
| chat (chat-service) | ۳۰۰۴ | default |
| backend | ۳۰۰۱ | legacy |
| frontend | ۳۰۰۰ | legacy |
| caddy | ۸۰۸۰, ۸۴۴۳ | legacy |

### `mini-services/docker-compose.go.yml` (+۴ سرویس)

| سرویس | پورت |
|--------|------|
| rabbitmq | ۵۶۷۲, ۱۵۶۷۲ |
| gemma4-intake | ۸۱۰۰ |
| chat-go | ۳۰۰۴ |
| worker-go | ۸۰۸۱ |

### `Caddyfile`

- WebSocket → `chat:3004`
- HTTP → `frontend:3000`

---

## ۱۶. الگوهای معماری

1. **BFF Pattern** — UI → `/api/*` → Prisma + mini-services
2. **Canonical URLs** — `routeBuilder` + middleware 301
3. **Triple Intake** — rule-based (`src/intake/`) + intelligence-engine + AI (`need-intake/` + GEMMA4)
4. **Real-time** — Socket.io (chat) + Janus WebRTC (voice) + Redis
5. **Marketplace سه‌گانه** — `/n/` needs، `/b/` businesses، `/s/` legacy
6. **RBAC** — super-admin با StaffRole/Permission
7. **Self-test Culture** — `fixtures/run-*-self-test.ts` + `npm run check:all`
8. **State** — Zustand (intake) + TanStack Query (data) + RHF+Zod (forms)
9. **UI Stack** — Next 16 + React 19 + Tailwind 4 + shadcn + MapLibre/Mapbox + Framer Motion + next-intl
10. **Iran Map Stack** — vector tiles، GPU clustering، neighborhood boundaries
11. **Schema Evolution** — drift detection، proposal engine، governance board

---

## ۱۷. نقشه سریع — «اگر می‌خواهید…»

| هدف | بروید به |
|-----|----------|
| URLها و navigation | `src/config/routes.ts` |
| ثبت نیاز | `src/lib/need-intake/`, `src/app/(main)/post/` |
| Intelligence engine | `src/intake/intelligence-engine/` |
| مرور marketplace | `src/components/need/`, `src/components/business/` |
| نقشه | `src/lib/map/`, `src/components/map/` |
| API جدید | `src/app/api/...` + `apiFetch` |
| دیتابیس | `prisma/schema.prisma` |
| چت real-time | `mini-services/chat-service/` یا `chat-go/` |
| ML inference | `mini-services/gemma4-intake/` |
| Admin panel | `src/app/(admin)/super-admin/` |
| Site crawl | `npm run crawl:run` |
| تست‌ها | `npm run check:all` |
| Dev محلی | `docs/LOCAL_DEV_RUNBOOK.md` |
| متغیرهای env | `docs/ENV_MAP.md` |
| Wiring matrix | `docs/wiring-matrix.md`, `reports/wiring-matrix.json` |

---

## ۱۸. مستندات `docs/` — فهرست گروه‌بندی‌شده

### معماری و Ops (~۱۵)
`ARCHITECTURE_INDEX.md`, `API_ARCHITECTURE.md`, `LOCAL_DEV_RUNBOOK.md`, `ENV_MAP.md`, `E2E_CHECKLIST.md`, `DEBUG_PLAYBOOK.md`, `INCIDENT_RUNBOOK.md`, `GIT_SYNC.md`, `TODAY_START_POINT.md`, `wiring-matrix.md`, `RESPONSIVE.md`

### دامنه (~۲۰)
`NEED_INTAKE.md`, `BUSINESS_PROFILE_SYSTEM.md`, `BUSINESS_OCCUPATIONS.md`, `COMMUNICATION.md`, `VOICE_CALLS.md`, `GEO_MAP.md`, `MAP_LOCAL_SETUP.md`, `LOCATION_REGISTRY.md`, `LOCATION_AUTO.md`, `NEIGHBORHOOD_FILTERS.md`, `CATEGORY_FILTERS.md`, `ANALYTICS.md`, `NEED_MATCH.md`, `TYPING_ANALYSIS.md`, `HOME_LEAD.md`, `AI_LEAD_OUTREACH.md`, `CONTACT_JOURNEY.md`, `ONLINE_STORE_CATEGORIES.md`, `DIVAR_REAL_ESTATE_MATRIX.md`, `chat-ui-spec.md`, `CHAT_RESPONSIVE.md`

### امنیت (~۳)
`SECURITY_AUDIT.md`, `SECURITY_RUNBOOK.md`, `SEO_CLAIMS_AUDIT.md`

### Intake (~۷۰+)
`INTAKE_INDEX.md` — نقطه ورود اصلی intake docs  
شامل: `INTAKE_EXECUTION.md`, `INTAKE_GOVERNANCE.md`, `INTAKE_QUEUE_ARCHITECTURE.md`, `INTAKE_VALIDATION.md`, `INTAKE_TELEMETRY.md`, `INTAKE_MOBILE_*`, `INTAKE_DESKTOP_*`, `INTAKE_PHASE*_KICKOFF.md`, `INTAKE_YEAR*_RETRO.md`, verticals (vehicles, jobs-services), …

### ADR (۶) — `docs/adr/`
`001-intake-ai-strategy`, `002-intake-validation-unified`, `003-intake-ai-provider`, `004-need-assessment-engine`, `004-post-manual-wizard`, `005-remove-intake-v2-chat`

### RFC (۲) — `docs/rfc/`
`NEED_DRAFT_V2`, `SCHEMA_GOVERNANCE_BOARD`

---

## ۱۹. جریان‌های اصلی کاربر

```
ثبت نیاز:
  HomeLeadPromptBox → /post → NeedIntakePanel
    → use-intake-* hooks → need-intake-store (Zustand)
    → /api/intake/analyze + /api/need-intake/*
    → intake/engine + intelligence-engine + gemma4-intake
    → /api/need-intake/publish → ServiceRequest

مرور marketplace:
  /n/{city} → BrowseRequests + NeedBrowseMap
    → /api/requests + /api/requests/map-pins
    → request-browse-filters + map cluster config

چت و تماس:
  /chat → ChatPanel → chat-service (Socket.io)
  GlobalVoiceCallLayer → Janus WebRTC → /api/calls/*

کسب‌وکار:
  /my-business → BusinessOnboardingWizard
    → /api/business/me/* → BusinessProfile
  /b/{slug} → ProfileShell (public)
```

---

*این فایل با exploration ساختاری، `find`، `grep` و subagent inventory تولید شده. برای جزئیات هر سکتور به فایل‌های مرجع بالا مراجعه کنید.*
