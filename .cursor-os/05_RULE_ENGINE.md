# 05 — Rule Engine

## Current truth

Intake is **rules-first**. Rules extract structure from Persian free text; LLM (when enabled) assists via hybrid cascade or disambiguation — it does not silently replace publish validation.

Primary config: `src/intake/rules/config.ts`  
Mode helpers: `src/lib/intake/rules-only-mode.ts`

---

## Key constants (do not “remember” — re-read file if changing)

| Constant | Value | Meaning |
|----------|------:|---------|
| `RULES_CATEGORY_MIN_CONFIDENCE` | **0.75** | General category / field chip floor |
| `REGISTRY_CATEGORY_OVERRIDE_THRESHOLD` | **0.78** | Registry override gating |
| `RULES_DISAMBIG_MIN_CONFIDENCE` | **0.85** | Disambig + **category auto-apply / chips** |
| `RULES_DISAMBIG_TOP_K` | 6 | Hypotheses kept |
| `RULES_DISAMBIG_MIN_GAP` | 0.1 | Separation for ambiguity |
| `RULES_DISAMBIG_NEAR_TOP_RATIO` | 0.6 | Near-top detection |
| `RULES_PACK_TARGET_SIZE` | 10_000 | Pack scale target |
| `RULES_ESTATE_PACK_TARGET_SIZE` | 2_000 | Estate leaf packs |
| `RULES_PACKS_DIR` | `src/intake/rules/packs` | Pack location |

UI binding:

```ts
// src/lib/need-intake/build-intake-understanding.ts
UNDERSTANDING_CATEGORY_MIN_CONFIDENCE = RULES_DISAMBIG_MIN_CONFIDENCE // 0.85
UNDERSTANDING_FIELD_MIN_CONFIDENCE = RULES_CATEGORY_MIN_CONFIDENCE     // 0.75
```

**Changing category auto-apply below 0.85 requires an ADR.**

---

## Mode flags

| Flag | Effect |
|------|--------|
| `NEED_INTAKE_RULES_ONLY=true` | Force rules-only UX/server gate |
| `NEED_INTAKE_LLM_ENABLED` | Allow LLM paths when not rules-only |
| `NEED_INTAKE_HYBRID_ENABLED=true` | AI→Rules→AI hybrid cascade |
| `NEED_INTAKE_DISAMBIG_AI_ENABLED` | AI disambiguation (respects rules-only) |
| `NEED_INTAKE_INTENT_SLICE_ENABLED` | Intent slice experiment |

Production posture (`docs/ENV_MAP.md`): LLM **false**. Local `.env.local` may enable hybrid/LLM — never assume prod = local.

Helpers:

- `isIntakeAiGloballyDisabled()` / `isIntakeRulesOnlyMode()`
- `isHybridIntakeConfigured()`
- `isDisambigAiEnabled()`

---

## Engine layout

```text
src/intake/
  rules/           config, packs, disambig
  extractors/      field extractors (transaction, …)
  normalizer/ tokenizer/ matchers/ scoring/
  smart-extractor/ rules + advanced rules engine
  intelligence-engine/
    hybrid/        hybrid-pipeline
    resolvers/     location, budget, property, …
    category/      category-intent-engine
    scoring/       field-confidence-engine
  validation/ wizard/ template/ telemetry/ training/
```

Orchestration also via `src/lib/need-intake/` (draft merge, understanding, publish helpers).

---

## Disambiguation policy

When top rule hypotheses are close:

1. Keep top-K (`RULES_DISAMBIG_TOP_K`)
2. If confidence gap < `MIN_GAP` or near-top ratio triggers → ambiguity
3. Optional AI disambig if enabled
4. **Compose UI:** do not reintroduce location/gap/verify ambiguity prompts without RFC; category only auto-applies at ≥0.85 and non-ambiguous commercial subtypes. User corrects on the form step.

Do not auto-paint weak categories into the form (`NeedIntakePanel` guards).

---

## Packs & verticals

- Rule packs under `src/intake/rules/packs`
- Estate has smaller cartesian target + collision tables
- Vertical expansion tests: `test:vertical-expansion`, jobs/vehicles/services self-tests

When adding a vertical:

1. Packs + extractors
2. Required fields template
3. Publish validator coverage
4. Golden / scenario fixtures
5. Telemetry keys if new failure modes

---

## Confidence bag semantics

Fields carried as `{ value, confidence, source }` where `source` is typically `rule` | resolver | AI.

High-confidence prior fields (≥0.85) are protected from casual overwrite in scoring paths — respect merge policy tests (`test:intake-merge-policy`).

---

## Publish authority

Rules + validators decide publish readiness. Schema-evolution proposals are **human review only** (no auto-apply) — see API comment on schema-evolution proposals route.

Shadow / CCQS / cognitive engines may score quality; they must not bypass publish validators.

---

## Tests (rules-centric)

| Script | Role |
|--------|------|
| `test:post-pipeline` | LLM off pipeline |
| `test:post-estate-scenarios` | Estate |
| `test:post-intake-scenarios` | Broader scenarios |
| `test:intake-merge-policy` | Merge / confidence |
| `test:hybrid-runtime` | Hybrid wiring |
| `test:publish-validator` | Publish gate |
| `test:neighborhood-filter-parity` | Geo filters |

Hybrid golden lives under intelligence-engine fixtures (aim 100% when hybrid enabled in CI/local gate).

---

## Anti-patterns

- Hardcoding 0.85 in UI without importing shared constant
- Lowering thresholds to “make demos pretty”
- Deleting rules packs because LLM “handles it”
- Mixing backup tree `src/intake.backup.*` into live imports
