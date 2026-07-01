# Filing Redesign — Adoption Report

Generated: 2026-06-30

## Summary

Six-iteration redesign of the full `/f` filing ecosystem against ~50 global + Iranian real-estate portals.

| Surface | Key changes |
|---------|-------------|
| **Browse** `/f` | Unified `filing-golden.css` tokens, photo-left list cards, sticky filter rail, segmented category pills |
| **Filters** | Chip scroll row, grouped bottom sheet, orphan `FilingFilterBar` merged into `FilingBrowseFilterPanel` |
| **Detail** `/f/[id]` | Multi-image carousel, primary/secondary price hierarchy, compact broker aside |
| **Mobile** | 4-button action bar (call, share, request, browse) |

## Benchmark capture

- Script: `npm run test:filing-benchmark-capture`
- Manifest: `scripts/filing/benchmark-manifest.json` (50 sites)
- Output: `reports/filing-benchmark/*/external/`
- Expected: many global sites skip (403/CAPTCHA); Iranian + maskanyaban capture reliably

## Local visual QA

- Script: `npm run test:filing-visual-qa`
- Baseline: `reports/filing-benchmark/local-iter-0/` (9/9 passed)
- Post-redesign: `reports/filing-benchmark/local-iter-1/` (9/9 passed)

## Patterns adopted

See `scripts/filing/design-patterns.json` and `reports/filing-benchmark/final/compare.html`.

| Pattern | Source inspiration | NiazFinder implementation |
|---------|-------------------|---------------------------|
| Above-fold hierarchy | Zillow, Bayut, maskanyaban | `filing-scan-hero` |
| Gallery carousel | Zillow, Redfin | `FilingGalleryCarousel` |
| Price primary/secondary | Bayut, Rightmove | `.item--primary` / `.item--secondary` |
| Photo-left list card | Rightmove, maskanyaban, Divar | `.filing-list-card` |
| Sticky filter rail | Zillow, Rightmove | `.filing-browse-filter-rail` |
| Segmented categories | Zillow, Redfin | `.filing-category-segments` |
| Filter bottom sheet | Zillow mobile, Divar | `FilingBrowseFilterSheet` |
| RTL price + تومان | maskanyaban | Persian digits throughout |

## Tests

```
npm run test:filing-detail-sections  ✓
npm run test:filing-field-parity      ✓
npm run test:filing-visual-qa         ✓ 9/9
```

## Files changed

- `src/styles/filing-golden.css` — browse + gallery + filter tokens
- `src/components/workspace/filings/PropertyFilingGridCard.tsx`
- `src/components/filing/FilingBrowseShell.tsx`
- `src/components/filing/FilingBrowseFilterPanel.tsx`
- `src/components/filing/FilingCategoryBar.tsx`
- `src/components/filing/FilingBrowseFilterSheet.tsx`
- `src/components/filing/FilingFilterBar.tsx` — alias re-export
- `src/components/filing/detail/FilingMaskanYabanCard.tsx`
- `src/components/filing/detail/FilingGalleryCarousel.tsx` (new)
- `src/components/filing/detail/FilingMobileActionBar.tsx`
- `scripts/filing/*` — benchmark + QA tooling
