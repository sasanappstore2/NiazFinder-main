# محدودیت‌های موتور onboard فایلینگ (ScrapeGraph + AI محلی)

## معماری

- **موتور واحد:** [Scrapegraph-ai-main](../../../../Scrapegraph-ai-main/) از طریق `estate-scrape`
- **LLM:** `NEED_INTAKE_LLM_URL` (MLX محلی، پیش‌فرض `:8100`)
- **Playwright سفارشی حذف شد** — فقط Chromium داخلی ScrapeGraph برای fetch/لاگین
- **ویزارد AI-only:** بدون مرورگر زنده؛ `POST /v1/filing-feed/ai-onboard`

## پشتیبانی‌شده

- پورتال‌های HTML کلاسیک با کارت‌های تکراری (showmelk، maskanyaban و generic)
- لاگین فرم username/password استاندارد → `storage_state` در `/tmp/filing-auth/`
- کشف صفحه لیست: heuristics DOM + SmartScraperGraph
- استخراج فایل‌ها: SmartScraperGraph + fallback Qwen
- فیلدهای املاک: کد فایل، معامله، محله، رهن/قیمت، متراژ، …

## پشتیبانی‌نشده

- **CAPTCHA** و **OTP پیامکی** — نیاز به `storage_state` دستی
- SSO / ورود با گوگل
- لاگین داخل iframe cross-origin
- SPA خالص JSON بدون HTML
- pagination پیچیده چندمرحله‌ای (فاز بعدی)

## عملیات

```bash
npm run dev:estate-scrape          # :8200
# NEED_INTAKE_LLM_URL برای ScrapeGraph LLM
npm run test:filing-scrapers
npm run test:filing-ai-onboard     # offline fixtures
```

## APIهای جدید

| Route | کاربرد |
|-------|--------|
| `POST /v1/filing-feed/ai-onboard` | لاگین + کشف + blueprint + preview نمونه |
| `GET /v1/filing-feed/ai-onboard/{jobId}/status` | polling job |
| `POST /v1/filing-feed/ai-scrape` | scrape با session ذخیره‌شده |

## تله‌متری

پاسخ onboard شامل `telemetry[]` با رویدادهای `login`، `discover`، `preview` است.

## گسترش رجیستری

1. fixture در `fixtures/filing-portals/{siteKey}/`
2. `expected.json` golden
3. `iran-portals.ts` → status `verified`
