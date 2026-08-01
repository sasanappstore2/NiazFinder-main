# Implementation phases

**Status:** Blueprint v1 · Ordered delivery after Constitution approval  
**Rule:** Each phase ends with docs sync + quality loop green.

---

## Phase 0 — Ratify

- Approve Constitution pack
- Link ADR “Constitution governs vision”
- Freeze role split Claude / Cursor
- Inventory Current truth vs Target gaps

## Phase 1 — Layer boundaries

- Enforce import boundaries (lint or path rules where practical)
- Strip AI calls from Presentation if any remain
- Document stage I/O TypeScript contracts for L1

## Phase 2 — Modular prompts

- Extract / register versioned prompt modules (even if some still rules-backed stubs)
- Add owner + eval hooks per module
- Kill any mega-prompt accumulation

## Phase 3 — Router v1

- Explicit simple/medium/complex classifier
- Wire to hybrid-runtime without changing publish authority
- Metrics: % rules-only vs hybrid

## Phase 4 — Draft merge hardening

- Single merge authority (already partially done)
- Lock semantics documented + tested
- History / correction replay hooks

## Phase 5 — Confidence UX alignment

- Global confidence calibration policy
- Category ≥ 0.85 gate preserved or ADR to change
- No low-confidence category chips

## Phase 6 — Real-estate ontology v1

- Complete subtype matrix (required/optional/validation/match)
- Map to existing category slugs
- Golden coverage for top subtypes

## Phase 7 — Corpus 250

- Frozen Persian RE paragraphs (250) + harness
- Failure replay store

## Phase 8 — Corpus 1000

- Scale to ≥1000
- CI optional nightly; PR gate on subset + changed vertical

## Phase 9 — Knowledge for needs

- Need-side retrieval design (not business Typesense misuse)
- Embeddings / RAG RFC

## Phase 10 — Typesense neighborhoods (optional)

- Execute RFC-0002 or reject with ADR
- Keep Prisma fallback until cutover proven

## Phase 11 — Question generation

- Gap → question pipeline with tests
- Prefer silent high-conf fill; ask only when needed

## Phase 12 — Matching alignment

- Matching consumes validated NeedDraft only
- Ranking features documented ([09 ranking in Cursor OS](../../.cursor-os/09_RANKING.md))

## Phase 13 — Eval dashboard

- Prompt + AI evaluation visible to architects
- Regression trendlines

## Phase 14 — Security & PII

- Prompt/log redaction audit
- Connector legality checklist

## Phase 15 — Performance

- Stage latency budgets
- Local LLM SLO for compose

## Phase 16–20 — Vertical expansion

- Vehicles, services, jobs, goods — each with ontology + corpus slice
- Same layer rules as RE

## Phase 21–25 — Platform

- Lead/wallet coherence, chat/proposal contracts, admin ontology tools

## Phase 26–30 — Scale & ops

- Production hybrid cutover RFC, monitoring, rollback drills, self-audit automation

---

Phases may parallelize only when layer contracts are stable (architect approval).
