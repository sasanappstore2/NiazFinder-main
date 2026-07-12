# AI architecture

**Status:** Blueprint v1  
**Constitution:** [00](./00-ENGINEERING-CONSTITUTION.md) · **ADR-001:** rules-first publish

---

## 1. Agent model

The AI operates as a **multi-stage agent**. Each stage:

- has a clear input/output contract
- is independently unit-testable
- may be rules-only, hybrid, or LLM-assisted per router
- never writes Presentation state directly (writes Draft / Validation outputs)

```
Normalize → Intent → Category → Location → Entities
  → Field Extraction → Reasoning → Validation → Confidence
  → Draft Merge → Question Generation → Form Rendering
```

**Form Rendering** is Presentation consuming Draft + Schema — not an LLM stage.

---

## 2. Stage contracts (summary)

| Stage | Input | Output | Typical engine |
|-------|-------|--------|----------------|
| Normalize | raw Persian text | normalized text, tokens | rules |
| Intent | normalized | intent / vertical hints | rules → LLM |
| Category | text + intent | category/subcategory + conf | registry + rules + LLM |
| Location | text + city scope | city, neighborhood, ambiguity | rules + registries |
| Entities | text + category | typed entities | rules + LLM |
| Field Extraction | entities + template | field map | rules + LLM |
| Reasoning | partial draft | inferred links / constraints | LLM sparingly |
| Validation | draft + schema | errors, gaps | rules |
| Confidence | field states | calibrated scores | rules + eval |
| Draft Merge | proposals + locks | NeedDraft | merge policy |
| Question Generation | gaps | clarification questions | rules (+ LLM polish) |
| Form Rendering | draft + template | UI | React only |

---

## 3. Model routing

```
Simple   → Rules only
Medium   → Rules + Local LLM
Complex  → Rules + Local LLM + Knowledge Retrieval
Fallback → escalate only when necessary
```

### Current truth (local)

- Hybrid flags may be on in `.env.local` (Gemma / llama-server).
- Production defaults in ENV_MAP often rules-leaning — **do not assume local = prod**.
- Category UI/auto-apply confidence floor: **0.85**.
- Smart-extract is proposal-oriented; intelligence draft is authoritative for entities.

### Forbidden

- Calling cloud LLM from Presentation components
- Blocking publish on LLM timeout
- One monolithic mega-prompt for all stages

---

## 4. Prompt modules

Each stage prompt (when LLM used) is a **versioned artifact**:

System · Intent · Category · Location · Entity · Field · Validation · Repair · Question · Summary

Requirements: version, owner, tests, evaluation — see [10-PROMPT-ENGINEERING-STANDARDS.md](./10-PROMPT-ENGINEERING-STANDARDS.md).

---

## 5. Hallucination controls

1. Prefer registry/rules hits over free generation for category & location.
2. Validate every LLM field against schema + business rules.
3. Low confidence → omit from UI / skip auto-apply (do not invent certainty).
4. Truth reconciler / repair prompt only with evidence spans when available.
5. Corpus + golden regression catch silent prompt drift.

---

## 6. Knowledge retrieval

Use retrieval for **complex** routes:

- category disambiguation packs
- location / neighborhood catalogs
- vertical field dictionaries
- prior correction telemetry (privacy-safe)

Typesense today indexes **business profiles**, not need paragraphs — need RAG must not pretend otherwise.

---

## 7. Observability

Log per stage: latency, route (rules|hybrid|llm), confidence histogram, discard reasons. Never log raw PII beyond retention policy (`docs/INTAKE_TELEMETRY.md`).
