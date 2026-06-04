#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/train-auto-$TS.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Intake MLX automated train ($TS) ==="

echo "[1/5] Building 10k dataset..."
npm run build:intake-dataset-10k

echo "[2/5] Coverage report..."
npm run report:intake-dataset-coverage

echo "[3/5] Baseline eval (golden fixtures)..."
npm run test:intake-dataset

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  echo "Creating intake-mlx venv..."
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

export INTAKE_MLX_DATASET_PATH="$ROOT/data/need-intake-training/need-intake-train-10k.jsonl"
export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-2500}"
export INTAKE_MLX_TRAIN_BATCH_SIZE="${INTAKE_MLX_TRAIN_BATCH_SIZE:-1}"
export INTAKE_MLX_TRAIN_LORA_LAYERS="${INTAKE_MLX_TRAIN_LORA_LAYERS:-16}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-8e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-384}"
export INTAKE_MLX_TRAIN_MAX_HOURS="${INTAKE_MLX_TRAIN_MAX_HOURS:-12}"

echo "[4/5] Starting LoRA train (iters=$INTAKE_MLX_TRAIN_ITERS, log=$LOG)..."
(cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")

echo "[5/5] Post-train eval..."
NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 npm run eval:intake-baseline || true

echo "=== Train pipeline complete ==="
echo "Adapter: $INTAKE_MLX_ADAPTER_PATH"
echo "Full log: $LOG"
