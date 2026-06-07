#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG="$ROOT/data/need-intake-training/logs/pipeline-eval-retrain-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "=== 10k eval + remedial retrain pipeline ==="

echo "[1/5] Build eval set (10k)..."
npm run dataset:build-eval-10k

echo "[2/5] Ensure intake-mlx running with intake-lora-v1..."
if ! curl -sf -m 3 http://127.0.0.1:8100/health >/dev/null 2>&1; then
  echo "Starting intake-mlx in background..."
  INTAKE_MLX_ADAPTER_PATH="$ROOT/models/intake-lora-v1" \
    INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16" \
    npm run dev:intake-mlx >> "$ROOT/data/need-intake-training/logs/intake-mlx-eval.log" 2>&1 &
  sleep 15
  for i in $(seq 1 30); do
    curl -sf -m 5 http://127.0.0.1:8100/health >/dev/null 2>&1 && break
    sleep 2
  done
fi

echo "[3/5] Run 10k eval (may take hours)..."
NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 \
  npm run eval:ai-10k

echo "[4/5] Remedial retrain on defect buckets..."
npm run train:intake-remedial-v2

echo "[5/5] Quick re-eval sample (500 cases)..."
NEED_INTAKE_LLM_ENABLED=true npm run eval:ai-10k -- --limit=500 --no-resume || true

echo "Done. Log: $LOG"
