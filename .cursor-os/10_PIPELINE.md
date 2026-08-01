# 10 — End-to-End Pipeline

## Happy path (product)

```text
home
  → compose need text
  → /post intake (analyze → gaps → preview)
  → publish ServiceRequest
  → /n/{city} need marketplace visibility
  → matching / NeedLeadOutreach (private → broader phases)
  → chat (NeedChatSession / Conversation)
  → Proposal
  → Review / resolution / disputes
```

This is the spine. Features should attach to a stage deliberately.

---

## Stage contracts

### 1. Capture & structure

- Inputs: free text, optional city hint, form locks
- Outputs: NeedDraft, fieldMeta, analysisMode
- Gates: confidence thresholds (≥0.85 category); compose = silent high-conf apply + form correction (no live ambiguity prompt theater)
- Docs: `08_NEED_ENGINE`, `05_RULE_ENGINE`, `06_AI_ENGINE`

### 2. Publish

- Validators / readiness score
- Moderation status / auto-approve flags
- Parity with browse filters
- Docs: intake validation fixtures

### 3. Discover (needs & businesses)

- Needs browse: `/n/{city}` + filters (neighborhoods via DB)
- Businesses browse: `/api/business/browse` + Typesense
- Docs: `07_TYPESENSE`, `04_DATABASE`

### 4. Match & notify

- Rank businesses; VIP broadcast; wallet fee
- Docs: `09_RANKING`

### 5. Communicate

- Socket gateway `:3004`; message persistence in Postgres
- Attachment MIME smokes; voice call models exist
- Docs: `03_ARCHITECTURE`, `13_SECURITY`

### 6. Transact trust

- Proposals, reviews, reports, wallet transactions
- Admin moderation paths

---

## Async backbone

```text
Next API → (optional) RabbitMQ topic exchange
        → worker-go consumers (intake / analytics / matching)
```

When Rabbit disabled: sync/analytics fallback paths — verify before assuming async delivery.

---

## State machines (conceptual)

| Entity | Status-ish fields |
|--------|-------------------|
| ServiceRequest | RequestStatus, ModerationStatus, access |
| NeedLeadOutreach | NeedLeadOutreachStatus, NeedAccessPhase |
| NeedChatSession | NeedChatSessionStatus |
| Proposal | ProposalStatus |
| BusinessProfile | BusinessStatus |

Read enums in Prisma before changing transitions.

---

## Failure isolation

| Stage fails | Degrade |
|-------------|---------|
| LLM | Rules-only draft |
| Typesense | Prisma browse |
| Rabbit | Sync fallback |
| Chat socket | HTTP polling / disabled realtime |
| Matching queue | Explicit retry / admin replay (do not invent — check worker-go) |

---

## Observability touchpoints

- Intake telemetry events
- Analytics sessions/events
- Worker health `:8081`
- Chat health `:3004`
- Typesense `/health`

See `14_MONITORING.md`.

---

## Pipeline change rules

1. Name the stage you are changing
2. List upstream/downstream contracts
3. Add/adjust tests at stage boundary
4. Update roadmap phase if completing backlog item
5. Avoid cross-stage drive-by refactors
