# Need intake — ML dataset & fine-tune path

## Phase 1: rules teacher + on-page lab

The internal rules engine is the **golden teacher**. Training data must reflect correct rule output before fine-tune.

### Dataset schema

See [`src/lib/need-intake/dataset/schema.ts`](../src/lib/need-intake/dataset/schema.ts).

Each fixture: Persian `input` + `labels` (intent, category, entities, city, budget, urgency).

### JSONL export (Qwen / MLX chat format)

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"{...json labels...}"}]}
```

### Commands (68 golden fixtures)

```bash
npm run test:intake-dataset    # eval all fixtures (target ≥90% accuracy)
npm run export:intake-dataset  # write data/need-intake-training/need-intake-train.jsonl
```

## Phase 1b: 10k hybrid dataset (recommended for fine-tune)

**Mix:** ~70% rule-verified synthetic + ~30% real Divar titles (or web-like fallback when research dir is empty).

| Vertical | Synthetic target |
|----------|-------------------|
| Real estate | 2,500 |
| Vehicles | 1,500 |
| Products / electronics / home | 1,200+ |
| Services | 1,200 |
| Jobs | 800 |
| Social | 500 |
| Web (Divar / fallback) | 3,000 |

### Build 10k dataset

```bash
# Optional: fetch real titles (rate-limited, dev only)
npm run divar:research-all

# Build train + holdout + MLX stratified splits
npm run build:intake-dataset-10k

# Verify ≥250 samples per depth-2 leaf in pool
npm run report:intake-dataset-coverage
```

**Outputs** (gitignored under `data/need-intake-training/`):

| File | Role |
|------|------|
| `need-intake-train-10k.jsonl` | ~9,500 train rows |
| `need-intake-holdout-500.jsonl` | Holdout (never in train) |
| `need-intake-mlx-splits/{train,valid,test}.jsonl` | Stratified MLX splits |
| `dataset-manifest.json` | Counts per slug, source mix |

### Per-vertical generators

```bash
npm run generate:intake-estate-dataset
# See src/lib/need-intake/dataset/generate-*-dataset.ts
```

## Phase 2: MLX microservice (Mac Apple Silicon)

Model: [mlx-community/Qwen3.5-2B-bf16](https://huggingface.co/mlx-community/Qwen3.5-2B-bf16)

### Train (~12h budget)

```bash
npm run build:intake-dataset-10k
npm run dev:intake-mlx

INTAKE_MLX_DATASET_PATH=data/need-intake-training/need-intake-train-10k.jsonl \
INTAKE_MLX_TRAIN_ITERS=2500 \
INTAKE_MLX_TRAIN_LORA_RANK=16 \
INTAKE_MLX_TRAIN_LR=8e-6 \
INTAKE_MLX_TRAIN_MAX_HOURS=12 \
npm run train:intake-mlx

# Monitor
curl -s http://127.0.0.1:8100/train/status | jq
```

### Eval before / after train

```bash
npm run eval:intake-baseline
# Live MLX (service must be running):
INTAKE_EVAL_LIVE=1 NEED_INTAKE_LLM_ENABLED=true npm run eval:intake-baseline
```

### Hybrid parse in Next

```bash
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
npm run dev
```

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/parse` | `{ "text": "..." }` → JSON labels |
| POST | `/v1/title` | `{ "context": { ... } }` → Persian listing title |
| POST | `/train` | Start LoRA (background) |
| GET | `/train/status` | Train progress log |

### Acceptance targets

| Metric | Target |
|--------|--------|
| Golden fixtures (`test:intake-dataset`) | ≥90% |
| Holdout eval (live MLX) | ≥90% on category slug |
| Depth-2 leaf coverage (pool) | ≥250 per leaf |
| Parser + intake flow self-tests | green |

**Note:** Fine-tune improves classification accuracy and reduces rules fallback — it does not literally multiply raw inference speed. Perceived speed comes from LoRA + progressive shard UX in `NeedIntakePanel`.

## Phase 2b: Unsloth (NVIDIA / Colab)

See [`scripts/ml/unsloth/README.md`](../scripts/ml/unsloth/README.md).

## Key paths

| Path | Role |
|------|------|
| `src/lib/need-intake/dataset/build-intake-dataset-10k.ts` | Merge + stratified export |
| `src/lib/need-intake/dataset/shared/` | Teacher gate, stratified sampling |
| `src/lib/need-intake/fixtures/dataset-cases.ts` | 68 golden fixtures |
| `scripts/divar/research-all-verticals.ts` | Divar title research |
| `mini-services/intake-mlx/app/train_job.py` | LoRA train job |
| `models/intake-lora/` | LoRA adapter (gitignored) |
