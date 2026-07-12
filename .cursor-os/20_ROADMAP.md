# 20 — Roadmap (Phased Backlog)

Long-lived backlog tied to the reverse-marketplace spine. Phases are **sequenced themes**, not dates. Mark progress in `memory/CURRENT_STATE.md` when a phase meaningfully completes.

**Legend:** `C` = largely current / hardening · `N` = next · `L` = later · `R` = research

---

## North star

Reliable: **need text → structured publish → discover → match → chat → proposal → trust**.

---

## Phase 01 — OS & change control `C`

- Cursor OS v1, ADR/RFC workflow, discovery rule
- Doc/code conflict log (model counts, Typesense defaults)

## Phase 02 — Intake rules fidelity `C/N`

- Keep post-pipeline / estate scenarios green (LLM off)
- Pack coverage for top verticals
- Merge policy / stale race guards stay green

## Phase 03 — Hybrid intake hardening `C/N`

- Hybrid golden at 100% locally when enabled
- Soft-fail to rules on LLM timeout
- Cache bump discipline documented

## Phase 04 — Category confidence UX `C`

- Maintain ≥0.85 auto-apply gate
- Ambiguity prompts without chip spam
- Telemetry on reject/override

## Phase 05 — Location intelligence `N`

- Neighborhood resolution quality
- Ambiguity UX polish
- Parity tests for filters

## Phase 06 — Publish readiness `C/N`

- Validator completeness per vertical
- Preview ↔ browse parity
- Shadow publish monitoring

## Phase 07 — Typesense reliability `C/N`

- ensure/sync on predev stable
- Mutation sync coverage audit
- Explicit Prisma fallback smoke

## Phase 08 — Typesense geo gap `L` (ADR required)

- Decide neighborhood indexing vs permanent DB filter
- If index: schema, backfill, reindex, tests

## Phase 09 — Business browse UX `N`

- Facets (city/province/category slugs)
- Verified/sort coherence with Typesense sort field

## Phase 10 — Need marketplace `/n/{city}` `N`

- Filter performance
- SEO/h1 coverage
- Map pins consistency

## Phase 11 — Matching quality `N`

- Tune min score / reasons Fa
- Candidate recall vs precision measurements
- Stress tests in CI subset

## Phase 12 — Lead economics `N` (ADR if changing fees)

- Wallet fee clarity
- Private lead caps
- Fraud/abuse basics

## Phase 13 — VIP broadcast reliability `N`

- Queue vs sync paths
- Idempotent sends
- Outreach status visibility for businesses

## Phase 14 — Chat gateway productionization `N`

- Socket auth hardening
- Attachment MIME + size
- Presence/online correctness

## Phase 15 — Proposals lifecycle `N`

- Status transitions UX
- Tie to chat threads
- Notification hooks

## Phase 16 — Reviews & disputes `L`

- Review prompts post-resolution
- Dispute workflows
- Moderation queues

## Phase 17 — Admin / RBAC completeness `N`

- Staff permissions coverage
- Audit log gaps
- Super-admin safeties

## Phase 18 — Analytics truthfulness `N`

- Intake funnel metrics
- Match conversion
- Avoid PII in rollups

## Phase 19 — Worker-go & Rabbit maturity `N`

- Dead-letter handling verified
- Matching/intake consumers documented
- Load test notes

## Phase 20 — Local AI DX `C/N`

- LM Studio / Gemma docs accuracy
- Optional docker `ai` / `ai-docker` profiles
- Embedding sidecar optional path

## Phase 21 — Prod AI policy `L` (ADR)

- Keep rules-first prod unless decision flips
- Cost/latency/safety gates
- Shadow compare before cutover

## Phase 22 — Vertical expansion `N`

- Vehicles / jobs / services pack depth
- Required fields + scenarios per leaf
- Playbook tests green

## Phase 23 — Legal data connectors `L` (policy)

- Generic connector interface for **allowed** sources
- Fixture-first corpus for intake
- No illegal scrape guidance; partner/export paths only

## Phase 24 — CCQS / SEE as release gates `R/N`

- Wire gate verdicts into release checklist selectively
- Keep non-blocking until stable

## Phase 25 — Cognitive / shadow engines `R`

- Shadow compare only
- Prevent dual-write to publish
- Archive or document backup trees

## Phase 26 — Map & geo ops `N`

- Local `/api/map` tiles reliability
- Pin accuracy for needs/businesses

## Phase 27 — Performance & scale `L`

- Intake analyze p95 budgets
- Browse pagination
- Queue backpressure

## Phase 28 — Security hardening pass `N`

- Security smoke expansion
- Secret scanning in CI (if added)
- Chat/wallet threat review

## Phase 29 — Deployment truth documentation `L` (ADR)

- Record real host/pipeline when chosen
- Backup/restore runbook
- Env matrix prod/staging/local

## Phase 30 — OS v2 expansion `L`

- Deeper SRE, multi-region only if real
- More ADRs from lived decisions
- Trim superseded PLAN noise into memory pointers

---

## How to use

1. Pick the lowest phase that matches the user task
2. Prefer finishing a thin vertical slice over skipping ahead
3. Spawn ADR/RFC when a phase requires an architecture fork (08, 12, 21, 23, 29)
4. Update CURRENT_STATE when phase status changes materially
