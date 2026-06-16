# NiazFinder — ایندکس کامل پروژه

> آخرین بازایندکس: ۱۴۰۵/۰۳/۱۸ (۲۰۲۶-۰۶-۰۸)  
> هدف: نقشه سکتوربه‌سکتور کل کدبیس برای جهت‌یابی سریع

---

## آمار کلی

| مورد | تعداد |
|------|-------|
| فایل‌های TypeScript/TSX در `src/` | ~۱٬۴۰۰ |
| API Route Handlers | ۱۹۰ |
| صفحات Next.js (`page.tsx`) | ۸۵ |
| Prisma Models | ۴۳ |
| ماژول‌های `src/lib/` | ۴۲ |
| پوشه‌های `src/components/` | ۲۵ |
| اسکریپت‌های `scripts/` | ۹۷ |
| مستندات `docs/` | ۳۳ |
| سرویس‌های جانبی `mini-services/` | ۵ |

---

## ۱. نمای کلی معماری

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Next.js 16 App Router)                 │
│  src/app/(main|auth|chat|admin) + src/components            │
└──────────────────────────┬──────────────────────────────────┘
                           │ apiFetch('/api/...')
┌──────────────────────────▼──────────────────────────────────┐
│  BFF Layer — src/app/api/**/route.ts (۱۹۰ endpoint)         │
│  Domain logic — src/lib/** + src/intake/** + src/ai/**      │
└──────────┬────────────────────────────┬─────────────────────┘
           │ Prisma                      │ HTTP/WebSocket
┌──────────▼──────────┐    ┌────────────▼────────────────────┐
│  PostgreSQL          │    │  mini-services/                  │
│  prisma/schema.prisma│    │  chat-service, intake-mlx,         │
│                      │    │  backend (NestJS legacy),         │
│                      │    │  estate-scrape                    │
└──────────────────────┘    └──────────────────────────────────┘
```

**الگوی اصلی:** UI فقط `/api/*` را صدا می‌زند (BFF). NestJS backend فقط در پروفایل legacy/docker استفاده می‌شود.

**مستندات مرتبط:** `docs/API_ARCHITECTURE.md`, `docs/LOCAL_DEV_RUNBOOK.md`, `docs/ENV_MAP.md`

---

## ۲. سطح بالا — دایرکتوری‌های ریشه

| مسیر | نقش |
|------|-----|
| `src/` | اپلیکیشن اصلی Next.js |
| `prisma/` | اسکیمای PostgreSQL، migrations، seed |
| `mini-services/` | chat، MLX inference، NestJS، scraping |
| `scripts/` | dev، seed، dataset، ML، health، geo |
| `docs/` | مستندات معماری و runbook |
| `data/` | دیتاست‌های آموزش، cache نقشه |
| `models/` | مدل‌های LoRA/MLX (Qwen3.5-2B) |
| `config/` | Janus/TURN برای WebRTC |
| `public/` | فونت، تصاویر، PWA manifest |
| `docker-compose.yml` | Postgres + Redis + MinIO + chat + frontend |
| `Caddyfile` | Reverse proxy |
| `Scrapegraph-ai-main/` | وابستگی vendored برای estate scraping |

---

## ۳. `src/app/` — App Router

### ۳.۱ Route Groups

| گروه | URL نمونه | هدف |
|------|-----------|-----|
| `(main)` | `/`, `/n/...`, `/b/...` | marketplace و صفحات کاربری |
| `(auth)` | `/login`, `/register` | احراز هویت |
| `(chat)` | `/chat/*` | چت تمام‌صفحه |
| `(admin)` | `/super-admin/*` | پنل super-admin |

### ۳.۲ صفحات کلیدی

| URL | فایل | هدف |
|-----|------|-----|
| `/` | `page.tsx` | صفحه اصلی |
| `/n/{location}/[...segments]` | `(main)/n/...` | مرور **نیازها** |
| `/b/{location}/[...segments]` | `(main)/b/...` | مرور **کسب‌وکارها** |
| `/v/{...path}` | `(main)/v/[...path]` | جزئیات آگهی نیاز |
| `/b/{slug}` | `(main)/b/[slug]` | پروفایل عمومی کسب‌وکار |
| `/post` | `(main)/post` | ثبت نیاز (intake) — wizard فرم‌محور |
| `/dashboard` | `(main)/dashboard` | داشبورد کاربر |
| `/my-business` | `(main)/my-business` | مدیریت کسب‌وکار |
| `/search` | `(main)/search` | جستجو |
| `/chat/*` | `(chat)/chat/*` | چت |
| `/super-admin/*` | `(admin)/super-admin/*` | پنل admin (۲۹ صفحه) |
| `/en` | `en/page.tsx` | نسخه انگلیسی |

### ۳.۳ Layouts و Middleware

| فایل | نقش |
|------|-----|
| `src/app/layout.tsx` | Root: Vazirmatn، SEO، ThemeProvider، GlobalVoiceCallLayer |
| `src/app/(main)/layout.tsx` | AppShell (server component) |
| `src/middleware.ts` | ریدایرکت canonical: `/n/{slug}/{id}` → `/v/...`، legacy category |
| `src/config/routes.ts` | **Single source of truth** برای URLها (`routeBuilder`) |
| `src/config/market-routes.ts` | prefixهای `/n/`, `/b/`, `/s/` |

---

## ۴. `src/app/api/` — ۱۹۰ API Route

### Auth & Users (۱۶)
```
auth, auth/check-phone, auth/login-phone, auth/register-phone
auth/otp, auth/verify, auth/logout, auth/sessions/revoke
users, users/me, users/profile, users/search, users/block
users/[id], users/[id]/contact, users/[id]/follow
```

### Needs / Requests (۸)
```
requests, requests/[id], requests/[id]/resubmit
requests/[id]/matched-businesses, requests/map-pins
proposals, proposals/[id], need-alerts
```

### Need Intake (۱۱)
```
intake/analyze, intake/migration/telemetry
need-intake/parse-intent, need-intake/extract-slots
need-intake/next-question, need-intake/preview-listing
need-intake/preview-listing/stream, need-intake/publish
v2/intake-chat, v2/intake-feedback, ai/intake-test
```

### Business (۲۸)
```
business, business/[id], business/[id]/assistant, business/[id]/needs
business/browse, business/leads, business/map-pins
business/occupations, business/online-stores
business/slug/[slug]/contact-points
business/me (+ analytics, categories, contact-points, extensions
  layout, locations, media, needs, offers, onboarding, portfolio, team)
```

### Chat & Voice (۱۸)
```
chat, chat/[conversationId], chat/[conversationId]/read/typing
chat/attachment, chat/messages/[messageId] (+ pin, react)
chat/templates, conversations, conversations/[id]
calls, calls/[id] (+ answer, invite, offer)
voice/credentials, push/subscribe
```

### Search, Map, Locations (۷)
```
search, search/unified, categories
locations, locations/neighborhoods, locations/reverse-geocode
map/tiles/[z]/[x]/[y]
```

### Social & Content (۸)
```
posts, posts/[id]/comment, posts/[id]/like
blog, blog/[slug], bookmarks, reviews
specialists, specialists/[id]
```

### Wallet & Analytics (۴)
```
wallet, referral/me, analytics/collect, dashboard
```

### Admin Legacy (۳)
```
admin/stats, admin/users/[id], admin/need-leads/dispatch
```

### Super Admin (۸۷)
```
super-admin/overview, me, audit, settings, workflow
super-admin/users (+ [id])
super-admin/requests (+ [id], moderate, claim, unpublish, bulk)
super-admin/businesses (+ [id], moderate)
super-admin/proposals (+ [id], moderate/bulk)
super-admin/reviews, business-reviews, reports, notifications
super-admin/coupons, referrals, transactions, wallets
super-admin/outreach (+ dispatch, retry)
super-admin/need-alerts, voice-calls, files, blog, categories
super-admin/locations, business-occupations, online-stores
super-admin/intake-training, intake-ai-evaluation, intake-migration
super-admin/rbac (roles, permissions, assignments)
super-admin/chat-review (conversations, messages, blocks)
super-admin/analytics/* (۱۸ endpoint)
```

### Internal (۱)
```
internal/request-moderation
```

---

## ۵. `src/lib/` — منطق دامنه (۴۲ ماژول)

| ماژول | نقش | نقطه ورود کلیدی |
|-------|-----|-----------------|
| `need-intake/` | موتور ثبت نیاز، orchestrator، listing composer | `orchestrator.ts`, `intake-client.ts` |
| `typing-analysis/` | پیشنهاد real-time هنگام تایپ | `analyzer.ts` |
| `business/` | onboarding، map pins، occupation | `onboarding/`, `map-pins-query.ts` |
| `need/` | browse filters، map pins | `request-browse-filters.ts`, `map-pins-query.ts` |
| `need-alerts/` | اعلان‌های مرور نیاز | `match-request.ts` |
| `need-match/` | تطبیق نیاز با کسب‌وکار | |
| `need-leads/` | outreach به کسب‌وکارها | |
| `chat/` | message actions، UI layout | `message-edit.ts` |
| `voice/` | WebRTC/Janus، call log | `publish-call-invite.ts` |
| `auth/` | احراز هویت، session | |
| `rbac/` | کنترل دسترسی staff | |
| `admin/` | ابزار super-admin | |
| `analytics/` | جمع‌آوری و rollup | |
| `search/` | unified search | |
| `map/` | bbox، coords، tile config، Iran bounds | `tile-config.ts`, `iran-bounds.ts` |
| `geo/` | نقشه استان/شهر | |
| `neighborhoods/` | محله‌ها | `match-managed-neighborhood.ts` |
| `categories/` | رنگ‌ها، sync | `category-colors.ts` |
| `category-filters/` | فیلترهای browse | |
| `browse/` | page heading | |
| `seo/` | metadata، structured data | `index.ts` |
| `security/` | CSP | `content-security-policy.ts` |
| `storage/` | S3/MinIO | |
| `media/` | آپلود و بهینه‌سازی | |
| `communication/` | bridge به chat service | |
| `platform-ai/` | AI platform layer | |
| `request-moderation/` | moderation pipeline | |
| `dashboard/` | API dashboard | |
| `intake/` | helpers intake در lib | |
| `bookmarks/`, `blog/`, `contact/`, `filters/`, `format/`, `image/`, `location/`, `locations/`, `sounds/`, `audit/`, `color/`, `fonts/` | ماژول‌های تخصصی | |

**کلاینت API canonical:** `src/lib/api-client.ts` → `apiFetch('/api/...')`

---

## ۶. `src/intake/` — موتور Rule-Based

| پوشه | نقش |
|------|-----|
| `engine/` | موتور اصلی intake |
| `extractors/` | استخراج entity از متن فارسی |
| `matchers/` | تطبیق category |
| `normalizer/` | نرمال‌سازی متن فارسی |
| `tokenizer/`, `ngrams/` | tokenization |
| `dictionaries/` | واژه‌نامه فارسی |
| `entities/` | entity records |
| `schema/` | needSchema |
| `validation/` | publish validator |
| `projections/` | flatten draft برای publish |
| `aggregate/` | تجمیع draft |
| `scoring/` | امتیازدهی |
| `wizard/` | flow wizard |
| `training/` | dataset builder |
| `migration/` | migration events |
| `fixtures/` | self-tests |
| `legacy/` | کد قدیمی |

---

## ۷. `src/ai/` — لایه AI

| پوشه | نقش |
|------|-----|
| `providers/` | Ollama, mock |
| `router/` | routing بین providerها |
| `services/` | candidateBuilder و … |
| `evaluation/` | evaluation runner |
| `prompts/` | prompt templates |
| `schema/` | JSON schema |
| `config/`, `observability/`, `analytics/`, `types/`, `tests/` | پشتیبانی |

---

## ۸. `src/components/` — UI (۲۵ پوشه)

| پوشه | محتوا |
|------|-------|
| `ui/` | ~۵۶ کامپوننت shadcn/Radix |
| `layout/` | AppShell, Header, Footer |
| `need/` | BrowseRequests, NeedBrowseCard, `map/` |
| `need-intake/` | فرم ثبت نیاز، NeedMapPinPicker |
| `business/` | BrowseSpecialists، `map/` (Leaflet) |
| `business-profile/` | Hub مدیریت پروفایل، فرم‌ها، sections |
| `chat/` | bubble، attachment، read receipt |
| `browse/` | SearchMarketplacePage |
| `dashboard/` | UserDashboard |
| `admin/` | کامپوننت‌های admin |
| `auth/`, `voice/`, `home/`, `notifications/`, `bookmarks/`, `search/`, `social/`, `seo/`, `pwa/`, `legal/`, `contact/`, `navigation/`, `shared/`, `providers/` | |

---

## ۹. سایر پوشه‌های `src/`

| پوشه | نقش |
|------|-----|
| `config/` | routes، categories، locations، need-schemas، business-occupations، admin-permissions |
| `contracts/` | TypeScript contracts (need-card، business-profile، …) |
| `data/` | geo JSON، neighborhoods supplements |
| `hooks/` | use-need-map-pins، use-voice-call، use-intake-analyze، … |
| `stores/` | Zustand: `need-intake-store.ts` |
| `services/business/` | سرویس‌های business |
| `styles/` | CSS تخصصی (business-map، chat، auth، admin) |
| `content/` | legal، seo content |
| `types/` | `api.ts`, `domain.ts` |

---

## ۱۰. `mini-services/`

### `chat-service/` — Socket.io (پورت ۳۰۰۴)
- `index.ts` — سرور + Redis adapter
- Rooms: `user:{userId}`, `conv:{conversationId}`

### `intake-mlx/` — FastAPI + MLX (پورت ۸۱۰۰)
- `app/main.py` — parse, title, listing-copy, train
- مدل: Qwen3.5-2B + LoRA adapters

### `backend/` — NestJS (پورت ۳۰۰۱، legacy)
- `src/modules/` — admin, auth, chat, requests, voice, wallet, …
- `src/intent-parser/` — rule + LLM + embedding + arbitration

### `estate-scrape/` — Python (پورت ۸۲۰۰)
- scraping + dataset builder برای real-estate

### `scrapegraph-estate/`
- estate scraping با Scrapegraph

---

## ۱۱. `scripts/` — دسته‌بندی

| پوشه | نقش |
|------|-----|
| `health/` | smoke tests: api، routes، db-ping، intake |
| `ci/` | production gate، guard deprecated api-client |
| `dev/` | start need-intake stack، approve pending |
| `dataset/` | build/merge/audit دیتاست‌های real-estate |
| `ml/` | shell scripts آموزش LoRA |
| `divar/` | crawl و research از API دیوار |
| `neighborhoods/` | import از Divar/OSM، validate |
| `geo/` | import boundaries، SVG paths، hex layout |
| `analytics/` | rollup روزانه، retention cleanup |
| `business/` | migrate category→occupation، backfill |
| root | seed demos، security smoke، sync-categories |

---

## ۱۲. Prisma — ۴۳ Model

| دامنه | Models |
|-------|--------|
| Users & Auth | `User`, `AuthToken` |
| Staff RBAC | `StaffRole`, `StaffPermission`, `StaffRolePermission`, `UserStaffRole`, `AdminAuditLog`, `StaffAuditLog` |
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

## ۱۳. الگوهای معماری

1. **BFF Pattern** — UI → `/api/*` → Prisma + mini-services
2. **Canonical URLs** — `routeBuilder` + middleware 301
3. **Dual/Triple Intake** — rule-based (`src/intake/`) + AI (`need-intake/` + MLX) + V2 conversational
4. **Real-time** — Socket.io (chat) + Janus WebRTC (voice) + Redis
5. **Marketplace سه‌گانه** — `/n/` needs، `/b/` businesses، `/s/` legacy
6. **RBAC** — super-admin با StaffRole/Permission
7. **Self-test Culture** — `fixtures/run-*-self-test.ts` + `npm run check:all`
8. **State** — Zustand (intake) + TanStack Query (data) + RHF+Zod (forms)
9. **UI Stack** — Next 16 + React 19 + Tailwind 4 + shadcn + Leaflet + Framer Motion + next-intl

---

## ۱۴. نقشه سریع — «اگر می‌خواهید…»

| هدف | بروید به |
|-----|----------|
| URLها و navigation | `src/config/routes.ts` |
| ثبت نیاز | `src/lib/need-intake/`, `src/app/(main)/post/` |
| مرور marketplace | `src/components/need/`, `src/components/business/` |
| نقشه | `src/lib/map/`, `src/components/*/map/` |
| API جدید | `src/app/api/...` + `apiFetch` |
| دیتابیس | `prisma/schema.prisma` |
| چت real-time | `mini-services/chat-service/` |
| ML inference | `mini-services/intake-mlx/` |
| Admin panel | `src/app/(admin)/super-admin/` |
| تست‌ها | `npm run check:all` |
| Dev محلی | `docs/LOCAL_DEV_RUNBOOK.md` |
| متغیرهای env | `docs/ENV_MAP.md` |

---

## ۱۵. مستندات `docs/`

| فایل | موضوع |
|------|-------|
| `ARCHITECTURE_INDEX.md` | نقشه کوتاه معماری |
| `API_ARCHITECTURE.md` | BFF و دو stack |
| `NEED_INTAKE.md` | موتور intake |
| `NEED_INTAKE_ML.md` | MLX و LoRA |
| `BUSINESS_PROFILE_SYSTEM.md` | پروفایل کسب‌وکار |
| `BUSINESS_OCCUPATIONS.md` | occupation registry |
| `COMMUNICATION.md` | چت و messaging |
| `VOICE_CALLS.md` | تماس صوتی WebRTC |
| `GEO_MAP.md` | نقشه استان/شهر |
| `LOCATION_REGISTRY.md` | شهرها و استان‌ها |
| `NEIGHBORHOOD_FILTERS.md` | فیلتر محله |
| `CATEGORY_FILTERS.md` | فیلتر دسته‌بندی |
| `ANALYTICS.md` | آنالیتیکس |
| `SECURITY_AUDIT.md` | امنیت |
| `LOCAL_DEV_RUNBOOK.md` | راه‌اندازی dev |
| `E2E_CHECKLIST.md` | چک‌لیست E2E |
| `ENV_MAP.md` | متغیرهای محیطی |

---

*این فایل با `find`، `grep` و exploration ساختاری تولید شده. برای جزئیات هر سکتور به فایل‌های مرجع بالا مراجعه کنید.*
