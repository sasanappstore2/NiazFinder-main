# Need intake — ML dataset & fine-tune path

## Phase 1 (current): rules teacher + on-page lab

The internal rules engine is the **golden teacher**. Training data must reflect correct rule output before Unsloth fine-tune.

### Dataset schema

See [`src/lib/need-intake/dataset/schema.ts`](../src/lib/need-intake/dataset/schema.ts).

Each fixture: Persian `input` + `labels` (intent, category, entities, city, budget, urgency).

### JSONL export (Qwen / Unsloth chat format)

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"{...json labels...}"}]}
```

### Commands

```bash
npm run test:intake-dataset    # eval all fixtures (target ≥75% accuracy)
npm run export:intake-dataset  # write data/need-intake-training/need-intake-train.jsonl
```

### Dev lab on `/post`

When `NODE_ENV=development`, **آزمایشگاه ثبت نیاز** appears at the bottom of [`/post`](http://localhost:3000/post):

- Run all fixtures (calls `GET /api/need-intake/eval-fixtures`)
- Download JSONL (`POST /api/need-intake/export-dataset`)
- Live parse trace + custom text parse

APIs return **404** in production.

### Acceptance before fine-tune

| Metric | Target |
|--------|--------|
| Dataset eval (`test:intake-dataset`) | ≥90% (current fixtures: 58 cases) |
| Parser self-test | green |
| Intake flow self-test | green |
| Manual QA ([NEED_INTAKE.md](./NEED_INTAKE.md) checklist) | no blockers |

## Phase 2: MLX microservice (Mac Apple Silicon)

Local service: [`mini-services/intake-mlx/README.md`](../mini-services/intake-mlx/README.md)

Model: [mlx-community/Qwen3.5-2B-bf16](https://huggingface.co/mlx-community/Qwen3.5-2B-bf16)

```bash
npm run export:intake-dataset   # data/need-intake-training/ (gitignored)
npm run dev:intake-mlx          # :8100
npm run train:intake-mlx        # POST /train (close heavy apps on 16GB RAM)
```

Hybrid parse + analyze + title in Next (Qwen primary; rules fallback when MLX down):

```bash
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
npm run dev
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/parse` | `{ "text": "..." }` → JSON labels |
| POST | `/v1/title` | `{ "context": { ... } }` → Persian listing title (≤70 chars) |
| POST | `/train` | Start LoRA (background) |
| GET | `/train/status` | Train progress log |

| Path | Role |
|------|------|
| `mini-services/intake-mlx/` | FastAPI infer + LoRA train |
| `src/lib/need-intake/qwen-intake-client.ts` | Next → MLX client (parse + title) |
| `src/lib/need-intake/llm-parse-client.ts` | Low-level parse client (used by qwen-intake-client) |
| `models/intake-lora/` | LoRA adapter (gitignored) |

## Phase 2b: Unsloth (NVIDIA / Colab)

See [`scripts/ml/unsloth/README.md`](../scripts/ml/unsloth/README.md) — alternative to MLX on non-Mac GPUs.

## Files

| Path | Role |
|------|------|
| `src/lib/need-intake/fixtures/dataset-cases.ts` | Golden fixtures |
| `src/lib/need-intake/fixtures/category-coverage.ts` | Coverage report |
| `src/lib/need-intake/dataset/eval-dataset.ts` | Eval harness |
| `src/components/need-intake/lab/IntakeLabPanel.tsx` | Dev UI |
