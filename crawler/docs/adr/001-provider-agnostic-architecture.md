# ADR-001: Provider-Agnostic Crawler Architecture

## Status

Accepted — 2026-06-27

## Context

Filing crawls were tightly coupled to `estate-scrape` (Python + Playwright + ScrapeGraph).
Adding Firecrawl or new portals required touching orchestration, UI, and import code.

## Decision

Introduce **CrawlProviderContract** as the sole transport boundary. All providers
(Firecrawl, Playwright, HTTP, API, legacy) implement identical methods + capability flags.
Business logic (Persian normalization, deal types, DB import) stays in `src/lib/filing-scrapers`.

## Consequences

- Firecrawl SDK is confined to `crawler/providers/firecrawl/`
- New portals add a source config row, not a new code path in `runner.ts`
- Slight adapter overhead; large maintainability win
