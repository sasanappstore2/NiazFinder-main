# Success metrics

**Status:** Blueprint v1

---

## 1. Product metrics

| Metric | Target (direction) | Notes |
|--------|-------------------|-------|
| Manual fields touched per published need | ↓ | Understanding-first |
| Time-to-publish (compose → publish) | ↓ | Without sacrificing accuracy |
| Correction rate after auto-apply | Monitor | High corrections ⇒ lower conf / fix rules |
| User abandon on `/post` | ↓ | |
| Match acceptance / proposal rate | ↑ | Downstream of draft quality |

---

## 2. Understanding quality

| Metric | Target |
|--------|--------|
| Golden hybrid accuracy | ≥ 95% (maintain 100% where already achieved) |
| Post-pipeline rules gate | 100% pass |
| Category precision@auto-apply (≥0.85) | ≥ 90% on corpus |
| Location city accuracy | ≥ 95% when city mentioned |
| Neighborhood accuracy when unambiguous | ≥ 85%; else abstain |
| Hallucinated required fields | 0 on publish path |

---

## 3. Engineering metrics

| Metric | Target |
|--------|--------|
| Corpus size (Persian RE) | ≥ 1000 frozen |
| Prompt modules with version+owner+eval | 100% of LLM-used stages |
| Presentation files importing AI clients | 0 |
| ADR/RFC for architecture PRs | 100% |
| Mean stage latency (rules path) | budget TBD in performance RFC |
| Typesense browse fallback rate | monitor; spike ⇒ outage |

---

## 4. Process metrics

| Metric | Target |
|--------|--------|
| Implementations without Constitution read | 0 (process) |
| Quality loop iterations to green | track; prefer minimal fixes |
| Open KNOWN_FAILURES older than 30d | triage |

---

## 5. Gate policy

- **PR:** existing npm gates for touched area + relevant golden  
- **Nightly:** expanding corpus  
- **Release:** publishValidator + rules-only pipeline green even if hybrid on in staging  
