# 16 — RFC Guide

RFCs are for **multi-week / multi-module designs** before large implementation.

---

## ADR vs RFC

| | ADR | RFC |
|--|-----|-----|
| Scope | One decision | Design exploration + plan |
| Length | Short | Longer, phased |
| Outcome | Accepted constraint | May spawn multiple ADRs |

If you only need a binary choice, write an ADR. If you need rollout phases, metrics, and open questions, write an RFC.

---

## Location

```text
/.cursor-os/rfc/RFC-NNNN-short-kebab-title.md
```

Also keep `rfc/RFC_TEMPLATE.md` for copying.

---

## Template structure

1. Summary
2. Motivation
3. Current truth
4. Proposed design
5. Detailed design (APIs, data, flags)
6. Migration / rollout phases
7. Risks & ethics (incl. legal connectors)
8. Test plan
9. Open questions
10. Abort criteria
11. ADRs expected

---

## Process

1. Stub RFC + link in OPEN_DECISIONS
2. Discuss / spike behind flags
3. Land ADRs for locked decisions
4. Execute roadmap phases with test gates
5. Mark RFC `accepted` / `abandoned` / `completed`

---

## Abort criteria (recommended defaults)

- Publish parity regressions
- Cannot degrade without Typesense/LLM
- Legal risk on connectors
- No rollback path
