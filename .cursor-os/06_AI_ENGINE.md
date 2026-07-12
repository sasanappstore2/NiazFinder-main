# 06 — AI Engine

## Current truth

| Layer | Status |
|-------|--------|
| Prod launch posture | LLM **off** (`NEED_INTAKE_LLM_ENABLED=false`) — rules engine |
| Local optional | LM Studio / Gemma GGUF on `:1234` |
| Hybrid cascade | `NEED_INTAKE_HYBRID_ENABLED` |
| Docker `ai` profile | `gemma4-intake`, `embed-openai` sidecars |
| Docker `ai-docker` | Ollama + init |
| Cloud LLM | Not the default; `LOCAL_LLM_ONLY` steers local gateway |

Do not document fictional GPU clusters. Prefer local gateway patterns evidenced in `docs/ENV_MAP.md` and `.env.example`.

---

## Gateways & models

### LM Studio (common local path)

| Var | Purpose |
|-----|---------|
| `NEED_INTAKE_LLM_URL` | Base URL (`http://127.0.0.1:1234`) |
| `NEED_INTAKE_LLM_MODEL` | Model id or path to GGUF |
| `NEED_INTAKE_LLM_TIMEOUT_MS` | Timeouts (q4 GGUF often needs 60–120s) |
| `LOCAL_LLM_ONLY` | Force OpenAI-compatible local gateway |
| `LOCAL_LLM_PARALLEL_SLOTS` | Concurrency (match LM Studio parallel) |
| `AGENT_LLM_BASE_URL` / `AGENT_LLM_MODEL` | Chat agent — same gateway family |

Verify scripts (see package.json): `verify:lm-studio-parallel`, `smoke:local-llm-intake`.

### Docker sidecars

| Service | Profile | Notes |
|---------|---------|-------|
| `gemma4-intake` | `ai` | Legacy sidecar path; ENV_MAP mentions `:8100` |
| `embed-openai` | `ai` | Embeddings for semantic retrieval |
| `ollama` + `ollama-init` | `ai-docker` | Pull/run models in compose |

`npm run dev:gemma4-intake` may start sidecar without full profile.

---

## Hybrid pipeline

When `NEED_INTAKE_HYBRID_ENABLED=true` and not rules-only:

```text
AI draft signals → Rules authoritative extract/merge → optional AI fill/disambig
```

Implementation: `src/intake/intelligence-engine/hybrid/hybrid-pipeline.ts` and related orchestrator.

**Invariant:** publish validators + rules confidence still gate UX auto-apply.

Related flags:

- `NEED_INTAKE_DISAMBIG_AI_ENABLED`
- `NEED_INTAKE_TRUTH_VERIFY_*`
- `NEED_INTAKE_INTENT_GIST_*` (gist provider local/gemini experiments)
- `NEED_INTAKE_PARSE_CACHE_VERSION_BUMP` — bust caches when logic/model changes
- `NEXT_PUBLIC_NEED_INTAKE_*` mirrors for client behavior

---

## Semantic / embeddings

- Category embedding index: `src/intake/intelligence-engine/semantic/`
- Local embeddings client: `src/lib/local-llm/local-embeddings-client.ts`
- pgvector search helpers for agent memory / docs — not business browse

Degrade gracefully when embedding gateway is down (return `[]` / skip semantic).

---

## AI confidence (separate module)

`src/ai/config/feature-flags.ts` uses `AI_CONFIDENCE_THRESHOLD` default **0.85** for semantic resolver force-AI decisions. Do not confuse with intake category chip threshold — related numerically, different modules.

---

## Title / copy AI

| Flag | Role |
|------|------|
| `NEED_INTAKE_TITLE_AI_ENABLED` | Title generation (prod default false) |
| `NEXT_PUBLIC_NEED_INTAKE_COPY_AI_ENABLED` | Copy assists |
| `NEXT_PUBLIC_NEED_INTAKE_LIVE_COPY_ENABLED` | Live copy |

Title sanitizers/guards have dedicated tests — keep deterministic fallbacks.

---

## Queue offload

When `RABBITMQ_ENABLED=true`, heavy intake jobs can route via RabbitMQ → `worker-go` (`RABBITMQ_ROUTING_INTAKE`, `INTAKE_QUEUE`). Sync fallback exists when disabled.

Do not assume worker-go replaces Next API ownership.

---

## Evaluation harnesses

- Hybrid golden self-test (intelligence-engine fixtures)
- CCQS / SEE / cognitive-engine — research & gating, not silent prod swap
- Admin evaluation dashboard components under `src/components/admin`

---

## Safety

1. Never commit model weights or API keys.
2. Do not enable prod cloud inference without security + cost ADR.
3. Timeouts must fail soft to rules.
4. Prompt injection: treat user need text as untrusted; do not execute tool-like content from ads.
5. PII in prompts: minimize; no logging raw secrets.

---

## Checklist — enabling AI locally

- [ ] LM Studio (or sidecar) healthy
- [ ] `.env.local` flags set; cache bump if model changed
- [ ] `NEED_INTAKE_RULES_ONLY=false`
- [ ] Run hybrid/runtime + a small post-pipeline subset
- [ ] Confirm category auto-apply still respects 0.85
- [ ] Do not commit `.env.local`
