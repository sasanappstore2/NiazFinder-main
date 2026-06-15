# RFC: Intake Schema Governance Board

**Status:** Accepted (Phase 50.5)  
**Tag:** `intake-governance-v1`

## Purpose

Establish a lightweight governance process for `NeedDraft` schema changes across 50 intake phases ? preventing breaking changes without migration, shadow period, and conformance recertification.

## Board responsibilities

| Area | Owner | Gate |
|------|-------|------|
| Entity key renames | Platform + ML | v2+ migration + golden matrix |
| New required publish fields | Product + Legal | `publishValidator` + 2-week shadow |
| Public API contract | Partner eng | OpenAPI bump + conformance suite |
| Canary needTypes | Vertical leads | `INTAKE_CANARY_NEED_TYPES` env |

## Change classes

1. **Additive (no bump)** ? optional `publicMeta`, new needType with same requiredFields
2. **Minor (v1.1)** ? new optional entities; run `test:draft-roundtrip`
3. **Major (v2+)** ? rename keys, browse shape change; RFC required

## Approval workflow

1. Author opens RFC in `docs/rfc/`
2. Run `npm run test:intake-governance` + affected vertical tests
3. Shadow publish 2 weeks (`NEED_INTAKE_SHADOW_PUBLISH`)
4. Super-admin enables canary list if experimental
5. Quarterly recert: `runConformanceRecertification()` (90-day default)

## References

- `docs/intake-schema-versions.md`
- `docs/rfc/NEED_DRAFT_V2.md`
- `src/lib/need-intake/intake-conformance-recertification.ts`
