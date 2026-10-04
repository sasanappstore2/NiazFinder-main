# ADR-004: Immutable Layered Persistence

## Status

Accepted — 2026-06-27

## Context

Overwriting raw HTML loses audit/debug capability when extraction rules change.

## Decision

`LayeredCrawlStorage` appends immutable artifacts: raw HTML, markdown, extracted JSON,
normalized entities, embeddings, media, logs, errors, metrics. Dedupe by `contentHash` on raw layer.

## Consequences

- Storage growth requires retention policy (future cron)
- Re-extraction pipelines can replay from raw without re-crawl
