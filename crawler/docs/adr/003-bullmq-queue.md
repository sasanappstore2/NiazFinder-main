# ADR-003: BullMQ with Memory Fallback

## Status

Accepted — 2026-06-27

## Context

V2 used an in-memory queue unsuitable for multi-worker production crawls.

## Decision

Implement **BullMQ** queue behind `CrawlQueue` interface. Default driver remains `memory` for
local dev. Production sets `CRAWLER_QUEUE_DRIVER=bullmq` + `CRAWLER_REDIS_URL`.

## Consequences

- Optional `bullmq` dependency (dynamic import)
- Job metadata in Redis; raw artifacts in layered storage (future: S3)
- Workers scale horizontally with concurrency + rate limiter
