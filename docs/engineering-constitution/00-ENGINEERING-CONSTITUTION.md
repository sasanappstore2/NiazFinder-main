# NiazFinder Engineering Constitution

| | |
|---|---|
| **Version** | 1.0.0-draft |
| **Status** | Awaiting approval — **no large implementation until approved** |
| **Owners** | Claude Code (Chief Architect) · Cursor (Implementation Engineer) |
| **Supersedes** | Informal “form-first” thinking; does not void accepted ADRs without a new ADR |
| **Companion** | `/.cursor-os/` (operational boot) |

---

## 1. Project vision

NiazFinder is NOT an advertisement website.

NiazFinder is an AI-first Need Intelligence Platform.

The primary goal of the system is NOT collecting forms.

The primary goal is understanding human needs.

The form is only a structured representation of what the AI understood.

Every architectural decision must move the project closer to this vision.

---

## 2. Primary objectives

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

---

## 3. System philosophy

Never design features around forms.

Design features around understanding.

Forms are generated from understanding.

Every part of the project must reflect this philosophy.

**Operational corollary (current product):**

- Compose UX may auto-apply high-confidence fields in the background.
- Users correct on later steps; do not force chip-by-chip confirmation theater.
- Do not surface low-confidence category guesses (UI gate ≥ 0.85 for category auto-apply / chips).
- **Publish** remains deterministic and rules-authoritative ([ADR-001](../adr/001-intake-ai-strategy.md)).

---

## 4. Authority hierarchy

When sources disagree:

1. **Approved Engineering Constitution** (this document + pack) for *vision and layer boundaries*
2. **Accepted ADRs** (`docs/adr/`, `/.cursor-os/adr/`) for *binding technical decisions*
3. **Running code** + `prisma/schema.prisma` + `docker-compose.yml` + env maps for *factual current state*
4. **RFCs** for *in-flight design*
5. **Cursor OS** numbered docs for *agent operating procedure*
6. **Legacy docs / OBISIDIAN / PLAN reports** — context only; fix drift when found

**Halt rule:** If an implementation would violate Constitution vision or an accepted ADR, stop and open/update ADR or RFC. Do not silent-override.

---

## 5. Roles

### Claude Code — Chief Architect

Responsibilities:

- Architecture
- Planning
- RFC
- Reasoning
- Prompt Design
- AI Design
- Reviews
- Performance Reviews
- Security Reviews
- Scalability Reviews

Never become the primary implementation engine.

### Cursor — Implementation Engineer

Responsibilities:

- Implementation
- Refactoring
- Testing
- Execution
- Automation
- Bug Fixing
- Loop Execution

Never invent architecture.

Always follow the approved RFC.

---

## 6. System layers

Design the project as independent layers.

### Layer 1 — Need Understanding

Responsible for:

- NLP
- Intent detection
- Entity extraction
- Prompt orchestration
- Reasoning
- Structured extraction

**Code today (partial):** `src/intake/`, `src/lib/need-intake/`, `/api/intake/analyze`, hybrid runtime.

### Layer 2 — Knowledge Layer

Responsible for:

- category registry
- location registry
- ontology
- embeddings
- semantic search
- RAG
- taxonomy

**Code today (partial):** `src/config/categories`, location registries, Typesense business browse, pgvector where present, rules packs.  
**Gap:** Need-side semantic index ≠ business Typesense; neighborhoods not in Typesense.

### Layer 3 — Validation Layer

Responsible for:

- schema validation
- business rules
- confidence calibration
- ambiguity detection
- hallucination prevention

**Code today (partial):** `publishValidator`, required-field resolver, gap detectors, truth reconciler.

### Layer 4 — Draft Layer

Responsible for:

- current draft
- merge
- user locks
- history
- correction
- conflict resolution

**Code today (partial):** `NeedDraft`, merge policy, user locks, Zustand intake store.

### Layer 5 — Dynamic Schema Layer

Responsible for:

- category templates
- dynamic fields
- required fields
- dependencies
- conditional fields

