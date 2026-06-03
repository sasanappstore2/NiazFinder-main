# Business occupations taxonomy

Separate from **need/listing categories** in [`src/config/categories.ts`](../src/config/categories.ts).

## Research phases

| Phase | Source | Outcome |
|-------|--------|---------|
| 1 | ISCO-08 major groups (ILO) | 10 sector roots aligned to local market |
| 2 | NAICS / O*NET service industries | Service titles filtered to real jobs |
| 3 | Iran market (Divar services, NiazFinder use cases) | ~170+ pickable jobs, Persian labels |
| 4 | Need→occupation bridge | [`need-to-occupation-map.ts`](../src/config/need-to-occupation-map.ts) |

## Slug rules

- Short, language-independent, kebab-case: `plumber`, `real-estate-agent`
- Unique across registry; parent via `parentSlug`, not embedded in slug
- **Never** reuse need-category slugs (`apartment-sale`, `refrigerator`, …)

## Display order

Wizard and pickers sort by `sortOrder` (lower = more important), tuned for Iran marketplace demand — not alphabetical. Sectors: املاک → خدمات منزل → ساختمان → فناوری → …

## Sectors (depth 0)

| slug | title FA |
|------|----------|
| `real-estate-facility` | املاک و تأسیسات |
| `home-personal-services` | خدمات منزل و شخصی |
| `trades-construction` | ساختمان و تأسیسات |
| `tech-digital` | فناوری و دیجیتال |
| `transport-logistics` | حمل و نقل |
| `professional-legal-finance` | حقوقی، مالی و مشاوره |
| `health-beauty` | سلامت و زیبایی |
| `creative-media` | خلاقیت و رسانه |
| `education-coaching` | آموزش و کوچینگ |
| `food-hospitality` | غذا و پذیرایی |
| `events-services` | مراسم و جشن |
| `crafts-repair` | خیاطی و تعمیرات ظریف |
| `pets-services` | حیوانات خانگی |
| `travel-tourism` | سفر و گردشگری |
| `security-industrial` | امنیت و صنعتی |
| `funeral-services` | خدمات ترحیم |
| `retail-trade` | فروشگاه و مغازه |
| `agriculture-garden` | کشاورزی و باغ |

Includes **dealerships & showrooms** (e.g. `car-dealership` نمایشگاه خودرو), not only repair trades.

Only **real** business occupations (no listing types like «فروش آپارتمان»). Vague titles removed (e.g. «تولیدکننده محتوا» → «مدیریت شبکه‌های اجتماعی»). Legacy slugs alias via `LEGACY_OCCUPATION_ALIASES`.

## Storage

- **Admin-managed JSON:** `src/data/business-occupations.json` (seed via `npx tsx scripts/seed-business-occupations-json.ts`)
- **Loader:** [`occupations-registry.ts`](../src/lib/business/occupations-registry.ts) with fallback to [`business-occupations-defaults.ts`](../src/config/business-occupations-defaults.ts)
- **Super Admin:** `/super-admin/business-occupations` — CRUD without deploy (permissions `taxonomy:business-occupations:read|write`)
- **Public API:** `GET /api/business/occupations` — client pickers warm in-memory cache
- `BusinessProfile.categorySlugs` JSON array stores **occupation slugs** (legacy column name).
- API exposes `primaryOccupationSlug` + alias `primaryCategorySlug` for one release.

**Note:** This taxonomy is separate from need categories (`/super-admin/categories`). Slug overlap with need categories is rejected on create.

## Matching

Needs use need categories → expanded via tree + [`occupationsForNeedSlug()`](../src/config/need-to-occupation-map.ts) → compared to profile occupation slugs.
