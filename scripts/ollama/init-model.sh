#!/bin/sh
# Register Ollama model from mounted local GGUF (no registry pull) or fall back to ollama pull.
set -eu

OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
export OLLAMA_HOST

MODEL="${OLLAMA_MODEL:-gemma4-e2b-it}"
GGUF_PATH="${OLLAMA_GGUF_PATH:-/models/GEMMA/gemma-4-E2B_q4_0-it.gguf}"
NUM_CTX="${OLLAMA_NUM_CTX:-8192}"
USE_LOCAL="${OLLAMA_USE_LOCAL_GGUF:-auto}"

echo "[ollama-init] Waiting for Ollama at ${OLLAMA_HOST}..."
TRIES=0
until ollama list >/dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -gt 90 ]; then
    echo "[ollama-init] ERROR: Ollama not reachable after 180s" >&2
    exit 1
  fi
  sleep 2
done

echo "[ollama-init] Ollama is up. Target model: ${MODEL}"

if ollama show "${MODEL}" >/dev/null 2>&1; then
  echo "[ollama-init] Model already registered: ${MODEL}"
  ollama list
  exit 0
fi

import_local=false
if [ "$USE_LOCAL" = "true" ]; then
  import_local=true
elif [ "$USE_LOCAL" = "auto" ] && [ -f "$GGUF_PATH" ]; then
  import_local=true
fi

if [ "$import_local" = "true" ]; then
  if [ ! -f "$GGUF_PATH" ]; then
    echo "[ollama-init] ERROR: Local GGUF not found at ${GGUF_PATH}" >&2
    exit 1
  fi
  echo "[ollama-init] Creating ${MODEL} from local GGUF: ${GGUF_PATH}"
  MODELFILE="$(mktemp)"
  cat >"${MODELFILE}" <<EOF
FROM ${GGUF_PATH}
PARAMETER temperature 0.1
PARAMETER num_ctx ${NUM_CTX}
EOF
  ollama create "${MODEL}" -f "${MODELFILE}"
  rm -f "${MODELFILE}"
  echo "[ollama-init] Local GGUF import complete: ${MODEL}"
  ollama list
  exit 0
fi

echo "[ollama-init] No local GGUF ? pulling ${MODEL} from registry..."
ollama pull "${MODEL}"
echo "[ollama-init] Pull complete: ${MODEL}"
ollama list
