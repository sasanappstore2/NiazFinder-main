---
name: niazfinder-engineering-constitution
description: Defines and enforces the NiazFinder Engineering Constitution — AI-first Need Intelligence Platform architecture, layered system design, agent pipeline, prompt modules, model routing, real-estate ontology, corpus testing, and Claude/Cursor role split. Use before any new feature, refactor, AI workflow, architecture change, intake/need-engine work, prompt design, or RFC/ADR; when the user mentions Engineering Constitution, Need Understanding, or Documentation First.
---

# NiazFinder Engineering Constitution

## Hard gate (non-negotiable)

**Do not implement code** for a new feature, refactor, AI workflow, or architecture change until:

1. `.cursor-os/MISSION.md` boot completed (memory + ADRs + active phase).
2. `.cursor-os/ARCHITECTURE_FREEZE_v1.md` + `.cursor-os/RED_LINES.md` respected.
3. The relevant blueprint under [`docs/engineering-constitution/`](../../../docs/engineering-constitution/) has been read.
4. An approved RFC exists when the change is architectural or multi-phase.
5. For `/post`: [`docs/POST_SYSTEM_REPORT.md`](../../../docs/POST_SYSTEM_REPORT.md) consulted.
6. Project Health Gate PASS; Phase 01.5 complete before Phase 02+.
7. The work clearly advances **Need Understanding**, not form-first UX.

If the constitution pack is incomplete for the change, **extend the docs first**, then implement.

## Boot sequence

1. Read [`docs/engineering-constitution/00-ENGINEERING-CONSTITUTION.md`](../../../docs/engineering-constitution/00-ENGINEERING-CONSTITUTION.md)
2. Open [`docs/engineering-constitution/README.md`](../../../docs/engineering-constitution/README.md) for the doc map
3. Load the task pack from that README (architecture / AI / ontology / testing / migration)
4. Align with `/.cursor-os/` (operational boot) and existing ADRs under `docs/adr/` + `/.cursor-os/adr/`
5. Prefer **code + Prisma + docker-compose + ENV** over stale prose when docs conflict — then fix docs

## Roles

| Role | Agent | Must | Must not |
|------|-------|------|----------|
| Chief Architect | Claude Code | Architecture, planning, RFC, prompt/AI design, reviews | Become primary implementation engine |
| Implementation Engineer | Cursor | Implementation, refactor, tests, automation, bugfix, quality loops | Invent architecture; skip approved RFC |

Cursor always follows the approved RFC and this Constitution.

## Vision (verbatim)

NiazFinder is NOT an advertisement website.

NiazFinder is an AI-first Need Intelligence Platform.

The primary goal of the system is NOT collecting forms.

The primary goal is understanding human needs.

The form is only a structured representation of what the AI understood.

Every architectural decision must move the project closer to this vision.

## Primary objectives (verbatim)

The system must understand:

- user intent
- hidden intent
- category
- location
- entities
- dynamic attributes
- constraints
- preferences
- ambiguity
- confidence

The system should require as little manual input as possible.

The AI should perform the majority of the work.

The user should mainly verify and correct.

## System philosophy (verbatim)

Never design features around forms.

Design features around understanding.

Forms are generated from understanding.

Every part of the project must reflect this philosophy.

## Layer checklist (before coding)

Confirm which layer(s) you touch and that boundaries hold:

1. **Need Understanding** — NLP, intent, entities, prompts, reasoning, structured extraction
2. **Knowledge** — category/location registry, ontology, embeddings, semantic search, RAG, taxonomy
3. **Validation** — schema, business rules, confidence, ambiguity, hallucination prevention
4. **Draft** — current draft, merge, user locks, history, correction, conflict resolution
5. **Dynamic Schema** — templates, dynamic/required/conditional fields, dependencies
6. **Presentation** — render, highlight missing, explanations, confidence, suggestions — **never AI logic**

## Agent pipeline (stages must stay independent + testable)

Normalize → Intent → Category → Location → Entities → Field Extraction → Reasoning → Validation → Confidence → Draft Merge → Question Generation → Form Rendering

## Prompt system

Modular prompts only (version + owner + tests + evaluation each). Never one huge prompt.

System → Intent → Category → Location → Entity → Field → Validation → Repair → Question → Summary

## Model routing

Do not always call the LLM.

- Simple → Rules only
- Medium → Rules + Local LLM
- Complex → Rules + Local LLM + Knowledge Retrieval
- Fallback only when necessary

Publish remains **rules-authoritative** (ADR-001). Compose may use hybrid assist.

## Quality loop (after every implementation)

Analyze → Test → Categorize Failures → Root Cause → Minimal Fix → Replay Regression → Replay Corpus → repeat until green

Frozen Persian real-estate corpus (≥1000 paragraphs) is the long-term gate; until complete, run existing golden/hybrid/vertical gates and expand corpus deliberately.

## Progressive disclosure

| Topic | Doc |
|-------|-----|
| Constitution (source of truth) | [00-ENGINEERING-CONSTITUTION.md](../../../docs/engineering-constitution/00-ENGINEERING-CONSTITUTION.md) |
| System architecture | [01-SYSTEM-ARCHITECTURE.md](../../../docs/engineering-constitution/01-SYSTEM-ARCHITECTURE.md) |
| AI architecture | [02-AI-ARCHITECTURE.md](../../../docs/engineering-constitution/02-AI-ARCHITECTURE.md) |
| Module diagram | [03-MODULE-DIAGRAM.md](../../../docs/engineering-constitution/03-MODULE-DIAGRAM.md) |
| Implementation phases | [04-IMPLEMENTATION-PHASES.md](../../../docs/engineering-constitution/04-IMPLEMENTATION-PHASES.md) |
| Migration strategy | [05-MIGRATION-STRATEGY.md](../../../docs/engineering-constitution/05-MIGRATION-STRATEGY.md) |
| Roadmap | [06-ROADMAP.md](../../../docs/engineering-constitution/06-ROADMAP.md) |
| Risks | [07-RISKS.md](../../../docs/engineering-constitution/07-RISKS.md) |
| Success metrics | [08-SUCCESS-METRICS.md](../../../docs/engineering-constitution/08-SUCCESS-METRICS.md) |
| Coding standards | [09-CODING-STANDARDS.md](../../../docs/engineering-constitution/09-CODING-STANDARDS.md) |
| Prompt engineering standards | [10-PROMPT-ENGINEERING-STANDARDS.md](../../../docs/engineering-constitution/10-PROMPT-ENGINEERING-STANDARDS.md) |
| AI evaluation standards | [11-AI-EVALUATION-STANDARDS.md](../../../docs/engineering-constitution/11-AI-EVALUATION-STANDARDS.md) |
| Real-estate ontology | [12-REAL-ESTATE-ONTOLOGY.md](../../../docs/engineering-constitution/12-REAL-ESTATE-ONTOLOGY.md) |

Operational boot (infra truth, Typesense, git): `/.cursor-os/README.md`
