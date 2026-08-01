---
title: "RFC-0001: Legal data connectors for intake corpora"
date: 2026-07-12
status: draft
authors: ["cursor-os-v1"]
---

# RFC-0001: Legal data connectors for intake corpora

## Summary

Define a **generic legal data connector** pattern so intake can be trained and stressed on realistic Persian need-like text from **allowed** sources (partner feeds, user export, licensed datasets, synthetic generators) — without encoding illegal scraping practices.

## Motivation

Scripts under `scripts/divar/*` and related estate stress tools already exist for corpus-style testing. Productizing without policy invites ToS/legal risk. Fixtures-only forever limits evaluation realism.

## Current truth

- Stress/batch scripts and caches exist for Divar-**style** titles
- Intake quality loops use scenario fixtures extensively
- OS policy (`01_SYSTEM_RULES.md`): no scrape-illegal guidance
- Open decision OD-20260712-04

## Proposed design

1. **Connector interface** (name TBD): `pullAllowedBatch(sourceId) → NormalizedNeedSeed[]`
2. Sources registered with: license/terms pointer, PII policy, retention TTL
3. Default CI uses **synthetic + committed fixtures** only
4. Live connectors behind explicit env + offline cache; never required for `check:all`
5. Map foreign categories → NiazFinder occupation/need taxonomy in pure functions
6. Store provenance fields on seeds (`source`, `externalId?`, `retrievedAt`) when persisted

## Detailed design (sketch)

- Keep implementation under `scripts/connectors/` or `src/lib/filing/` extensions — exact home TBD in implementation ADR
- Ban: CAPTCHA bypass, credential stuffing, rate-limit evasion recipes in docs/code comments
- Prefer user-pasted text and partner APIs

## Rollout plan

1. Document policy (this RFC + OS rules) — **now**
2. Normalize existing scripts’ comments to legal framing
3. Fixture pack freeze for CI
4. Optional partner connector behind flag
5. ADR for any production ingestion table

## Risks & ethics

- Accidental PII retention
- Contributors re-adding scrape helpers
- Trademark/ToS issues if naming third parties in product UI incorrectly

## Test plan

- Fixture-only self-tests remain default
- Connector unit tests with recorded fixtures (no live network in CI)

## Open questions

- Who approves a new source legally?
- Retention window for imported text?
- Should provenance appear on public need listings?

## Abort criteria

- Cannot obtain lawful access model
- CI depends on live third-party HTTP
- PII controls missing

## Expected ADRs

- Production ingestion persistence (if any)
- Category mapping ownership
