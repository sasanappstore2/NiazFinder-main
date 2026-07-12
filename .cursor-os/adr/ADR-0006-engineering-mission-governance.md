# ADR-0006: Engineering Mission as governing operating law

| | |
|---|---|
| **Status** | Draft |
| **Date** | 2026-07-12 |
| **Deciders** | Engineering Lead / Product (pending) |

## Context

Agents and humans risk context drift, form-first features, and LLM authority creep. Cursor OS v1 and Engineering Constitution exist but need a single **Mission** boot with strict SoT order and one-phase execution.

## Decision

1. Adopt `.cursor-os/MISSION.md` as the Engineering Lead operating law for agents.
2. Source of Truth priority: POST_SYSTEM_REPORT → Constitution → RFC → ADR → Current State → DB → Prisma → API contracts → Types → Source Code (code wins doc conflicts).
3. Mandatory memory boot before non-trivial work.
4. RFC-driven features; ADR before architectural code.
5. One phase at a time via `.cursor-os/phases/`.

## Consequences

- Slower “quick hacks”; stronger architecture preservation
- Constitution remains vision/layers law; Mission remains agent execution law
- Phase 00 must complete before feature phases

## Alternatives

- Single mega-prompt only — rejected (token limits, drift)
- Constitution alone without Mission — weaker agent boot discipline
- Freeform Cursor — rejected (history of ambiguity-UI / loop / Typesense doc drift)

## Acceptance

- [ ] Product / architect sign-off
- [ ] Cursor rule wired
- [ ] Phase 00 DoD otherwise complete
