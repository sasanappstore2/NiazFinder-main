#!/usr/bin/env bash
# Auto-restart human marathon on crash until 10k complete.
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COUNT="${MARATHON_COUNT:-10000}"
MAX_RESTARTS="${MAX_RESTARTS:-500}"
RESTART=0

echo "human-marathon loop | target=$COUNT | max_restarts=$MAX_RESTARTS"

while [ "$RESTART" -lt "$MAX_RESTARTS" ]; do
  RESTART=$((RESTART + 1))
  echo ""
  echo "=== restart #$RESTART $(date -Iseconds) ==="

  EXTRA_ARGS=(--count "$COUNT" --resume --force-ai)
  if [ "${TEMPLATE_ONLY:-0}" = "1" ]; then
    EXTRA_ARGS+=(--template-only)
  fi

  if NEED_INTAKE_LLM_URL="${NEED_INTAKE_LLM_URL:-http://127.0.0.1:1234}" \
     NEED_INTAKE_LLM_MODEL="${NEED_INTAKE_LLM_MODEL:-gemma-4-E2B_q4_0-it.gguf}" \
     LOCAL_LLM_PARALLEL_SLOTS="${LOCAL_LLM_PARALLEL_SLOTS:-4}" \
     npx --yes tsx scripts/stress/run-intake-human-marathon-10k.ts -- "${EXTRA_ARGS[@]}"; then
    echo "Marathon finished successfully."
    exit 0
  fi

  CODE=$?
  echo "Marathon exited with code $CODE — retrying in 3s..."
  sleep 3
done

echo "FAIL: exceeded max restarts ($MAX_RESTARTS)"
exit 1