**Code today (partial):** intake templates, section groups, schema evolution docs.

### Layer 6 — Presentation Layer

Responsible for:

- rendering
- missing field highlighting
- explanations
- confidence
- suggestions

Presentation layer must never contain AI logic.

**Code today (partial):** `NeedIntakePanel`, understanding card, template form renderers.

---

## 7. AI architecture (agent pipeline)

The AI should operate as an Agent.

The Agent should execute multiple stages.

```
Normalize
  → Intent
  → Category
  → Location
  → Entities
  → Field Extraction
  → Reasoning
  → Validation
  → Confidence
  → Draft Merge
  → Question Generation
  → Form Rendering
```

Every stage must be independent and testable.

See [02-AI-ARCHITECTURE.md](./02-AI-ARCHITECTURE.md).

---

## 8. Prompt engineering

Design a modular prompt system.

Never create one huge prompt.

Instead create:

```
System Prompt
  → Intent Prompt
  → Category Prompt
  → Location Prompt
  → Entity Prompt
  → Field Prompt
  → Validation Prompt
  → Repair Prompt
  → Question Prompt
  → Summary Prompt
```

Every prompt must have:

- version
- owner
- tests
- evaluation

See [10-PROMPT-ENGINEERING-STANDARDS.md](./10-PROMPT-ENGINEERING-STANDARDS.md).

---

## 9. Model routing

Do not always call the LLM.

Create intelligent routing.

```
Simple requests    → Rules only
Medium requests    → Rules + Local LLM
Complex requests   → Rules + Local LLM + Knowledge Retrieval
Fallback           → only when necessary
```

**Binding with ADR-001:** routing may assist **compose/understanding**; **publish** must not depend on LLM availability.

---

## 10. Real estate domain

Design the most complete real estate ontology possible.

Support (non-exhaustive target):

Residential · Commercial · Industrial · Land · Villa · Office · Shop · Warehouse · Garden · Farm · Short-term rental · Investment · Pre-sale · Mortgage · Rent · Sale

Every subtype must define:

- required fields
- optional fields
- relationships
- validation rules
- matching rules

See [12-REAL-ESTATE-ONTOLOGY.md](./12-REAL-ESTATE-ONTOLOGY.md).

---

## 11. Testing strategy

Testing must become part of the architecture.

Create:

- Unit Tests
- Integration Tests
- Golden Tests
- Regression Tests
- Prompt Evaluation
- AI Evaluation
- Scenario Tests
- Corpus Tests
- Failure Replay

Create a frozen corpus of at least **1000** realistic Persian real-estate paragraphs.

Every implementation must pass the corpus (target gate; expand toward 1000 deliberately — see [11-AI-EVALUATION-STANDARDS.md](./11-AI-EVALUATION-STANDARDS.md)).

**Current gates (must stay green meanwhile):** `test:post-pipeline`, `test:hybrid-intake-golden`, vertical expansion, lint/typecheck as applicable.

---

## 12. Quality loop

After every implementation execute:

```
Analyze
  → Test
  → Categorize Failures
  → Find Root Cause
  → Implement Minimal Fix
  → Replay Regression
  → Replay Entire Corpus
```

Repeat until green.

---

## 13. Documentation-first development

Before implementing any new feature, refactor, AI workflow or architecture:

1. Update or create the blueprint docs in this pack (and RFC if required).
2. State Current truth vs Target state.
3. List tests and success metrics.
4. Only then implement in Cursor.

---

## 14. Non-goals

- Becoming a classified-ads clone (آگهی‌محور)
- Form wizards that ignore free-text understanding
- LLM-dependent publish
- Presentation components that call models directly
- Illegal scraping / unauthorized data acquisition (connectors must be legal & consented)

---

## 15. Approval

| Role | Sign-off | Date |
|------|----------|------|
| Product owner | ☐ | |
| Chief Architect (Claude Code) | ☐ | |
| Implementation lead (Cursor process) | ☐ | |

Upon approval, bump status to **Accepted** and record ADR linking this Constitution as governing vision.
