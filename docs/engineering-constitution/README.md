# Engineering Constitution — document map

**Status:** v1 blueprint (awaiting product/architect approval before large implementation waves)  
**Authority:** Source of truth for Claude Code (Chief Architect) and Cursor (Implementation Engineer)  
**Related boot:** `/.cursor-os/` (operational Cursor OS) · `docs/adr/` (accepted decisions)

> **Do not implement code** for new features / architecture / AI workflows until the Constitution is approved and the relevant RFC (if required) is accepted.

## Read order

1. [`00-ENGINEERING-CONSTITUTION.md`](./00-ENGINEERING-CONSTITUTION.md) — vision, layers, roles, hard gates  
2. Task packs below  
3. Align with running code + Prisma when “Current truth” differs from “Target”

## Task packs

| Task type | Read |
|-----------|------|
| Any architecture / new layer | 00, 01, 03, 07, 08 |
| Intake / AI / prompts | 00, 02, 10, 11, ADR-001 |
| Real-estate vertical | 00, 12, 04, existing `docs/INTAKE_*` |
| Testing / corpus / eval | 00, 11, 08, `docs/INTAKE_QUALITY_GATE.md` |
| Migration / rollout | 00, 05, 06, 07 |
| Coding / PR | 00, 09, `/.cursor-os/17_CODE_STYLE.md` |

## Document index

| # | File | Purpose |
|---|------|---------|
| 00 | [ENGINEERING-CONSTITUTION](./00-ENGINEERING-CONSTITUTION.md) | Permanent north star |
| 01 | [SYSTEM-ARCHITECTURE](./01-SYSTEM-ARCHITECTURE.md) | Layered system + service map |
| 02 | [AI-ARCHITECTURE](./02-AI-ARCHITECTURE.md) | Agent stages, routing, hybrid |
| 03 | [MODULE-DIAGRAM](./03-MODULE-DIAGRAM.md) | Modules & boundaries |
| 04 | [IMPLEMENTATION-PHASES](./04-IMPLEMENTATION-PHASES.md) | Ordered delivery phases |
| 05 | [MIGRATION-STRATEGY](./05-MIGRATION-STRATEGY.md) | From today → constitution target |
| 06 | [ROADMAP](./06-ROADMAP.md) | Multi-quarter roadmap |
| 07 | [RISKS](./07-RISKS.md) | Risks & mitigations |
| 08 | [SUCCESS-METRICS](./08-SUCCESS-METRICS.md) | KPIs / gates |
| 09 | [CODING-STANDARDS](./09-CODING-STANDARDS.md) | Implementation standards |
| 10 | [PROMPT-ENGINEERING-STANDARDS](./10-PROMPT-ENGINEERING-STANDARDS.md) | Modular prompts |
| 11 | [AI-EVALUATION-STANDARDS](./11-AI-EVALUATION-STANDARDS.md) | Eval / corpus / quality loop |
| 12 | [REAL-ESTATE-ONTOLOGY](./12-REAL-ESTATE-ONTOLOGY.md) | Domain ontology blueprint |

## Approval checklist

- [ ] Constitution reviewed by product owner
- [ ] Claude Code (architect) sign-off on layers + AI pipeline
- [ ] Conflicts with ADR-001 / Typesense / Nest-legacy resolved in writing
- [ ] Cursor skill discoverable: `.cursor/skills/niazfinder-engineering-constitution/`
- [ ] First implementation RFC linked from phase 1
