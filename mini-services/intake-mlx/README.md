# intake-mlx — MLX microservice for need intake

Local-only service for **inference** and **LoRA fine-tune** on Apple Silicon (M1 Pro 16GB tested target).

**Model:** [mlx-community/Qwen3.5-2B-bf16](https://huggingface.co/mlx-community/Qwen3.5-2B-bf16)

## Setup

```bash
cd mini-services/intake-mlx
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional
```

From repo root, export training data:

```bash
npm run export:intake-dataset
```

## Run server (port 8100)

```bash
# from repo root
npm run dev:intake-mlx
```

Or:

```bash
cd mini-services/intake-mlx && source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8100
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Model load status |
| POST | `/v1/parse` | `{ "text": "..." }` → JSON labels |
| POST | `/train` | Start LoRA (background) |
| GET | `/train/status` | Train progress log |

## Next.js hybrid

```bash
NEED_INTAKE_LLM_ENABLED=true
NEED_INTAKE_LLM_URL=http://127.0.0.1:8100
npm run dev
```

Rules engine always runs; LLM output is merged via `reconcileParsedIntent`.

## RAM tips (16GB)

- Close Chrome during first model download / train
- `INTAKE_MLX_EAGER_LOAD=false` (default) — model loads on first `/v1/parse`
- Train: `INTAKE_MLX_TRAIN_BATCH_SIZE=1`, `INTAKE_MLX_TRAIN_ITERS=400`

## Smoke test

```bash
npm run smoke:intake-mlx
```
