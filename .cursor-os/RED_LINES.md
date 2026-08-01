# RED LINES

**Cursor must never cross these lines.**  
No exceptions via “quick fix”, chat convenience, or “seems better”.  
Crossing requires an **Accepted ADR** (and usually an RFC) that explicitly amends Architecture Freeze / this file.

---

## Knowledge Layer (immutable principle)

> Knowledge Layer is a **World Model**, not a **Decision Engine**.

See `.cursor-os/knowledge-model/KNOWLEDGE_MODEL_CHARTER.md`.

---

## Absolute prohibitions

1. **Change core architecture** without Approved RFC **and** Accepted ADR.
2. **Bypass `NeedDraft`** as the structured source of truth on intake → publish.
3. **Connect Presentation directly to an LLM** (or any model HTTP client).
4. **Use LLM for publish or final validation authority.**
5. **Remove, weaken, or sidestep the Rule Engine** without formal architecture decision.
6. **Change API contracts or Prisma/schema** without impact analysis + documentation (and migration plan when needed).
7. **Let Typesense decide** need category, NeedDraft, or publish.
8. **Make LLM the source of truth** when it conflicts with Rule Engine / publishValidator / merge policy.
9. **Lower category auto-apply confidence below 0.85** without ADR.
10. **Reintroduce compose verification/gap/location-ambiguity prompt theater** without RFC (contradicts frozen UX).
11. **Add Nest product APIs** (Next.js owns APIs; Nest is legacy).
12. **Start a new phase** while Project Health Gate fails or Architecture Freeze is violated.
13. **Implement Future Ideas / Out of Scope** items from `ARCHITECTURE_FREEZE_v1.md` as if approved.
14. **Treat conversation history as Source of Truth.**
15. **Commit** unless the user explicitly asks; on failed required tests → rollback — do not “push through”.

---

## If tempted

1. Stop.
2. Open or update RFC/ADR.
3. Park idea under Freeze § Future Ideas if not approved.
4. Do not write product code.

---

## Authority

| Higher | File |
|--------|------|
| Freeze | `.cursor-os/ARCHITECTURE_FREEZE_v1.md` |
| Mission | `.cursor-os/MISSION.md` |
| This file | Non-negotiable agent constraints |

Conflict with a casual user request that violates red lines → **reject the approach**, explain which red line, propose lawful path (RFC/ADR).
