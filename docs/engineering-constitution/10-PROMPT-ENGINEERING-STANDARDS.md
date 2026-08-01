# Prompt engineering standards

**Status:** Blueprint v1

---

## 1. Law

Never create one huge prompt.

Use modular prompts:

System → Intent → Category → Location → Entity → Field → Validation → Repair → Question → Summary

---

## 2. Required metadata (every prompt module)

| Field | Requirement |
|-------|-------------|
| `id` | stable string, e.g. `category.v3` |
| `version` | semver or monotonic int |
| `owner` | architect role / human owner |
| `stage` | pipeline stage name |
| `model_hints` | local vs cloud eligibility |
| `tests` | fixture ids |
| `evaluation` | metric + threshold |
| `changelog` | why version bumped |

Store under a registry path (Target): e.g. `src/intake/prompts/modules/*` — extract gradually; do not invent a second mega-file.

---

## 3. Design rules

1. **Single responsibility** per module.  
2. **JSON / schema-constrained** outputs where possible.  
3. **Evidence:** ask for spans or quotes from user text when extracting.  
4. **Abstain:** prefer null + low confidence over guesses.  
5. **Language:** user-facing strings Persian; system instructions English OK.  
6. **No PII training leakage** in examples committed to git.  
7. **Version bump** on any behavioral change; never silent edit prod prompt.

---

## 4. Tests

- Snapshot golden I/O for deterministic mocks  
- Live eval optional behind flag  
- Regression: old fixtures must pass after bump or be explicitly retired with ADR note  

---

## 5. Evaluation

See [11-AI-EVALUATION-STANDARDS.md](./11-AI-EVALUATION-STANDARDS.md). Each module declares:

- primary metric (exact match, F1, abstain rate)
- failure taxonomy (hallucination, miss, overconf)

---

## 6. Anti-patterns

- Copy-pasting full Constitution into every prompt  
- Mixing category + location + budget in one call without router need  
- Letting Presentation author prompts inline  
