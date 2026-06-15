# NeedDraft Schema Versioning

## Current version: `1` (documented as v1.0)

All `NeedTypeDefinition` entries in `src/intake/schema/needTypes.ts` use `schemaVersion: NEED_DRAFT_SCHEMA_VERSION` (`1`).

`NeedDraft.schemaVersion` is set from `resolveNeedType()` ? `needTypeDef.schemaVersion` in `recomputeNeedDraft()` (`src/intake/aggregate/needDraftAggregate.ts`).

Contract constant: `NEED_DRAFT_SCHEMA_VERSION` in `src/contracts/need-intake.ts`.

Phase 4 enforcement (2026-06-09):

- `ensureNeedDraftContract()` normalizes missing `schemaVersion` before recompute
- `syncIntakeSourceTextFromForm()` is the single `sourceText` sync rule
- `warnLegacyWriteDetected()` throws in dev on direct `parsedIntent`/`answers` writes
- `npm run test:draft-roundtrip` guards analyze ? draft ? lock ? publish shape

## Rules for upgrades

| Change type | Version bump | Migration |
|-------------|--------------|-----------|
| Add optional entity field | 1 ? 1 (same) | None |
| Add required publish field | 1 ? 1.1 or 2 | Shadow publish + golden tests |
| Rename entity key | 2 | `migrateNeedDraftV1ToV2()` script |
| Change `requiredFields` per needType | 1.1 | Update `publishValidator` + golden matrix |
| Break browse filter shape | 2 | `publish-browse-parity` must pass |

## v1.0 ? v1.1 (additive only ? planned)

Allowed in v1.1 without breaking existing drafts:

- New **optional** entity keys (e.g. `buildingAge`, `parking`)
- New UX-only fields on `NeedDraft` (not in publish gate)
- Additional `needType` entries with `schemaVersion: 1` if `requiredFields` unchanged

Not allowed without v2:

- Renaming entity keys
- New **required** publish fields on existing needTypes
- Removing deprecated fields still read by `draftToLegacyPayload`

Migration checklist for v1.1:

1. Update `NEED_TYPES` + golden matrix
2. Run `test:post-pipeline` + `test:draft-roundtrip`
3. Shadow publish 2 weeks (`NEED_INTAKE_SHADOW_PUBLISH`)
4. Bump `NEED_DRAFT_SCHEMA_VERSION` only when breaking

## Storage locations

- Contract: `src/contracts/need-intake.ts` ? `NeedDraft.schemaVersion`
- DB embed: `ServiceRequest` V2 snapshot via `serviceRequestV2.ts`
- Publish API: `src/app/api/need-intake/publish/route.ts` logs `schemaVersion`

## v2.0 (additive — Phase 49)

Shipped as `intake-public-api-v1`:

- `NeedDraftV2` adds optional `publicMeta` (`clientId`, `externalRef`, `apiChannel`)
- `schemaVersion: 2` set on public API create; publish core unchanged
- Migration: `migrateNeedDraftV1ToV2()` + `shadowCompareNeedDraftV1V2()`
- RFC: `docs/rfc/NEED_DRAFT_V2.md`
- Contract: `src/contracts/need-draft-v2.ts`

Shadow window: 2 weeks before requiring `X-NeedDraft-Schema-Version: 2` from partners.

## Phase 49 (public API) — complete

- `POST /api/v1/intake/drafts` + `POST .../publish`
- OpenAPI: `docs/openapi/intake-v1.openapi.yaml`
- API key auth + tiered rate limits
- Conformance: `npm run test:intake-public-api`
