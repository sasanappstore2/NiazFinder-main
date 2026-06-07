#!/usr/bin/env bash
# After estate LoRA train: restart MLX + run LLM benchmark.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ADAPTER="$ROOT/models/estate-intake-lora-v1"

if lsof -ti:8100 >/dev/null 2>&1; then
  lsof -ti:8100 | xargs kill 2>/dev/null || true
  sleep 2
fi

INTAKE_MLX_ADAPTER_PATH="$ADAPTER" npm run dev:intake-mlx >> "$ROOT/data/need-intake-training/logs/intake-mlx-post-train.log" 2>&1 &
for i in $(seq 1 90); do
  curl -sf -m 2 http://127.0.0.1:8100/health >/dev/null 2>&1 && break
  sleep 2
done

NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_LLM_URL=http://127.0.0.1:8100 \
  npm run test:estate-benchmark:llm
