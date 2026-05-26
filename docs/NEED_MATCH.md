# Need detail — business matching

## Flow

1. **Viewport (`NeedBriefingPanel`)** — compact need summary without scrolling.
2. **Scroll** — `GET /api/requests/:id/matched-businesses` loads ranked businesses (lazy via IntersectionObserver).
3. **Owner** — collapsible `OwnerProposalsSection` for incoming proposals.

## AI

Uses same env as need intake:

- `NEED_INTAKE_AI_ENABLED` — LLM re-ranking of candidates
- Fallback: rule-based category/city/keyword scoring

## Files

- `src/lib/need-match/*`
- `src/app/api/requests/[id]/matched-businesses/route.ts`
- `src/components/need/NeedBriefingPanel.tsx`
- `src/components/need/MatchedBusinessesSection.tsx`
