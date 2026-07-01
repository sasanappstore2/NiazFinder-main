# ADR-002: Event-Driven Pipeline

## Status

Accepted — 2026-06-27

## Context

Crawl stages were implicit function calls with no audit trail or downstream hooks.

## Decision

Publish **domain events** (`PageDiscovered`, `EntityCreated`, `ProviderFailed`, …) from
`CrawlPipelineOrchestrator` via `EventBus`. Handlers are pluggable (analytics, alerts, search index).

## Consequences

- Events are in-process (`InMemoryEventBus`) initially; Redis pub/sub later without API change
- Downstream workflows decouple from orchestrator internals
