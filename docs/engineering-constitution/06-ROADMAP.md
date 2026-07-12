# Roadmap

**Status:** Blueprint v1 · Aligns with [04-IMPLEMENTATION-PHASES](./04-IMPLEMENTATION-PHASES.md) and `/.cursor-os/20_ROADMAP.md`

---

## Near term (after approval)

1. Ratify Constitution + skill adoption  
2. Layer boundary enforcement + prompt module registry  
3. Explicit model router (no publish change)  
4. Real-estate ontology matrix v1  
5. Corpus 250 + failure replay  

## Mid term

1. Corpus 1000 gate (nightly / subset on PR)  
2. Need-side knowledge retrieval RFC  
3. Question generation quality  
4. Typesense neighborhood decision (ship or ADR-reject)  
5. Eval dashboard for architects  

## Long term

1. Full vertical ontology parity (non-RE)  
2. Production hybrid cutover under SLO  
3. Self-audit / self-refactor loops under Cursor OS  
4. Matching fully driven by calibrated NeedDraft  

---

## Milestone definition of done

| Milestone | DoD |
|-----------|-----|
| M1 Constitution live | Docs + skill + Cursor rule pointer; approval table signed |
| M2 Understanding OS | Stage contracts + router metrics |
| M3 Ontology RE | Subtypes with required/optional/validation/match |
| M4 Corpus | 1000 frozen paragraphs; replay harness |
| M5 Knowledge | Need RAG without misusing business Typesense |

---

## Anti-roadmap (explicitly deferred)

- Replacing Next API with Nest
- LLM-gated publish
- Form-first redesign of `/post`
- Indexing neighborhoods in Typesense without RFC
