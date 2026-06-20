#!/usr/bin/env bash
# Register local GEMMA GGUF in native Ollama (no Docker Hub, no download).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
GGUF="${OLLAMA_GGUF_PATH:-$ROOT/models/GEMMA/gemma-4-E2B_q4_0-it.gguf}"
export OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-gemma4-e2b-it}"
export OLLAMA_USE_LOCAL_GGUF=true

if ! curl -fsS --max-time 3 "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
  echo "Starting Ollama app..."
  open -a Ollama 2>/dev/null || true
  for _ in $(seq 1 30); do
    curl -fsS --max-time 2 "${OLLAMA_HOST}/api/tags" >/dev/null 2>&1 && break
    sleep 2
  done
fi

bash "$ROOT/scripts/ollama/init-model.sh"
echo ""
echo "OK: ${OLLAMA_MODEL} ready at ${OLLAMA_HOST}"
echo "Test: curl ${OLLAMA_HOST}/api/generate -d '{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"hi\",\"stream\":false}'"
