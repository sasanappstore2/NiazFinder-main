# Knowledge Model Charter

| | |
|---|---|
| **Version** | 1.0.0 |
| **Status** | **Accepted** (product/architect confirmed 2026-07-12) |
| **Date** | 2026-07-12 |
| **Authority** | Architecture Freeze v1 · RED_LINES · Mission · POST_SYSTEM_REPORT |
| **Code in this document** | **None** — design only |
| **Companion** | `KNOWLEDGE_LIFECYCLE.md` · `KNOWLEDGE_EVIDENCE_CHAIN.md` |

---

## Purpose

Define what “Knowledge” means in NiazFinder **before** Phase 02 implementation, so Need Engine (03) and Rule Engine (04) inherit clear boundaries.

### Permanent architectural principle

> **Knowledge Layer is a World Model, not a Decision Engine.**

It provides candidates and constraints. It does not decide NeedDraft bindings, publish, or business outcomes. That remains Rule Engine + merge policy + publishValidator (and user locks).

### Evidence Chain (companion)

Every NeedDraft field must be able to show its provenance — see `KNOWLEDGE_EVIDENCE_CHAIN.md`.

---

## 1. What is “Knowledge” in NiazFinder?

**Knowledge** is the project’s durable, reusable world-model that helps the system *interpret* a human need — without becoming the need itself.

It includes:

- Controlled vocabularies and taxonomies (categories, occupations, deal types)
- Geographic registries (province → city → neighborhood)
- Ontological relationships (vertical ↔ subtype ↔ required attributes)
- Dictionaries / aliases / normalization tables (Persian variants, magnitudes)
- Rule packs and match tables that *encode* expert knowledge as deterministic data
- Optional retrieval corpora used only as **candidates** for assistive AI (not as publish truth)

**Knowledge is not:**

- A single user’s free-text utterance (that is input)
- The structured instance of understanding for one session (**NeedDraft**)
- Search ranking of business profiles (Typesense — Search Layer only)
- LLM free-form opinion as authority

One-liner:

> Knowledge = shared reference world. NeedDraft = this user’s understood need *using* that world.

---

## 2. What is Canonical Knowledge?

**Canonical Knowledge** is curated, versionable, human/architect-owned data that the system treats as **ground truth for vocabulary and structure**.

Examples (current product reality):

| Domain | Canonical artifacts (conceptual) |
|--------|----------------------------------|
| Need categories / leaves | Category config & slug taxonomy |
| Business occupations / stores | Occupation & online-store registries; need→occupation maps |
| Geography | Province/city registries; neighborhood catalogs per city; supplements/aliases |
| Deal / transaction vocabulary | Enumerated deal types aligned with validators |
| Template identity | Which template id binds to which category leaf |
| Rule pack identity | Named packs with explicit ownership (rules as *data*, not as one-off code) |

Properties of Canonical Knowledge:

- Stable IDs/slugs
- Documented change process (RFC/ADR when structural)
- Deterministic consumers (Rule Engine, validators, templates)
- Not overwritten by a single LLM response

---

## 3. What is Derived Knowledge?

**Derived Knowledge** is computed from Canonical Knowledge + input signals. It may be cached, but it is **not** the root of truth.

Examples:

- Resolved `categorySlug` / `subcategorySlug` hypotheses from text (before locks)
- Matched neighborhood candidates from fuzzy/alias lookup
- Inferred deal type from phrases when rules fire
- Confidence scores and ambiguity sets
- Typesense *search hits* for businesses (derived from indexed profile documents — still Search Layer, not Need Knowledge)
- Embeddings / similarity scores if/when introduced (Future Idea — not approved)

Derived Knowledge must always remain **traceable** to Canonical Knowledge + evidence from user text (or explicit user lock).

---

## 4. What is AI-generated Knowledge?

**AI-generated** content is any structure produced or ranked by Gemma/local LLM (or similar) that is not already present as Canonical Knowledge.

Allowed roles (Freeze):

- Semantic paraphrase / intent gist
- Disambiguation *suggestions*
- Gap questions / suggestions
- Candidate ranking among known options
- Truth-verify *hints*

Forbidden as authority (Red Lines):

- Inventing new canonical category slugs outside registry
- Inventing cities/neighborhoods not in registries
- Publishing or validating by itself
- Writing NeedDraft as sole author without Rule Engine / merge policy

AI-generated outputs are **proposals** until Rule Engine + merge policy + (for publish) publishValidator accept them into NeedDraft / publish path.

---

## 5. What must NOT enter the Knowledge Layer?

Do **not** park these in Knowledge Layer:

| Excluded | Why |
|----------|-----|
| Session UI state, ephemeral chips | Presentation / store concerns |
| Raw LLM transcripts as ontology | Non-canonical, privacy, drift |
| Typesense as need classifier | Search Only (Freeze) |
| Wallet/lead fee tables as “understanding knowledge” | Separate bounded context |
| Chat messages / proposals | Communication domain |
| One-off hardcoding inside React components | Violates Presentation boundary |
| Illegal scraped dumps without legal connector RFC | Red Line / legal |
| “Whatever the model said” without registry bind | Hallucination vector |

Also: **NeedDraft instances** are not Knowledge Layer entries; they *reference* Knowledge.

---

## 6. Category ↔ Vertical ↔ Template

