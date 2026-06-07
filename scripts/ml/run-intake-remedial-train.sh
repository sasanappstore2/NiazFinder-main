#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/retrain-v2-$TS.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== Remedial retrain v2 ($TS) ==="

REPORT="$ROOT/data/need-intake-training/ai-eval-10k-report.json"
if [[ ! -f "$REPORT" ]]; then
  echo "ERROR: run eval:ai-10k first"
  exit 1
fi

echo "[1/3] Build remedial datasets from defects..."
npm run dataset:build-remedial

COMBINED="$ROOT/data/need-intake-training/need-intake-retrain-v2.jsonl"
ADV_REM="$ROOT/data/need-intake-training/estate-advisor-remedial.jsonl"

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

echo "[2/3] Fine-tune intake on combined + remedial..."
export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$COMBINED"
export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora-v2"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"

# Warm-start from v1 if exists
if [[ -f "$ROOT/models/intake-lora-v1/adapters.safetensors" ]]; then
  mkdir -p "$ROOT/models/intake-lora-v2"
  cp "$ROOT/models/intake-lora-v1/adapters.safetensors" "$ROOT/models/intake-lora-v2/adapters.safetensors" 2>/dev/null || true
  cp "$ROOT/models/intake-lora-v1/adapter_config.json" "$ROOT/models/intake-lora-v2/" 2>/dev/null || true
fi

export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-1200}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-2e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-512}"

(cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")

if [[ -s "$ADV_REM" ]]; then
  echo "[3/3] Fine-tune advisor on remedial..."
  export INTAKE_MLX_DATASET_PATH="$ADV_REM"
  export INTAKE_MLX_ADAPTER_PATH="$ROOT/models/estate-advisor-lora-v2"
  if [[ -f "$ROOT/models/estate-advisor-lora-v1/adapters.safetensors" ]]; then
    mkdir -p "$ROOT/models/estate-advisor-lora-v2"
    cp "$ROOT/models/estate-advisor-lora-v1/adapters.safetensors" "$ROOT/models/estate-advisor-lora-v2/" 2>/dev/null || true
    cp "$ROOT/models/estate-advisor-lora-v1/adapter_config.json" "$ROOT/models/estate-advisor-lora-v2/" 2>/dev/null || true
  fi
  export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_ADVISOR_ITERS:-600}"
  export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_ADVISOR_MAX_TOKENS:-768}"
  (cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()")
else
  echo "[3/3] No advisor remedial rows — skip"
fi

echo "=== Retrain v2 complete ==="
echo "Intake adapter: models/intake-lora-v2"
echo "Advisor adapter: models/estate-advisor-lora-v2 (if remedial existed)"
echo "Log: $LOG"
