#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/train-estate-intake-v1-$TS.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Estate intake LoRA train v1 ($TS) ==="

TRAIN_FILE="$ROOT/data/need-intake-training/need-intake-real-estate-100k.jsonl"
SPLITS_SRC="$ROOT/data/need-intake-training/real-estate-100k-mlx-splits"
SPLITS_DST="$ROOT/data/need-intake-training/need-intake-mlx-splits"

if [[ ! -s "$TRAIN_FILE" ]]; then
  echo "ERROR: missing $TRAIN_FILE — run dataset:audit-real-estate-100k first"
  exit 1
fi

ROW_COUNT="$(wc -l < "$TRAIN_FILE" | tr -d ' ')"
echo "Training rows: $ROW_COUNT"

echo "[1/4] Dataset self-check..."
npm run test:intake-dataset

echo "[2/4] Copy MLX stratified splits..."
mkdir -p "$SPLITS_DST"
for split in train valid test; do
  if [[ -f "$SPLITS_SRC/${split}.jsonl" ]]; then
    cp "$SPLITS_SRC/${split}.jsonl" "$SPLITS_DST/${split}.jsonl"
    lines="$(wc -l < "$SPLITS_DST/${split}.jsonl" | tr -d ' ')"
    echo "  ${split}: ${lines} rows"
  fi
done

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  echo "Creating intake-mlx venv..."
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

export INTAKE_MLX_IGNORE_PREBUILT=0
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora-v1"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-3500}"
export INTAKE_MLX_TRAIN_BATCH_SIZE="${INTAKE_MLX_TRAIN_BATCH_SIZE:-1}"
export INTAKE_MLX_TRAIN_LORA_LAYERS="${INTAKE_MLX_TRAIN_LORA_LAYERS:-16}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-6e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-512}"
export INTAKE_MLX_TRAIN_MAX_HOURS="${INTAKE_MLX_TRAIN_MAX_HOURS:-14}"

echo "[3/4] LoRA train (iters=$INTAKE_MLX_TRAIN_ITERS, adapter=$INTAKE_MLX_ADAPTER_PATH)..."
(cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")

echo "[4/4] Post-train eval..."
INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora-v1" \
  NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 \
  npm run eval:intake-baseline || true

echo "=== Estate intake v1 train complete ==="
echo "Adapter: $INTAKE_MLX_ADAPTER_PATH"
echo "Log: $LOG"
