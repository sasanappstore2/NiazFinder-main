# Stage 6 — Final measurement (before / after)

**Baseline:** `reports/perf-baseline.json` (2026-06-24, pre-optimizations)  
**Final:** `reports/perf-final.json` (2026-06-24, after stages 0–4)

## Summary

| Metric | Baseline | Final | Notes |
|--------|----------|-------|-------|
| Top chunk #1 | 1724 KB | 1724 KB | Unchanged — dominated by map/voice bundles |
| Top chunks #2–4 | ~1421 KB ×3 | ~1421 KB ×3 | Same hashed chunk names |
| Top chunk #5 | 1048 KB | 1047 KB | ~1 KB delta (hash churn) |
| `mapbox-gl` in `.next/static` chunks | 5 files | 5 files | Stage 1 SKIP — static import in `NiazMapCore.tsx` |
| `maplibre` in chunks | — | 15 files | Default map engine |
| Raw `<img>` (plan scope: 3 files) | 3 | 0 | `ChatMessageItem`, `PortfolioGallery`, `ProductImageLightbox` |
| Raw `<img>` (all `src/`) | 3 (scoped) | 14 tags in 10 files | Out of plan scope (chat lightbox, social, RE panels) |
| PWA / service worker | — | Not added | Stage 5 cancelled — Turbopack vs webpack config conflict |
| Cache headers (fonts/icons) | Security only | + immutable 1y | `/fonts/*`, `/logo.svg`, icon PNGs |
| Category embedding warmup | Always in prod | `WARMUP_ENABLED=true` only | Light warmups unchanged |

## Top 5 JS chunks (final)

| File | Size (KB) |
|------|-----------|
| `0~1.rf0-x75ic.js` | 1724 |
| `05agtslien-wm.js` | 1421 |
| `0cu3b4d46z5h5.js` | 1421 |
| `0yrh98j8p4g4q.js` | 1421 |
| `0mm-zpv4.ycza.js` | 1047 |

**Total chunk JS:** ~18,699 KB across 210 files.

## Changes delivered

1. **Stage 0** — `@next/bundle-analyzer` wrapper in `next.config.ts`; baseline captured.
2. **Stage 1** — `mapbox-gl` uninstall skipped; see `reports/perf-stage-1-mapbox.md`.
3. **Stage 2** — Three identified files migrated to `next/image`; no new `remotePatterns` (MinIO env sufficient).
4. **Stage 3** — Long-cache headers for fonts and PWA icons (paths match `public/` layout).
5. **Stage 4** — `warmCategoryEmbeddingIndex` guarded by `WARMUP_ENABLED`; documented in `.env.example`.
6. **Stage 5** — PWA cancelled; see `reports/perf-stage-5-pwa.md`.
7. **Stage 6** — This report; `ANALYZE=true npm run build` succeeded.

## Hard constraints respected

- No changes to `store.ts`, `api-client.ts`, `middleware.ts`, `prisma/schema.prisma`, voice/gateway/call paths.

## Recommended next phase (not in this plan)

1. **Mapbox code-split** — dynamic import in `NiazMapCore.tsx` when engine is maplibre (largest JS win).
2. **Remaining `<img>` tags** — chat/social/RE widgets (10 files) if image optimization is desired site-wide.
3. **PWA** — `next build --webpack` + maintained PWA plugin, or hand-written service worker.
