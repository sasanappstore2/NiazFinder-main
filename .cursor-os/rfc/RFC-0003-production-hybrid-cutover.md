---
title: "RFC-0003: Production hybrid intake cutover (shadow → gated)"
date: 2026-07-12
status: draft
authors: ["cursor-os-v1"]
---

# RFC-0003: Production hybrid intake cutover (shadow → gated)

## Summary

If product later wants hybrid/LLM assist in production, define a **shadow → gated cutover** that preserves ADR-0001 (rules/validators remain publish authority).

## Motivation

Local hybrid already reaches strong golden scores in audit loops. Prod ENV_MAP keeps LLM off. Blindly enabling prod AI risks latency, cost, and quality regressions.

## Current truth

- ADR-0001 accepted: rules-first publish
- Flags: `NEED_INTAKE_HYBRID_ENABLED`, `NEED_INTAKE_LLM_ENABLED`, truth-verify, cache bump
- Soft-fail paths exist; timeouts matter for GGUF
- Open decision OD-20260712-02

## Proposed design

1. **Shadow mode:** run hybrid server-side, log diffs vs rules, do not change user-visible auto-apply beyond rules
2. **Gated % rollout:** enable assist on subset with kill switch
3. Keep category auto-apply at ≥0.85 unless separate ADR
4. SLOs: p95 analyze latency, error rate, publish validator fail rate, override rate
5. Hosting for inference TBD (local GPU box vs sidecar) — must be documented in `12_DEPLOYMENT.md` before enablement

## Rollout plan

1. Shadow compare dashboards/telemetry
2. Fix systematic diffs in rules packs preferentially
3. Staging hybrid on
4. Canary prod % with rules authority intact
5. ADR amendment if prod default flips

## Risks & ethics

- Prompt injection via need text
- PII leaving network if cloud gateway used
- Cost runaway

## Test plan

- Hybrid golden + post-pipeline LLM off still green
- Chaos: kill LLM mid-request → rules draft
- Security review before cloud endpoints

## Open questions

- Who owns on-call for inference?
- Cloud vs local-only forever?

## Abort criteria

- Publish parity regressions
- p95 exceeds budget with no degrade path
- Cannot keep LOCAL_LLM_ONLY / data residency constraints

## Expected ADRs

- Supersede or amend ADR-0001 prod default section only after evidence
- Inference hosting ADR
