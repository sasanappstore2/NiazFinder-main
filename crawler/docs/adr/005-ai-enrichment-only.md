# ADR-005: AI Enrichment Boundary

## Status

Accepted — 2026-06-27

## Context

LLM usage was mixed into scrape paths (ScrapeGraph, Qwen fallback), blurring fetch vs enrich.

## Decision

**AI never crawls.** `EnrichmentPipeline` only accepts `NormalizedProperty` and returns
`EnrichedProperty`. Tasks: geo, amenities, embeddings, category inference, confidence scoring.

## Consequences

- Provider swaps don't affect AI layer
- LLM outages degrade enrichment, not crawl availability
