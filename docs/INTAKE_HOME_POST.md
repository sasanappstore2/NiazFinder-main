# Homepage → Post Seamless

مسیر بدون درز از صفحهٔ خانه به `/post` با seed، شهر، دسته و تحلیل پس‌زمینه.

## جریان

1. کاربر در `HomeLeadLanding` نیاز را می‌نویسد و شهر را انتخاب می‌کند.
2. ناوبری با `buildHomeToPostSearchParams` — **seed + city + category + phone** در یک URL.
3. `/post` با `resolveHomeSeedLandingStep` مرحلهٔ اول را تعیین می‌کند.
4. اگر seed قوی باشد و `NEXT_PUBLIC_INTAKE_SKIP_NEED_STEP` فعال باشد → مستقیم **location** + analyze پس‌زمینه.
5. `IntakeSeamlessLoader` تا پایان enrich نمایش داده می‌شود.

## env

| متغیر | پیش‌فرض | معنی |
|--------|---------|------|
| `NEXT_PUBLIC_INTAKE_SKIP_NEED_STEP` | `true` | seed قوی (۴۰+ کاراکتر) مرحلهٔ need را رد می‌کند |

برای گروه کنترل A/B: `NEXT_PUBLIC_INTAKE_SKIP_NEED_STEP=false`

## analytics

| رویداد | زمان |
|--------|------|
| `intake_home_lead_submit` | ارسال از خانه |
| `intake_home_to_post` | mount پنل با seed |
| `intake_home_seed_analyze_complete` | پایان analyze اولیه |

## فایل‌ها

| فایل | نقش |
|------|-----|
| `home-post-seamless.ts` | URL، skip-step، infer category |
| `use-intake-home-seed-flow.ts` | analyze on mount |
| `IntakeSeamlessLoader.tsx` | loading برند |
| `HomeLeadLanding.tsx` | navigate atomic |

## تست

```bash
npm run test:home-post-seamless
npm run verify:intake-phase -- --phase 24
```
