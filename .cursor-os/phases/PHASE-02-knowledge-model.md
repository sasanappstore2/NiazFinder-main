# PHASE-02 — Knowledge Model

| | |
|---|---|
| **ID** | PHASE-02 |
| **Slug** | `knowledge-model` |
| **Status** | **open_for_design** (implementation blocked until RFC Approved) |
| **Depends** | Freeze ✓ · Charter **Accepted** ✓ · Lifecycle ✓ · Evidence Chain ✓ |

## Goal

Formalize the Knowledge Layer as a **World Model** (candidates + constraints), never a Decision Engine. Wire stewardship, versioning, and evidence — under Architecture Freeze.

## Gate (all PASS to open design)

```
Architecture Freeze        = PASS ✓
Red Lines                  = PASS ✓
Project Health Gate        = PASS ✓
Memory Completeness        = PASS ✓
Drift Report Critical      = 0 ✓
Architecture Score         >= 80 ✓
Knowledge Model Charter    = APPROVED ✓
Knowledge Lifecycle        = Present ✓
Evidence Chain             = Present ✓
```

## Mandatory workflow (no shortcuts)

```
Design  →  Audit (self-review vs Freeze/Charter)
  →  RFC finalization  →  Approve  →  Implementation  →  Tests  →  Docs/Memory
```

**Cursor must not write product/registry code until Phase 02 RFC is Approved.**

## Design deliverables (this stage)

- [ ] Inventory of Canonical registries (paths + owners) — design doc
- [ ] `knowledge.version` scheme landed in docs (Lifecycle already defines)
- [ ] Evidence Chain storage options compared (RFC section)
- [ ] RFC-0004 (or next id) Knowledge Model v1 — draft
- [ ] No code

## Architecture constraints

- Charter: Knowledge = World Model ≠ Decision Engine
- Evidence Chain required for NeedDraft bindings (Target)
- Typesense remains Search Only
- Presentation never calls LLM

## Definition Of Done (full phase)

- [ ] RFC Approved
- [ ] Implementation matches RFC only
- [ ] Tests green for touched Knowledge
- [ ] Memory + knowledge.version updated
- [ ] Freeze / Red Lines unbroken
- [ ] Exit criteria (Freeze §7) satisfied

## Links

- `.cursor-os/knowledge-model/KNOWLEDGE_MODEL_CHARTER.md`
- `.cursor-os/knowledge-model/KNOWLEDGE_LIFECYCLE.md`
- `.cursor-os/knowledge-model/KNOWLEDGE_EVIDENCE_CHAIN.md`
