# AI evaluation standards

**Status:** Blueprint v1

---

## 1. Evaluation is architecture

No LLM stage ships without:

- offline fixtures
- defined metrics
- failure replay path

---

## 2. Test types

| Type | Purpose |
|------|---------|
| Unit | Stage pure functions |
| Integration | analyze API / merge / publish |
| Golden | known Persian inputs → expected structured fields |
| Regression | prior bugs stay fixed |
| Prompt evaluation | module-level scored outputs |
| AI evaluation | end-to-end understanding quality |
| Scenario | multi-turn correction / locks |
| Corpus | frozen paragraph set |
| Failure replay | re-run recorded failures |

---

## 3. Corpus policy

**Target:** ≥ **1000** realistic Persian real-estate paragraphs, frozen (content-addressed / versioned).

Rules:

1. No PII of real people without consent; prefer synthetic / anonymized.  
2. Cover rent/sale, residential/commercial, ambiguity, multi-city, slang, typos.  
3. Labels reviewed; confidence expected + must-abstain cases.  
4. Implementations that touch understanding **must** run corpus subset + full corpus on release trains.  

**Until 1000 exists:** grow deliberately (Phase 7→8); never claim corpus-complete.

---

## 4. Quality loop (mandatory)

```
Analyze → Test → Categorize Failures → Root Cause
  → Minimal Fix → Replay Regression → Replay Corpus
```

Repeat until green. Prefer minimal fixes over broad rewrites.

---

## 5. Failure taxonomy

- `hallucination` — field not grounded in text  
- `miss` — field present in text, not extracted  
- `misclass` — wrong category/location  
- `overconf` — high confidence wrong  
- `underconf` — abstained when clear  
- `merge` — draft merge / lock violation  
- `schema` — invalid vs template  

---

## 6. Routing evaluation

Track share of traffic:

- rules-only / hybrid / retrieval-augmented  
- fallback rate  
- publish never blocked by LLM  

---

## 7. Gates (practical)

| Gate | Command / artifact (examples) |
|------|-------------------------------|
| Rules pipeline | `npm run test:post-pipeline` |
| Hybrid golden | `npm run test:hybrid-intake-golden` |
| Vertical | `npm run test:vertical-expansion` (or current name) |
| Corpus | TBD harness under `src/intake/**/corpus` |

Update this table when scripts are renamed — keep Constitution pack Current truth honest.
