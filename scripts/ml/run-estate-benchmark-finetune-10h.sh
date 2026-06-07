#!/usr/bin/env bash
# 10-hour estate parse-intent LoRA fine-tune → benchmark ≥99% (LLM path).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/estate-finetune-10h-$TS.log"
PID_FILE="$LOG_DIR/estate-finetune-10h-$TS.pid"

exec > >(tee -a "$LOG") 2>&1
echo "$$" > "$PID_FILE"

MAX_SECONDS="${ESTATE_FINETUNE_MAX_SECONDS:-36000}"
ADAPTER_OUT="$ROOT/models/estate-intake-lora-v1"
BASE_ADAPTER="$ROOT/models/intake-lora-v2"

echo "=== Estate benchmark fine-tune (10h budget) ==="
echo "Started: $(date -Iseconds)"
echo "PID: $$"
echo "Log: $LOG"
echo "Max seconds: $MAX_SECONDS"
echo "Output adapter: $ADAPTER_OUT"

echo ""
if [[ "${SKIP_FINETUNE_BASELINE:-0}" != "1" ]]; then
  echo "[1/6] Rules benchmark baseline..."
  NEED_INTAKE_LLM_ENABLED=false npm run test:estate-benchmark || true

  echo ""
  echo "[2/6] LLM benchmark baseline (if MLX up)..."
  if curl -sf -m 3 http://127.0.0.1:8100/health >/dev/null 2>&1; then
    NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 \
      npx --yes tsx src/lib/need-intake/estate/run-estate-benchmark.ts --live-llm || true
  else
    echo "MLX not running — skip LLM baseline"
  fi
else
  echo "[1-2/6] Skipping baselines (SKIP_FINETUNE_BASELINE=1)"
fi

echo ""
echo "[3/6] Build training datasets..."
npm run dataset:build-estate-benchmark-train
npm run dataset:merge-estate-finetune-10h

TRAIN_FILE="$ROOT/data/need-intake-training/need-intake-estate-finetune-10h.jsonl"
ROW_COUNT="$(wc -l < "$TRAIN_FILE" | tr -d ' ')"
echo "Training file: $TRAIN_FILE ($ROW_COUNT rows)"

MLX_DIR="$ROOT/mini-services/intake-mlx"
VENV="$MLX_DIR/.venv/bin/python"

if [[ ! -x "$VENV" ]]; then
  echo "Creating intake-mlx venv..."
  (cd "$MLX_DIR" && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt)
fi

echo ""
echo "[4/6] Prepare adapter (warm-start from intake-lora-v2)..."
mkdir -p "$ADAPTER_OUT"
if [[ -f "$BASE_ADAPTER/adapters.safetensors" ]]; then
  cp "$BASE_ADAPTER/adapters.safetensors" "$ADAPTER_OUT/" 2>/dev/null || true
  cp "$BASE_ADAPTER/adapter_config.json" "$ADAPTER_OUT/" 2>/dev/null || true
  echo "Warm-started from $BASE_ADAPTER"
elif ls "$BASE_ADAPTER"/*_adapters.safetensors >/dev/null 2>&1; then
  latest="$(ls -t "$BASE_ADAPTER"/*_adapters.safetensors | head -1)"
  cp "$latest" "$ADAPTER_OUT/adapters.safetensors" 2>/dev/null || cp "$latest" "$ADAPTER_OUT/" || true
  cp "$BASE_ADAPTER/adapter_config.json" "$ADAPTER_OUT/" 2>/dev/null || true
  echo "Warm-started from latest checkpoint in $BASE_ADAPTER"
else
  echo "No warm-start weights — training from base model"
fi

export INTAKE_MLX_IGNORE_PREBUILT=1
export INTAKE_MLX_DATASET_PATH="$TRAIN_FILE"
export INTAKE_MLX_ADAPTER_PATH="$ADAPTER_OUT"
export INTAKE_MLX_MODEL_ID="$ROOT/models/Qwen3.5-2B-bf16"
export INTAKE_MLX_TRAIN_ITERS="${INTAKE_MLX_TRAIN_ITERS:-4500}"
export INTAKE_MLX_TRAIN_BATCH_SIZE="${INTAKE_MLX_TRAIN_BATCH_SIZE:-1}"
export INTAKE_MLX_TRAIN_LORA_LAYERS="${INTAKE_MLX_TRAIN_LORA_LAYERS:-16}"
export INTAKE_MLX_TRAIN_LR="${INTAKE_MLX_TRAIN_LR:-3e-6}"
export INTAKE_MLX_MAX_TOKENS="${INTAKE_MLX_MAX_TOKENS:-512}"
export INTAKE_MLX_TRAIN_MAX_HOURS="${INTAKE_MLX_TRAIN_MAX_HOURS:-10}"

echo ""
echo "[5/6] LoRA train (iters=$INTAKE_MLX_TRAIN_ITERS, max ~10h)..."
TRAIN_START=$SECONDS

(
  cd "$MLX_DIR" && "$VENV" -c "from app.train_job import _run_train; _run_train()"
) &
TRAIN_PID=$!

(
  sleep "$MAX_SECONDS"
  if kill -0 "$TRAIN_PID" 2>/dev/null; then
    echo "Time budget reached (${MAX_SECONDS}s) — stopping train PID $TRAIN_PID"
    kill "$TRAIN_PID" 2>/dev/null || true
    sleep 5
    kill -9 "$TRAIN_PID" 2>/dev/null || true
  fi
) &
WATCHDOG_PID=$!

set +e
wait "$TRAIN_PID"
TRAIN_EXIT=$?
set -e
kill "$WATCHDOG_PID" 2>/dev/null || true

TRAIN_ELAPSED=$((SECONDS - TRAIN_START))
echo "Train finished exit=$TRAIN_EXIT elapsed=${TRAIN_ELAPSED}s"

echo ""
echo "[6/6] Post-train LLM benchmark..."
# Restart MLX with new adapter
if lsof -ti:8100 >/dev/null 2>&1; then
  echo "Stopping existing MLX on :8100..."
  lsof -ti:8100 | xargs kill 2>/dev/null || true
  sleep 2
fi

echo "Starting MLX with adapter $ADAPTER_OUT ..."
INTAKE_MLX_ADAPTER_PATH="$ADAPTER_OUT" npm run dev:intake-mlx >> "$LOG_DIR/intake-mlx-estate-$TS.log" 2>&1 &
MLX_PID=$!
for i in $(seq 1 90); do
  if curl -sf -m 2 http://127.0.0.1:8100/health >/dev/null 2>&1; then
    echo "MLX ready (pid $MLX_PID)"
    break
  fi
  sleep 2
done

NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 \
  npx --yes tsx src/lib/need-intake/estate/run-estate-benchmark.ts --live-llm --report-md || true

echo ""
echo "=== Estate fine-tune complete ==="
echo "Adapter: $ADAPTER_OUT"
echo "Log: $LOG"
echo "Finished: $(date -Iseconds)"
