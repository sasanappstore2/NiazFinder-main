# Phase 48 ? Edit & Resubmit Flow

**Prerequisite:** Phase 47 (`phase47Complete`)

## Scope (10 items)

| # | Item |
|---|------|
| 48.1 | route `/post/edit/[id]` |
| 48.2 | load ServiceRequest ? NeedDraft |
| 48.3 | wizard edit mode |
| 48.4 | publish ? update not create |
| 48.5 | re-moderation on edit |
| 48.6 | history version (optional) |
| 48.7 | dashboard edit link |
| 48.8 | edit field tests (10) |
| 48.9 | browse reflects edit |
| 48.10 | year-4 retro |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-edit
npm run verify:intake-phase -- --phase 48
```

## Next

**Phase 49 ? Schema v2 & Public API** (`INTAKE_PHASE49_KICKOFF.md`)
