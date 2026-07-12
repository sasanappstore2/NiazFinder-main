---
title: "RFC-0002: Typesense neighborhood indexing (optional)"
date: 2026-07-12
status: draft
authors: ["cursor-os-v1"]
---

# RFC-0002: Typesense neighborhood indexing (optional)

## Summary

Evaluate whether business browse should filter neighborhoods inside Typesense or permanently keep DB-side neighborhood filtering (status quo per ADR-0002).

## Motivation

Neighborhood (محله) is a primary UX facet in Iranian cities. DB filters work but may limit pure Typesense query plans as scale grows.

## Current truth

- Typesense schema has city/province/geopoint — **no neighborhood**
- Browse passes `neighborhoods` / `neighborhoodCity` into `listBusinesses`
- Parity test: `test:neighborhood-filter-parity`
- Open decision OD-20260712-01

## Proposed design (options)

### Option A — Status quo (DB filter)

- Keep Typesense for text/category/city; intersect neighborhood in Prisma
- Pros: no reindex; simpler schema
- Cons: hybrid query complexity

### Option B — Index neighborhood slugs/ids

- Add `neighborhood` `string[]` (or single) facet
- Backfill from `BusinessLocation` / profile fields (define source of truth)
- Reindex; update mapper + sync
- Pros: one engine filters
- Cons: data quality, multi-location businesses, ADR + migration

### Option C — Geo-only

- Rely on geopoint + radius; neighborhoods as UI labels only
- Pros: simpler index
- Cons: UX mismatch with named محله filters

## Rollout plan

1. Measure current browse latency & cardinality
2. Choose option with product
3. If B: ADR superseding gap section of ADR-0002; expand/contract schema; dual-read; reindex; parity tests
4. Feature flag if needed

## Risks & ethics

- Wrong neighborhood on profile → wrong discovery
- Reindex downtime — mitigate with Prisma fallback

## Test plan

- Neighborhood parity expanded
- Sync + empty/full reindex dry runs
- Fallback with Typesense disabled

## Open questions

- Single vs multi neighborhood per business?
- Slug vs Persian name in index?
- Who curates neighborhood gazetteer?

## Abort criteria

- No clean source field on profiles
- Parity cannot be maintained
- Reindex too costly vs benefit

## Expected ADRs

- Supersession note on ADR-0002 if Option B lands
