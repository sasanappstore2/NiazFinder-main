# PHASE-05 — Hybrid AI

| | |
|---|---|
| **ID** | PHASE-05 |
| **Slug** | `hybrid-ai` |
| **Status** | blocked_until_04 |
| **Depends** | PHASE-04 complete |

## Goal

Hybrid / Gemma as **semantic assist only**. Soft-fail to rules. Never publish/validation authority.

## Requirements

- Freeze LLM rules
- Presentation never calls LLM
- Prod vs local env labeled
- RFC-0003 for prod cutover (do not silently enable prod LLM)

## Definition Of Done (preview)

- [ ] Hybrid golden / soft-fail documented
- [ ] No publish dependency on LLM
- [ ] Memory + Freeze intact
