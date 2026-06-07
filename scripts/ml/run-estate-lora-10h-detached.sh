#!/usr/bin/env bash
# Detached estate LoRA train (~10h). Safe to run from Cursor/agent shells via screen.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$ROOT/data/need-intake-training/logs/estate-lora-train-10h.log"
PID_FILE="$ROOT/data/need-intake-training/logs/estate-lora-train.pid"
MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"
TRAIN_FILE="$ROOT/data/need-intake-training/need-intake-estate-finetune-10h.jsonl"
ADAPTER_OUT="$ROOT/models/estate-intake-lora-v1"
BASE_ADAPTER="$ROOT/models/intake-lora-v2"

mkdir -p "$(dirname "$LOG")" "$ADAPTER_OUT"

if [[ -f "$BASE_ADAPTER/adapters.safetensors" ]]; then
  cp "$BASE_ADAPTER/adapters.safetensors" "$ADAPTER_OUT/" 2>/dev/null || true
  cp "$BASE_ADAPTER/adapter_config.json" "$ADAPTER_OUT/" 2>/dev/null || true
fi

export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ADAPTER_OUT"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS=4500
export INTAKE_MLX_TRAIN_BATCH_SIZE=1
export INTAKE_MLX_TRAIN_LORA_LAYERS=16
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-3e-6}"
export INTAKE_MLX_MAX_TOKENS=512

{
  echo "=== Estate LoRA 10h detached train ==="
  echo "Started: $(date -Iseconds)"
  cd "$MLX_DIR"
  exec "$VENV" -u -c "from app.train_job import _run_train; _run_train()"
} >> "$LOG" 2>&1
