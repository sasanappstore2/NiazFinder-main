# Intake Edit & Resubmit (Phase 48)

**Tag:** `intake-edit-resubmit-v1`  
**Prerequisite:** `intake-scale-v1` (`phase47Complete`)

## Flow

```
Dashboard ? /post/edit/[id] ? load GET /api/need-intake/edit/:id
         ? wizard (edit mode) ? PUT /api/need-intake/update/:id
         ? re-moderation queue (if was APPROVED/REJECTED_SOFT)
```

## Owner policy

Only the listing owner can edit. Blocked: `REJECTED_FINAL`, `CANCELLED`, `CLOSED`.

Env: `INTAKE_EDIT_ENABLED` (default `true`).

## Mapper (48.2)

`mapServiceRequestToNeedDraft` rebuilds `NeedDraft` from `dynamicAnswers.serviceRequestV2` + row fields.

## Update vs create (48.4)

`PUT /api/need-intake/update/:id` updates the same `ServiceRequest` (slug preserved). Duplicate gate excludes self.

## Edit history (48.6)

Optional versions in `dynamicAnswers.intakeEditHistory` (max 20).

## Phase checklist

| # | Item | Location |
|---|------|----------|
| 48.1 | `/post/edit/[id]` | `src/app/(main)/post/edit/[id]/page.tsx` |
| 48.2 | ServiceRequest ? NeedDraft | `map-service-request-to-draft.ts` |
| 48.3 | wizard edit mode | `use-need-intake-panel.ts` |
| 48.4 | update not create | `intake-update-service.ts` |
| 48.5 | re-moderation | `enqueueRequestModerationJob` |
| 48.6 | history version | `intake-edit-history.ts` |
| 48.7 | dashboard link | `UserDashboard.tsx` |
| 48.8 | 10 field tests | `intake-edit-field-cases.ts` |
| 48.9 | browse reflects edit | `intake-edit-browse-parity.ts` |
| 48.10 | year-4 retro | `INTAKE_YEAR4_RETRO.md` |

## Verify

```bash
npx tsc --noEmit
npm run test:intake-edit
npm run verify:intake-phase -- --phase 48
```
