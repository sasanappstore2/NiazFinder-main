#!/usr/bin/env bash
# LoRA train only — 10h budget, no baselines (called by run-estate-benchmark-finetune-10h.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/estate-train-only-$TS.log"

exec > >(tee -a "$LOG") 2>&1

MAX_SECONDS="${ESTATE_FINETUNE_MAX_SECONDS:-36000}"
ADAPTER_OUT="$ROOT/models/estate-intake-lora-v1"
BASE_ADAPTER="$ROOT/models/intake-lora-v2"
TRAIN_FILE="$ROOT/data/need-intake-training/need-intake-estate-finetune-10h.jsonl"

echo "=== Estate LoRA train-only ==="
echo "PID: $$ | Started: $(date -Iseconds)"
echo "Log: $LOG"
echo "Adapter: $ADAPTER_OUT"
echo "Dataset: $TRAIN_FILE ($(wc -l < "$TRAIN_FILE" | tr -d ' ') rows)"

if [[ ! -s "$TRAIN_FILE" ]]; then
  echo "ERROR: missing dataset — run npm run dataset:merge-estate-finetune-10h"
  exit 1
fi

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"
if [[ ! -x "$VENV" ]]; then
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

mkdir -p "$ADAPTER_OUT"
if [[ -f "$BASE_ADAPTER/adapters.safetensors" ]]; then
  cp "$BASE_ADAPTER/adapters.safetensors" "$ADAPTER_OUT/" 2>/dev/null || true
  cp "$BASE_ADAPTER/adapter_config.json" "$ADAPTER_OUT/" 2>/dev/null || true
elif ls "$BASE_ADAPTER"/*_adapters.safetensors >/dev/null 2>&1; then
  latest="$(ls -t "$BASE_ADAPTER"/*_adapters.safetensors | head -1)"
  cp "$latest" "$ADAPTER_OUT/adapters.safetensors" 2>/dev/null || cp "$latest" "$ADAPTER_OUT/" || true
  cp "$BASE_ADAPTER/adapter_config.json" "$ADAPTER_OUT/" 2>/dev/null || true
fi

export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ADAPTER_OUT"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-4500}"
export INTAKE_MLX_TRAIN_BATCH_SIZE=1
export INTAKE_MLX_TRAIN_LORA_LAYERS=16
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-3e-6}"
export INTAKE_MLX_MAX_TOKENS=512

TRAIN_START=$SECONDS
(
  cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()"
) &
TRAIN_PID=$!
echo "Train PID: $TRAIN_PID"

(
  sleep "$MAX_SECONDS"
  if kill -0 "$TRAIN_PID" 2>/dev/null; then
    echo "Time budget ${MAX_SECONDS}s reached — stopping train"
    kill "$TRAIN_PID" 2>/dev/null || true
    sleep 5
    kill -9 "$TRAIN_PID" 2>/dev/null || true
  fi
) &
WATCHDOG=$!

wait "$TRAIN_PID" || true
kill "$WATCHDOG" 2>/dev/null || true

echo "Done elapsed=$((SECONDS - TRAIN_START))s adapter=$ADAPTER_OUT"
