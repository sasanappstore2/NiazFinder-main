# GOALS

Ordered for Engineering Lead decisions. Update when a phase completes.

## Active goals (Phase 0)

1. Establish durable Engineering OS (this memory + phases + mission) — **in progress**
2. Keep architecture intact above feature velocity
3. Keep `/post` rules-first publish and NeedDraft-centric pipeline green
4. Ratify Engineering Constitution (approval table still open)

## Near-term goals (after Phase 0)

1. Complete Phase 01 (OS hardening / SoT discipline) Definition of Done
2. Maintain `test:post-pipeline` and merge-policy greens
3. Grow Persian RE corpus toward Constitution target (≥1000) without weakening gates
4. Explicit model router without making LLM authoritative

## Success criteria (platform)

- Manual field touches per publish ↓
- Category auto-apply precision @ ≥0.85 high
- Zero Presentation→LLM imports
- Zero publish paths that skip `publishValidator`
- RFC for every architectural feature

## Anti-goals

- Parallel multi-phase implementation
- “Quick” architecture shortcuts
- Chat-memory-driven decisions
