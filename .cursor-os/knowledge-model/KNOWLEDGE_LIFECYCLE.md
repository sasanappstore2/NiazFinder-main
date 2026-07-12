# Knowledge Lifecycle

| | |
|---|---|
| **Version** | 1.0 |
| **Status** | Active (Companion to Accepted Charter) |
| **Date** | 2026-07-12 |
| **Scope** | How Canonical Knowledge is born, changed, versioned, rolled back |
| **Code** | None in this document |

---

## 1. Principle

Knowledge changes are **governed data/process changes**, not casual edits in a PR that also ships UI features.

> World Model updates must be deliberate, attributed, reversible, and testable.

---

## 2. Change classes

| Class | What it is | Process | Owner |
|-------|------------|---------|-------|
| **Data Update** | Additive aliases, synonym rows, non-breaking catalog fills, typo fixes in labels | PR + review + targeted tests; no RFC if IDs unchanged | Registry steward (assigned in Phase 02) |
| **RFC required** | New category leaf, new vertical binding, leaf↔template remap, province/city model change, neighborhood schema change, new occupation map family | RFC → Review → Approve → Implement → Tests → Docs/Memory | Architect + steward |
| **ADR required** | Changing who may write Knowledge, splitting/merging Knowledge authority, allowing Knowledge to decide (forbidden unless Freeze unfrozen), versioning scheme change, cross-service Knowledge API | ADR Draft → Accept → then RFC if needed | Architect |
| **Forbidden as silent change** | Deleting leaves in use, renumbering slugs without migration, LLM inventing canonical IDs, scraping into Canonical without legal connector RFC | Reject (Red Lines) | — |

---

## 3. How a new Category enters Canonical Knowledge

1. **Propose** — problem statement (gap in understanding / matching).
2. **Classify** — Data Update vs RFC (new leaf almost always **RFC**).
3. **Design** — slug, parent vertical, template binding, required fields, matching occupations, Persian labels/aliases.
4. **RFC** — impact on Rule packs, golden/corpus, publishValidator, NeedDraft consumers.
5. **Approve** — Architect (+ product if user-visible taxonomy).
6. **Land data** — registry + pack stubs + fixtures (implementation phase).
7. **Verify** — golden/corpus subset; no NeedDraft bypass.
8. **Memory** — CURRENT_STATE / DECISIONS note; bump Knowledge version (below).

Never: ship UI that hardcodes a leaf before Canonical registration.

---

## 4. Registry ownership

| Registry | Steward role | Notes |
|----------|--------------|-------|
| Need category taxonomy | Knowledge steward + Architect | RFC for structural edits |
| Occupations / online stores / need→occupation | Matching + Knowledge stewards | Keep browse Typesense in sync only for business side |
| Province / city | Geo steward | Shared intake + browse |
| Neighborhood catalogs + supplements | Geo steward | City-scoped; aliases ≠ new cities |
| Deal / transaction vocabulary | Intake steward | Align with validators |
| Rule packs (as data) | Rules steward | Execution owned by Rule Engine phase |

Until named humans exist in ops, **Architect is default steward**; Cursor must not self-assign ownership in code comments as authority.

---

## 5. What needs RFC vs ADR vs Data Update

| Example | Class |
|---------|-------|
| Add alias «قرنی» → existing Mashhad neighborhood | Data Update |
| Add new estate leaf `loft-rent` + template fields | **RFC** |
| Change category auto-apply floor from 0.85 | **ADR** (Freeze immutable) |
| Allow Knowledge service to write NeedDraft | **ADR + Freeze unfreeze** (normally Reject) |
| Fix Persian label typo on existing slug | Data Update |
| Split “commercial” into shop vs office leaves | **RFC** |
| Replace city registry source system | **RFC** (+ ADR if authority boundary moves) |

---

## 6. Knowledge versioning

### Scheme

```
knowledge.version = MAJOR.MINOR.PATCH
```

| Bump | When |
|------|------|
| **MAJOR** | Breaking slug removals/renames; template binding breaks old NeedDrafts |
| **MINOR** | New leaves/registries/fields; backward-compatible |
| **PATCH** | Aliases, labels, non-behavioral catalog fixes |

Record version in:

- `.cursor-os/knowledge-model/VERSION` (create in Phase 02 design landing) or memory `CURRENT_STATE`
- Release notes when a product release includes Knowledge MINOR/MAJOR

### Sync with product Release Version

| | |
|--|--|
| **Not 1:1 required** | App `1.4.0` may ship with Knowledge `0.9.2` |
| **Required** | Every product release that changes Canonical Knowledge must cite `knowledge.version` |
| **Forbidden** | Shipping breaking Knowledge MAJOR without migration / dual-read plan |

---

## 7. Rollback

| Layer | Rollback method |
|-------|-----------------|
| Git-managed registries | Revert PR; redeploy; re-run affected tests |
| Generated catalogs | Re-run approved generation pipeline from last good commit |
| Bad alias causing mis-bind | PATCH revert alias; add regression fixture |
| Breaking leaf already in prod NeedDrafts | Prefer deprecate+dual-read over hard delete; MAJOR + migration note |

Rollback never uses LLM “repair” as Canonical rewrite.

---

## 8. Evidence & audit trail

Every Canonical change PR should state:

- Change class (Data / RFC / ADR)
- `knowledge.version` bump
- Tests run
- Freeze/Red Lines check

Every Derived binding into NeedDraft should carry an **Evidence Chain** (see `KNOWLEDGE_EVIDENCE_CHAIN.md`).

---

## 9. Phase 02 expectation

Phase 02 **implements** stewardship paths and version bump discipline only after:

1. Design docs (this + Charter + Evidence Chain) accepted  
2. Phase 02 RFC Approved  
3. Health Gate PASS  

No drive-by registry edits “while fixing UI.”
