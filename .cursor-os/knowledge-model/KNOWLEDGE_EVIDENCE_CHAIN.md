# Evidence Chain

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active principle (Charter companion) |
| **Date** | 2026-07-12 |
| **Code** | None here — Phase 02/03 define storage shape in RFC |

---

## Principle

Every value written into **NeedDraft** must be able to show **where it came from**.

> No anonymous fields. No “the model said so” without a chain.

This is mandatory for debugging, user trust, anti-hallucination, and Rule Engine audits.

---

## Chain shape (logical)

Minimum links (ordered from root evidence → acceptance):

```
User text span (and/or explicit user lock)
  → Matcher / alias / registry hit (Canonical Knowledge)
  → Rule pack / rule id (or “user-lock” / “form-edit”)
  → Optional AI proposal id (non-authoritative)
  → Confidence
  → Merge decision (accepted | rejected | overridden)
  → NeedDraft field
```

### Example A — category

```
categorySlug = apartment-rent
  ← Accepted (merge)
  ← confidence 0.91
  ← Rule Pack estate-rent #12
  ← Canonical Category apartment-rent
  ← Matched Alias «اجاره آپارتمان»
  ← User Text Span chars [0..24]
```

### Example B — neighborhood

```
neighborhood = احمدآباد
  ← Accepted
  ← confidence 0.88
  ← Rule #18 (location fragment)
  ← Alias Registry (colloquial)
  ← Neighborhood Catalog (city=مشهد)
  ← City Registry
  ← User Text Span «احمدآباد مشهد»
```

### Example C — user correction

```
dealType = DEPOSIT_AND_RENT
  ← Accepted
  ← source = user-lock
  ← form field edit on location step
  ← (prior AI/rule proposal discarded)
```

---

## What is NOT valid evidence

- Typesense business hit implying need category
- Untyped LLM JSON without registry bind
- Presentation-only state
- Chat memory / prior conversation as Canonical proof

---

## Storage (Target — for Phase 02/03 RFC)

Do not invent schema in this file. RFC must specify one of:

- `fieldMeta[field].evidence` structured object
- Parallel `draft.evidence` map
- Analysis snapshot already used in training — extend, don’t fork

Whatever lands must be **readable in logs/admin without decoding tribal knowledge**.

---

## Enforcement

| Layer | Duty |
|-------|------|
| Knowledge | Provide stable IDs for registry/alias hits |
| Rule Engine | Emit rule/pack ids on accept |
| Hybrid/LLM | Emit proposal ids only; never final without rule/merge |
| Merge policy | Record accept/reject/override |
| Presentation | May display explanation later; must not fabricate evidence |

Missing evidence on a high-impact field (category, city, deal) in Target state = defect, not “optional nicety.”

---

## Relation to Charter

Charter §10: Knowledge proposes candidates.  
Evidence Chain: proves *which* candidate path became NeedDraft truth.