```
Vertical (domain family: estate, vehicles, services, …)
  → Category / subcategory leaves (canonical slugs)
    → Template (dynamic schema: fields, required, conditionals)
      → Validation rules + matching occupation hints
```

| Concept | Role |
|---------|------|
| **Vertical** | Coarse product domain; packs, golden sets, ontology chapters |
| **Category leaf** | Canonical id used in NeedDraft entities / answers |
| **Template** | L5 Dynamic Schema — which fields exist and which are required for publish |

Rules:

- A leaf maps to **one primary template** (composition allowed only via documented inheritance).
- Changing leaf→template binding is a Knowledge change → RFC in Phase 02+.
- Ambiguous commercial leaves must **abstain** or disambiguate — not force a weak leaf into NeedDraft below 0.85.

---

## 7. Province ↔ City ↔ Neighborhood

```
Province (canonical)
  → City (canonical; browse/intake shared registry)
    → Neighborhood (canonical catalog + aliases/supplements)
```

Rules (aligned with LOCATION_REGISTRY / Freeze):

- City is required scope for many estate needs; neighborhood is finer and may be absent.
- Neighborhood without resolvable city → **do not invent**; derive city from scope/cookies/URL hints or leave gap for form step.
- Cross-city mentions → ambiguity set (Derived), not silent overwrite of user city lock.
- Typesense may facet city/province for **business browse**; neighborhood filters for browse use **DB**, not Typesense (current Freeze truth).
- Knowledge Layer owns the registries; Search Layer only indexes what profiles already store.

---

## 8. NeedDraft ↔ Knowledge Layer

```
User text
  → engines consult Knowledge (candidates + constraints)
  → Rule Engine / Hybrid produce Derived bindings
  → Merge policy + locks write NeedDraft
  → publishValidator checks NeedDraft against Knowledge-backed templates
```

| | NeedDraft | Knowledge |
|--|-----------|-----------|
| Lifetime | Per need session / persisted draft | Long-lived product asset |
| Authority for *this* need | **Yes** (structured SoT) | No — reference only |
| May invent slugs? | No — must bind to Canonical | Defines allowed slugs |
| LLM may fill? | Only via proposals + gates | Never “owns” |

**NeedDraft is not a subset of Knowledge.**  
NeedDraft is an **instance** that must be *justified by* Knowledge + user text + locks.

---

## 9. Boundary: Rule Engine vs Knowledge Layer

| | Knowledge Layer | Rule Engine |
|--|-----------------|-------------|
| Holds | Vocabularies, registries, ontology, packs-as-data | Execution of matching/scoring/decision procedures over Knowledge + text |
| Changes via | Charter → RFC → curated data | ADR if authority model changes; pack updates with tests |
| On conflict with LLM | N/A (data) | **Wins** |
| Output | Candidates, constraints, schemas | Selected bindings, confidences, rejects |

Mnemonic:

> Knowledge answers “what exists and how it relates.”  
> Rule Engine answers “given this text and Knowledge, what binding do we accept?”

Hybrid/LLM may *suggest* among Knowledge candidates; it does not redefine Knowledge.

---

## 10. Does Knowledge Layer decide — or only propose candidates?

**Verdict: Knowledge Layer does NOT hold final decision rights for a need instance.**

| Action | Who decides? |
|--------|----------------|
| Offer category/location candidates | Knowledge (+ retrieval) |
| Choose binding into NeedDraft | **Rule Engine** (+ merge policy, user locks); LLM may propose |
| Allow publish | **publishValidator** (template/Knowledge-backed required fields) |
| Rank businesses for browse | Typesense/DB Search — separate from Need Knowledge decisions |

Therefore Phase 02 must implement Knowledge as:

> **Candidate + constraint provider**, never as silent publisher or NeedDraft author.

Any design that lets “ontology service” write NeedDraft or publish without Rule Engine / publishValidator **violates Freeze and Red Lines** → Reject.

---

## Implications for later phases

| Phase | How this Charter helps |
|-------|------------------------|
| 02 Knowledge Model | Build registries/ontology/docs; no decision authority creep |
| 03 Need Engine | Wire stages to *consult* Knowledge; write only NeedDraft via merge |
| 04 Rule Engine | Consume Canonical Knowledge; own accept/reject |
| 05 Hybrid AI | Rank/propose within Knowledge candidates only |

---

## Approval checklist (gate for Phase 02)

```text
Architecture Freeze        = PASS (human confirmed 2026-07-12)
Red Lines                  = PASS
Project Health Gate        = PASS (Critical drift = 0)
Memory Completeness        = PASS
Architecture Score         >= 80 (~81)
Knowledge Model Charter    = APPROVED ✓ (2026-07-12)
```

| Role | Sign-off | Date |
|------|----------|------|
| Product owner | ✓ | 2026-07-12 |
| Architect | ✓ | 2026-07-12 |

**Phase 02 may open for Design → Audit → RFC only.** Implementation only after Phase 02 RFC is Approved (see `PHASE-02-knowledge-model.md`).

Also required before implementation: `KNOWLEDGE_LIFECYCLE.md` + Evidence Chain principle adopted.

---

## Non-goals of this Charter

- No code, migrations, or registry file edits
- No Typesense schema changes
- No new Future Ideas implementation
