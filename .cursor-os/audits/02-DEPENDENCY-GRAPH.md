# Audit 02 — Dependency Graph

**Date:** 2026-07-12  
**Phase:** PHASE-01

---

## Primary spine (Need Intelligence → Publish)

```
User text (/post compose)
  → useIntakeIntelligence ──POST──► /api/intake/analyze
  → runIntakeIntelligence
        ├─ [hybrid?] hybrid-pipeline
        └─ rules path (registry / extractors)
              └─ optional LLM assist (non-authoritative)
  → NeedDraft (+ fieldMeta)
  → onDraft auto-apply (category ≥0.85, location; respect locks)
  → useRealtimeExtraction ──POST──► /api/intake/smart-extract
  → mergeIntakeSources → smartProposals (UI-only; never draft write)
  → step location → IntakeTemplateForm (L5/L6)
  → step preview → composeListingFromDraft
  → validateNeedDraftForPublish
  → POST /api/need-intake/publish
  → ServiceRequest (+ env auto-approve / shadow)
```

## Parallel authority rules

```
User locks > Intelligence NeedDraft > Smart proposals
Rule Engine > LLM on conflict
publishValidator > client “ready” UX
```

## Browse / search (separate from NeedDraft)

```
Business browse request
  → Typesense (if enabled + healthy)
  → else Prisma contains search
  → neighborhood filter → always Prisma (not Typesense)
```

## Match / chat (downstream)

```
Published need
  → matching / ranking (deterministic rules)
  → leads / wallet
  → chat-service (Socket.io)
  → proposals
```

## Infra dependencies

```
Next app → Postgres/Prisma
         → Redis / RabbitMQ / worker-go (queues)
         → Typesense (browse)
         → chat-service :3004
         → optional LLM :1234
```

## Critical coupling hotspots

| Change | Breaks |
|--------|--------|
| `NeedDraft` shape | analyze, merge, templates, publish, UI |
| `publishValidator` | publish API + preview CTA |
| `intake-merge-policy` | compose dual-pipeline |
| category slug taxonomy | rules packs, templates, matching |
| Prisma `BusinessProfile` / need models | APIs, Typesense sync, browse |
