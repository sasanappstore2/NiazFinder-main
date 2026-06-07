# E2E Verification Checklist

Run after major changes. Mark each item PASS/FAIL.

## Auth & navigation
- [ ] Login / register modal works
- [ ] User menu → پروفایل, داشبورد, کسب‌وکار من
- [ ] `/dashboard` tabs: نیازهای من, کیف پول, پروفایل

## Business profile
- [ ] `/pro/{slug}/edit` loads all 4 sections
- [ ] PATCH `/api/business/me` saves name/slug
- [ ] Public `/b/{slug}` reflects changes

## Marketplace
- [ ] `/n/iran` needs browse loads
- [ ] `/b/iran` business browse loads
- [ ] Location/neighborhood filters apply

## Need intake (/post — rules-only launch)
- [ ] `/post` intake flow starts (not `/v2`)
- [ ] Home estate sample chips fill composer and navigate to `/post`
- [ ] Analyze API returns `meta.engine: intake-rules` with `NEED_INTAKE_LLM_ENABLED=false`
- [ ] Ambiguous neighborhood shows disambiguation chips on location step
- [ ] Preview step highlights empty title/description before publish
- [ ] `NEED_INTAKE_LLM_ENABLED=false npm run test:post-estate-scenarios` passes
- [ ] `npm run test:intake-parser` passes
- [ ] `npm run test:typing-analysis` passes
- [ ] `npm run test:publish-validator` passes

### Estate manual paths (staging)
- [ ] مشهد: فرامرز عباسی، سجاد/زمین، کوهسنگی، نسترن ملک‌آباد، جلال آل احمد
- [ ] تهران: ونک (resolved), آزادی (ambiguous — no auto-confirm)
- [ ] Deal types: buy, rent, rahn_full, rahn_ejare
- [ ] Edge: «130 متری» → area not deposit; «پروانه» → land not rent
- [ ] 3 real publishes on staging with phone at publish/login only

## API smoke
- [ ] `npm run smoke:api` — all green
- [ ] `npm run smoke:routes` — all green

## Super-admin (optional)
- [ ] `/super-admin` loads for SUPER_ADMIN phone
- [ ] Moderation queue visible after migration

## Mini-services (optional)
- [ ] Nest `http://localhost:4000/api/health` OK
- [ ] Chat socket connects (browser network tab)
