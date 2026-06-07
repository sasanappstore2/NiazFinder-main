#!/usr/bin/env bash
# Minimal stack for testing need-intake AI (Qwen + Next.js)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MLX_PORT="${INTAKE_MLX_PORT:-8100}"
NEXT_PORT="${NEXT_PORT:-3000}"
LOG_DIR="$ROOT/data/need-intake-training/logs"
mkdir -p "$LOG_DIR"

kill_port() {
  local port="$1"
  lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
}

echo "=== NiazFinder need-intake test stack ==="
INTAKE_MLX_ADAPTER_PATH="$(bash "$ROOT/scripts/dev/resolve-intake-mlx-adapter.sh")"
export INTAKE_MLX_ADAPTER_PATH
echo "  MLX adapter: $INTAKE_MLX_ADAPTER_PATH"
echo "  MLX :$MLX_PORT | Next :$NEXT_PORT"
echo "  Tip: set NEED_INTAKE_LLM_ENABLED=true in .env.local for Next → MLX"
echo ""

# Free ports if something stale is bound
kill_port "$MLX_PORT"

echo "[1/4] Starting intake-mlx..."
INTAKE_MLX_MODEL_ID="${INTAKE_MLX_MODEL_ID:-../../models/Qwen3.5-2B-bf16}" \
  npm run dev:intake-mlx:run >> "$LOG_DIR/dev-intake-mlx.log" 2>&1 &
MLX_PID=$!
echo "  PID $MLX_PID (log: $LOG_DIR/dev-intake-mlx.log)"

echo "[2/4] Waiting for MLX health..."
for i in $(seq 1 60); do
  if curl -sf -m 3 "http://127.0.0.1:$MLX_PORT/health" >/dev/null 2>&1; then
    curl -s "http://127.0.0.1:$MLX_PORT/health" | head -c 200
    echo ""
    break
  fi
  if ! kill -0 "$MLX_PID" 2>/dev/null; then
    echo "ERROR: intake-mlx exited. Tail log:"
    tail -20 "$LOG_DIR/dev-intake-mlx.log"
    exit 1
  fi
  sleep 2
done

if ! curl -sf -m 3 "http://127.0.0.1:$MLX_PORT/health" >/dev/null 2>&1; then
  echo "ERROR: MLX not healthy after 120s"
  exit 1
fi

kill_port "$NEXT_PORT"

echo "[3/4] Starting Next.js dev..."
npm run dev >> "$LOG_DIR/dev-next.log" 2>&1 &
NEXT_PID=$!
echo "  PID $NEXT_PID (log: $LOG_DIR/dev-next.log)"

echo "[4/4] Waiting for Next.js..."
for i in $(seq 1 90); do
  if curl -sf -m 3 "http://127.0.0.1:$NEXT_PORT" >/dev/null 2>&1; then
    echo "  Next ready on http://127.0.0.1:$NEXT_PORT"
    break
  fi
  sleep 2
done

echo ""
echo "=== Stack ready ==="
echo "  Home:    http://127.0.0.1:$NEXT_PORT"
echo "  Parse:   POST http://127.0.0.1:$NEXT_PORT/api/intake/analyze"
echo "  MLX:     http://127.0.0.1:$MLX_PORT/health"
echo ""
echo "Smoke tests:"
echo "  npm run smoke:intake-mlx"
echo "  npm run smoke:need-intake-home-parse"
echo ""
echo "Advisor mode (restart MLX):"
echo "  npm run dev:intake-mlx:advisor"
echo ""
echo "Legacy intake LoRA (A/B vs estate default):"
echo "  npm run dev:intake-mlx:legacy"
echo ""
echo "Press Ctrl+C to stop (kills MLX + Next started by this script)"
echo "MLX_PID=$MLX_PID NEXT_PID=$NEXT_PID" > "$LOG_DIR/dev-stack.pids"

cleanup() {
  echo "Stopping stack..."
  kill "$MLX_PID" "$NEXT_PID" 2>/dev/null || true
  kill_port "$MLX_PORT"
  kill_port "$NEXT_PORT"
}
trap cleanup EXIT INT TERM

wait
