#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/train-divar-1k-$TS.log"

exec > >(tee -a "$LOG") 2>&1

TARGET="${DIVAR_CRAWL_TARGET:-1000}"
DELAY_MS="${DIVAR_CRAWL_DELAY_MS:-2200}"
SKIP_CRAWL="${DIVAR_SKIP_CRAWL:-0}"

echo "=== Divar 1k need dataset + MLX train ($TS) ==="

TRAIN_FILE="$ROOT/data/need-intake-training/need-intake-divar-1k.jsonl"

if [[ "$SKIP_CRAWL" != "1" ]]; then
  echo "[1/4] Crawling Divar → need fixtures (target=$TARGET)..."
  npm run dataset:divar-crawl-1k -- --target="$TARGET" --delayMs="$DELAY_MS"
else
  echo "[1/4] Skipping crawl (DIVAR_SKIP_CRAWL=1)"
fi

if [[ ! -s "$TRAIN_FILE" ]]; then
  echo "ERROR: missing training file $TRAIN_FILE"
  exit 1
fi

ROW_COUNT="$(wc -l < "$TRAIN_FILE" | tr -d ' ')"
echo "Training rows: $ROW_COUNT"

echo "[2/4] Dataset self-check..."
npm run test:intake-dataset

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  echo "Creating intake-mlx venv..."
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora-divar-1k"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"

# ~1–1.5 epochs for 1000 rows (override via env)
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-1200}"
export INTAKE_MLX_TRAIN_BATCH_SIZE="${INTAKE_MLX_TRAIN_BATCH_SIZE:-1}"
export INTAKE_MLX_TRAIN_LORA_LAYERS="${INTAKE_MLX_TRAIN_LORA_LAYERS:-16}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-8e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-384}"
export INTAKE_MLX_TRAIN_MAX_HOURS="${INTAKE_MLX_TRAIN_MAX_HOURS:-8}"

echo "[3/4] LoRA train on Divar 1k (iters=$INTAKE_MLX_TRAIN_ITERS, adapter=$INTAKE_MLX_ADAPTER_PATH)..."
(cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")

echo "[4/4] Post-train baseline eval (optional)..."
NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 npm run eval:intake-baseline || true

echo "=== Divar 1k train complete ==="
echo "Dataset: $TRAIN_FILE"
echo "Adapter: $INTAKE_MLX_ADAPTER_PATH"
echo "Log: $LOG"
