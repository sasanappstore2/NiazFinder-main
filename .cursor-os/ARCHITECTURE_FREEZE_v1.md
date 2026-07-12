# Architecture Freeze v1.0

| | |
|---|---|
| **Status** | **FROZEN** until v2.0 explicit unfreeze ADR |
| **Human confirmation** | **Approved** by product (2026-07-12) |
| **Effective** | 2026-07-12 |
| **Authority** | `.cursor-os/MISSION.md` · this file · `.cursor-os/RED_LINES.md` |
| **SoT for `/post`** | `docs/POST_SYSTEM_REPORT.md` |
| **Change policy** | Almost never edit. Any change requires **RFC + Accepted ADR** titled “Unfreeze / Amend Architecture Freeze v1” |

---

## 1. Core Principles (immutable)

### NeedDraft

NeedDraft is the **source of truth** for structured need understanding.

No service may bypass it on the intake → publish path.

### Rule Engine

The Rule Engine is the **primary authority** of the project for classification, business rules, and deterministic structure.

The LLM only **proposes**. On conflict, **Rule Engine wins**.

### Publish Validator

`publishValidator` is the **only** authority for publish readiness.

Client UX “ready” is not authority. LLM is not authority.

### Typesense

Typesense is **Search Only**.

Not NLP. Not AI. Not need classification. Not NeedDraft production. Not publish.

### Gemma / Local LLM

Semantic layer only: understanding, intent assist, disambiguation assist, gap hints, suggestions, truth-verify assist.

Not business logic. Not DB authority. Not publish. Not validation authority.

### Presentation

Presentation **never** calls LLM/model HTTP clients.

Understanding flows: Presentation → Hooks → Store → Intelligence APIs → engines.

---

## 2. Immutable Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| Rules-first intake / publish | **Approved · Immutable** | ADR-0001 / docs ADR-001 |
| NeedDraft-centric pipeline | **Approved · Immutable** | Constitution + Mission |
| Hybrid pipeline exists as assist path | **Approved · Immutable** | LLM never publish authority |
| Dual-pipeline: Intelligence owns draft; smart-extract proposals only | **Approved · Immutable** | merge policy |
| Presentation never calls LLM | **Approved · Immutable** | Red line |
| Next.js owns product APIs; Nest legacy | **Approved · Immutable** | ADR-0003 |
| Typesense browse + Prisma fallback; search only | **Approved · Immutable** | ADR-0002 |
| Category auto-apply / chips ≥ **0.85** | **Approved · Immutable** | Change needs ADR |
| Compose: no mandatory verify/gap/location ambiguity prompt theater | **Approved · Immutable** | POST_SYSTEM_REPORT; change needs RFC |
| Postgres + Prisma (not sqlite) as product DB | **Approved · Immutable** | |
| Architecture Freeze v1 | **Approved · Immutable** | This document |

“Immutable” means: not casually revisitable in feature work. Formal unfreeze ADR required.

---

## 3. Architecture Boundaries

### Allowed intake path

```
Presentation (UI)
  → Hooks
  → Need Store (NeedDraft)
  → Intelligence API
  → Rule Engine (+ optional Hybrid / LLM assist)
  → Validation
  → Publish Validator
  → Publish API
  → ServiceRequest
```

### Forbidden path (must Reject)

```
Presentation
  → LLM
```

```
LLM
  → Publish / DB write as authority
```

```
Typesense
  → NeedDraft / Category authority / Publish
```

```
Any service
  → Publish without publishValidator
```

```
Smart-extract
  → direct NeedDraft write (bypass merge policy)
```

Cursor **must reject** PRs/prompts that introduce forbidden paths.

---

## 4. Future Ideas (not approved)

Park here. Do **not** implement until RFC → Review → Accept.

| Idea | Status |
|------|--------|
| Vector search for **needs** (need-side RAG index) | Future · Not Approved |
| Knowledge graph | Future · Not Approved |
| Elasticsearch replacing Typesense | Future · **Rejected** (unless ADR unfreezes search stack) |
| Typesense neighborhood indexing | Future · Not Approved (see RFC-0002) |
| Prompt module registry extraction | Future · Not Approved (planned phase; needs RFC) |
| Rebuild `/post/edit/[id]` | Future · Not Approved |
| Knip/ts-prune dead-code CI | Future · Not Approved |
| Multi-agent “agent network” | Future · Not Approved |

---

## 5. Out of Scope (temptation shield)

Do not start these during v1.0 core freeze:

| Item | Deferred to |
|------|-------------|
| Realtime recommendation engine | Version 2 |
| Agent network / multi-agent marketplace | Version 3 |
| Voice understanding as primary intake | Future |
| LLM-gated publish | **Never** (contradicts freeze) |
| Form-first redesign of `/post` | **Never** without unfreeze + vision ADR |
| Illegal scrapers / unauthorized Divar harvest | **Never** |

---

## 6. Success Metrics (v1 targets)

Directional KPIs for Need Intelligence. Measure with golden/corpus/gates; do not invent dashboards in this phase.

| Metric | Target |
|--------|--------|
| Need understanding accuracy (golden / corpus) | ≥ **96%** (stretch; maintain ≥95% hybrid golden where enabled) |
| False category (auto-apply @ ≥0.85) | **&lt; 2%** |
| Average rules-path pipeline latency | **&lt; 500ms** (p50 aspirational; document p95 separately) |
| Publish failure (validator/ infra) | **&lt; 0.5%** |
| Rule coverage (rules-only gate) | ≥ **95%** |
| Hallucinated required fields on publish path | **0** |
| Architecture Score (audit) | ≥ **80** |
| Presentation→LLM imports | **0** |

---

## 7. Phase Exit Criteria (universal)

No phase may close without:

| Gate | Required |
|------|----------|
| RFC | Approved when phase requires design change |
| ADR | Accepted when architecture touched |
| Tests | Green for touched gates |
| Memory | Updated |
| Architecture Score | ≥ **80** (or waiver documented) |
| Health Gate | **PASS** |
| Architecture Freeze | Not violated (or formal unfreeze) |
| Red Lines | Not crossed |

---

## 8. Canonical phase sequence (post-freeze)

```
PHASE 00  Mission                         ✓
PHASE 01  Project Audit                   ✓ (artifacts)
PHASE 01.5 Architecture Freeze            ← NOW
PHASE 02  Knowledge Model
PHASE 03  Need Engine
PHASE 04  Rule Engine
PHASE 05  Hybrid AI
…         (see phases/SEQUENCE.md)
```

Do **not** start Phase 02 until Phase 01.5 DoD is complete.

---

## 9. Related files

- `.cursor-os/RED_LINES.md`
- `.cursor-os/MISSION.md`
- `.cursor-os/audits/`
- `.cursor-os/phases/PHASE-01.5-architecture-freeze.md`
- `.cursor-os/phases/SEQUENCE.md`
