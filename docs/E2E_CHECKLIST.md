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

## Need intake
- [ ] `/post` intake flow starts
- [ ] `npm run test:intake-parser` passes
- [ ] `npm run test:typing-analysis` passes

## API smoke
- [ ] `npm run smoke:api` — all green
- [ ] `npm run smoke:routes` — all green

## Super-admin (optional)
- [ ] `/super-admin` loads for SUPER_ADMIN phone
- [ ] Moderation queue visible after migration

## Mini-services (optional)
- [ ] Nest `http://localhost:4000/api/health` OK
- [ ] Chat socket connects (browser network tab)
