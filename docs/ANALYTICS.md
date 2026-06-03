# First-Party Analytics

NeedFinder collects **first-party** web analytics (similar to Google Analytics) after cookie consent.

## What is collected

- **Sessions** — `nf_sid` cookie (30-minute sliding window)
- **Visitors** — `nf_vid` cookie (1 year)
- **Page views** — pathname, title, referrer, UTM params
- **Custom events** — CTA actions (chat, call, proposal, signup, need_created, etc.)
- **Dimensions** — parsed from URL: market (`need` / `business`), city, category, occupation, online-store, pageKind
- **Technology** — device, browser, OS (from User-Agent)
- **Geo** — country default `IR`; province/city from user location when available
- **IP** — stored as **SHA-256 hash** only (`ANALYTICS_IP_SALT` env)

## Consent

Analytics runs only when `localStorage['needfinder-cookie-consent'] === 'accepted'`.

## Ingestion

```
POST /api/analytics/collect
```

Public endpoint; rate-limited (~120 req/min per visitor/IP). Bots are ignored.

## Admin hub (Analytics Hub Pro)

Super Admin → **تحلیل‌ها** (`/super-admin/analytics`):

| Tab | Data |
|-----|------|
| Executive | KPIs, sparklines, insights, platform snapshot |
| Realtime | Active users, minute buckets, event stream, market split |
| Acquisition | Source/medium/channel, landing pages, channel×landing matrix |
| Engagement | Timeline, pages, duration histogram, pageKind |
| Geo | Iran choropleth map + city table (province filter) |
| Technology | Device, browser, OS sub-tabs |
| Business | Market, city, occupation, online-store dimensions + heatmap |
| Conversions | Custom events by name/path |
| Funnels | Preset funnels (need, business, engagement) |
| Retention | Weekly cohort heatmap + explorer search |
| Platform | Legacy DB KPIs + traffic/ops correlation chart |

APIs under `/api/super-admin/analytics/*` require `superadmin:analytics:read`.

Legacy overview KPIs remain at `/api/super-admin/analytics` (unchanged for OverviewPanel).

## Rollups & retention

- Raw events: query window capped at **90 days** in admin UI
- Daily rollups: `npm run analytics:rollup` or `npm run analytics:rollup -- 2026-06-01`
- Backfill: `npm run analytics:rollup:backfill`
- Cleanup (90d raw / 13mo rollups): `npm run analytics:cleanup` (add `--dry-run` to preview)

## Client usage

```ts
import { trackAnalyticsEvent } from '@/lib/analytics/track';

trackAnalyticsEvent('proposal_sent', { requestId: '...' }, { userId });
```

Tracked conversion events: `signup_completed`, `need_created`, `business_profile_view`, `onboarding_step`.

## Tests

```bash
npx tsx scripts/test-analytics-collect-e2e.ts
npm run test:analytics-admin-e2e
npx tsx scripts/test-super-admin-e2e.ts
```

## Demo data

```bash
npm run analytics:seed-demos
npm run analytics:rollup
```

## Environment

| Variable | Purpose |
|----------|---------|
| `ANALYTICS_IP_SALT` | Salt for IP hashing (optional) |
| `MAXMIND_DB_PATH` | Path to `GeoLite2-City.mmdb` (default: `data/GeoLite2-City.mmdb`) |
| `DATABASE_URL` | PostgreSQL for Prisma models |

Download MaxMind GeoLite2 City (free registration): place `GeoLite2-City.mmdb` in `data/` (gitignored).

## Scheduled jobs

Run daily at 02:00 (cron or host scheduler):

```bash
npm run analytics:rollup
npm run analytics:cleanup
```
