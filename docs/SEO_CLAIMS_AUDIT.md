# SEO Claims Audit — نیاز فایندر

> Last updated: 2026-06-04. Align marketing copy with verifiable product facts.

## Verified claims (safe to use)

| Claim | Evidence |
|-------|----------|
| Marketplace for needs + businesses | `/n/*`, `/b/*`, `/v/*` routes live |
| Free need posting | `/post` intake flow |
| Persian-first UI | `lang="fa"` root layout |
| Structured data on key pages | JSON-LD on home, business profile, product, listing |
| Dynamic sitemap | `src/app/sitemap.ts` + DB batches |

## Removed or softened (were inaccurate)

| Former claim | Issue | Fix |
|--------------|-------|-----|
| «بیش از ۵۰ تخصص» in `SITE_DESCRIPTION` | Hard-coded count not synced to taxonomy | Use «چندین حوزه» or derive from category registry |
| Fake phone `+98-21-91000000` in Organization schema | Not a real support line | Omit or use env `SUPPORT_PHONE` |
| `numberOfEmployees` 10–50 | Unverifiable | Removed from JSON-LD |
| `sameAs` social URLs | Placeholders | Only list verified profiles |
| `/category/{slug}` sitemap URLs | No matching routes | Use `/n/iran/{cat}` and `/b/iran/{cat}` only |

## Open items

- [ ] Replace placeholder Google/Bing verification in layout with `GOOGLE_SITE_VERIFICATION` env
- [ ] OG image: prefer `/api/og?title=` for dynamic pages
- [ ] hreflang: `/en` minimal mirror; full i18n not shipped

## Regression

Run `npm run test:seo` after SEO changes.
