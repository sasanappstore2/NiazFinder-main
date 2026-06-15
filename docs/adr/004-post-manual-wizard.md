# ADR 004: Post v2 ? manual wizard (AI deferred)

## Status

Accepted ? 2026-06

## Context

The `/post` need-intake flow previously depended on MLX/Qwen (analyze, assessment, SSE listing copy). Training artifacts and runtime coupling increased operational cost without stable UX guarantees.

## Decision

1. **Ship a fully manual 3-step wizard**: need text ? category/location/details ? template preview ? publish.
2. **Remove MLX runtime** from repo (`mini-services/intake-mlx`, train scripts, AI API routes).
3. **Keep `NeedDraft` and `POST /api/need-intake/publish`** contracts stable for future AI behind feature flags.
4. **Title/description** come from `composeListingFromDraft` + `resolveDeterministicListingTitle` only.

## Consequences

- No calls to `/api/intake/*` or port 8100 in the happy path.
- AI may be reintroduced later as optional enrichment, not a publish gate.
- Parser rules engine remains for legacy/tests; wizard `parsedIntent` is built from form fields (`buildParsedIntentFromForm`).
