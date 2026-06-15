# RFC: NeedDraft v2 (Additive Public API Schema)

**Status:** Accepted (Phase 49)  
**Tag:** `intake-public-api-v1`

## Summary

NeedDraft v2 is an **additive** envelope over v1. All publish-relevant fields (`needType`, `entities`, `sourceText`, scores) remain unchanged. v2 adds optional `publicMeta` for partner/mobile clients and sets `schemaVersion: 2`.

## Motivation

- Expose a stable **public REST API** (`/api/v1/intake/drafts`) for partners and mobile apps
- Track API channel metadata without breaking the existing `/post` wizard or v1 drafts
- Run a **2-week shadow migration** before enforcing v2 on all public clients

## Additive fields

```typescript
interface NeedDraftPublicMeta {
  clientId?: string;
  externalRef?: string;
  apiChannel?: 'web' | 'mobile' | 'partner';
  migratedFrom?: 'v1';
  shadowComparedAt?: string;
}

interface NeedDraftV2 extends NeedDraft {
  schemaVersion: 1 | 2;
  publicMeta?: NeedDraftPublicMeta;
}
```

## Non-goals (v2 does NOT)

- Rename entity keys
- Add required publish fields
- Change browse filter shape

Those require a breaking v3 bump per `docs/intake-schema-versions.md`.

## Migration

1. Client sends v1 draft or `X-NeedDraft-Schema-Version: 2`
2. Server runs `migrateNeedDraftV1ToV2()` + `shadowCompareNeedDraftV1V2()`
3. Shadow diffs logged; publish uses the same validator as web wizard
4. After shadow window, public API defaults to v2 responses

Implementation: `src/lib/need-intake/need-draft-v2-migration.ts`

## Compatibility

| Consumer | v1 | v2 |
|----------|----|----|
| /post wizard | ? primary | ? read-only |
| Public API | ? accept | ? preferred |
| Publish validator | ? | ? (same core) |

## Rollout

1. Enable `INTAKE_PUBLIC_API_ENABLED=true` in staging
2. Partner conformance suite (`npm run test:intake-public-api`)
3. Shadow compare for 2 weeks in production logs
4. Announce v0 route sunset per `docs/INTAKE_V0_DEPRECATION.md`
