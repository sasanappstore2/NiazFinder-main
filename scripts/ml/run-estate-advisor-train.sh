#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/train-estate-advisor-v1-$TS.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Estate advisor LoRA train v1 ($TS) ==="

TRAIN_FILE="$ROOT/data/need-intake-training/estate-expert-synth.jsonl"

if [[ ! -s "$TRAIN_FILE" ]]; then
  echo "ERROR: missing $TRAIN_FILE — run dataset:estate-expert-synth first"
  exit 1
fi

ROW_COUNT="$(wc -l < "$TRAIN_FILE" | tr -d ' ')"
echo "Training rows: $ROW_COUNT"

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/estate-advisor-lora-v1"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-1500}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-2e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-768}"
export INTAKE_MLX_TRAIN_LORA_LAYERS="${INTAKE_MLX_TRAIN_LORA_LAYERS:-16}"

echo "LoRA train (iters=$INTAKE_MLX_TRAIN_ITERS, adapter=$INTAKE_MLX_ADAPTER_PATH)..."
(cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")

echo "=== Estate advisor v1 train complete ==="
echo "Adapter: $INTAKE_MLX_ADAPTER_PATH"
echo "Log: $LOG"
