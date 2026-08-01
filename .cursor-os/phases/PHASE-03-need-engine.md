# PHASE-03 — Need Engine

| | |
|---|---|
| **ID** | PHASE-03 |
| **Slug** | `need-engine` |
| **Status** | blocked_until_02 |
| **Depends** | PHASE-02 complete |

## Goal

Harden Need Understanding around **NeedDraft** (stages, contracts, merge) under Freeze. No bypass of NeedDraft or merge policy.

## Requirements

- Stage I/O clarity; dual-pipeline discipline
- RFC for behavioral architecture changes
- Health Gate + Freeze + Red Lines

## Bugfix under Freeze (parallel track)

Compose auto-apply defects (Audit 09) land via **[RFC-0004](../rfc/RFC-0004-compose-auto-apply-discipline.md)** (Accepted) without opening full Phase-03. Scope: location/draft gates, refuse-to-write, confidence parity — not Knowledge registry rewrite.

## Definition Of Done (preview)

- [ ] RFC/ADR as required
- [x] RFC-0004 Compose Auto-Apply Discipline (Accepted)
- [ ] Intake gates green (`post-pipeline`, merge as applicable)
- [ ] Memory updated; Freeze unbroken
