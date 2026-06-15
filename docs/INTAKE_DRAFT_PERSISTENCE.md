# Draft Persistence ? `/post` wizard (Phase 37)

Local autosave for the intake wizard using **IndexedDB** (7-day TTL, last-write-wins).

## Features

| # | Feature | Module |
|---|---------|--------|
| 37.1 | IndexedDB adapter | `src/lib/need-intake/intake-draft-storage.ts` |
| 37.2 | Autosave every 30s | `src/hooks/use-intake-draft-autosave.ts` |
| 37.3 | Restore prompt on mount | `IntakeDraftRestorePrompt` + `use-intake-draft-restore.ts` |
| 37.4 | Expire after 7 days | `intake-draft-core.ts` |
| 37.5 | Optional obfuscation | `NEXT_PUBLIC_INTAKE_DRAFT_OBFUSCATE` |
| 37.6 | Conflict: last-write-wins | `resolveIntakeDraftConflict` |
| 37.7 | Clear on publish / clear form | `use-intake-publish.ts`, `/post` page |

## Environment

```bash
# Disable persistence entirely
# NEXT_PUBLIC_INTAKE_DRAFT_PERSISTENCE_ENABLED=false

# Override intervals (optional)
# NEXT_PUBLIC_INTAKE_DRAFT_AUTOSAVE_MS=30000
# NEXT_PUBLIC_INTAKE_DRAFT_TTL_DAYS=7

# Reversible base64 obfuscation (not encryption)
# NEXT_PUBLIC_INTAKE_DRAFT_OBFUSCATE=true
```

## Stored payload

- Wizard step, form fields, `needDraft`, `listingPreview`, `linkToBusinessProfile`
- `savedAt`, `deviceId`, schema `version: 1`
- **Not synced across devices** ? each browser profile has its own IndexedDB.

## Coexistence with session resume

`pending-intake-publish` (sessionStorage) still handles **login-then-publish** resume.
IndexedDB draft persistence handles **tab close / refresh** mid-wizard.

Restore prompt is skipped when:

- URL has `?seed=?` (new intent from home)
- Pending publish resume is queued
- User chose ????? ????? this session

## Verification

```bash
npm run test:intake-draft-persistence
npm run verify:intake-phase -- --phase 37
```

Release tag: `intake-draft-persistence-v1`
