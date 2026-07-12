---
title: "ADR-0001: Rules-first intake publish authority"
date: 2026-07-12
status: accepted
supersedes: []
superseded_by: null
---

# ADR-0001: Rules-first intake publish authority

## Context

NiazFinder structures Persian free-text needs into publishable fields. An optional local LLM (Gemma via LM Studio / docker AI sidecars) can assist, and a hybrid cascade exists (`NEED_INTAKE_HYBRID_ENABLED`). Production launch documentation (`docs/ENV_MAP.md`) sets `NEED_INTAKE_LLM_ENABLED=false`.

Risk: treating model output as publish source of truth causes drift, non-determinism, and hard-to-test regressions.

## Decision

1. **Rules engine + publish validators** are authoritative for what can be published.
2. LLM/hybrid may propose or fill fields; they must merge through existing confidence/merge policy.
3. Category UI auto-apply remains gated at **≥ 0.85** (`RULES_DISAMBIG_MIN_CONFIDENCE`).
4. Production default remains LLM off unless a future ADR supersedes this.
5. Schema-evolution proposals stay human-reviewed (no auto-apply).

## Consequences

### Positive

- Deterministic tests with LLM off (`test:post-pipeline`, estate scenarios)
- Safe local AI experimentation without changing prod posture
- Clear rollback: disable hybrid/LLM flags

### Negative / risks

- Rules packs require ongoing maintenance for new verticals
- Hybrid bugs can still affect local DX if flags on

### Rollback

Set `NEED_INTAKE_HYBRID_ENABLED=false`, `NEED_INTAKE_LLM_ENABLED=false`, and/or `NEED_INTAKE_RULES_ONLY=true`.

## Alternatives considered

| Option | Why not |
|--------|---------|
| LLM-only intake | Non-deterministic publish; weak offline/CI |
| AI as publish authority with rules shadow | Higher user-facing risk; harder parity |

## Implementation notes

- Config: `src/intake/rules/config.ts`, `src/lib/intake/rules-only-mode.ts`
- UX: `NeedIntakePanel` auto-apply guards
- Docs: `05_RULE_ENGINE.md`, `06_AI_ENGINE.md`, `08_NEED_ENGINE.md`

## Validation

- LLM-off post-pipeline / estate / publish validator green
- Hybrid golden green when hybrid explicitly enabled
