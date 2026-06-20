#!/usr/bin/env bash
# Diagnose why Docker Desktop looks empty for NiazFinder stack.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== NiazFinder Docker diagnostics ==="
echo "Project: $ROOT"
echo ""

echo "--- Docker daemon ---"
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker daemon not running. Start Docker Desktop."
  exit 1
fi
echo "OK: Docker daemon is up ($(docker version --format '{{.Server.Version}}'))"
echo ""

echo "--- Containers (all) ---"
COUNT="$(docker ps -aq | wc -l | tr -d ' ')"
if [ "$COUNT" = "0" ]; then
  echo "EMPTY: 0 containers on this machine."
  echo "  Reason: compose up never completed successfully (images not pulled yet)."
else
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
fi
echo ""

echo "--- Local images ---"
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' | head -20
echo ""

echo "--- Compose services (this repo) ---"
docker compose config --services 2>/dev/null | sed 's/^/  - /'
echo ""
echo "Profile 'ai' (not started by default): gemma4-intake, embed-intake"
echo "Profile 'ai-docker' (not started by default): ollama, ollama-init"
echo "Profile 'legacy': backend, frontend, caddy"
echo ""
echo "LLM (local dev): native Ollama on http://127.0.0.1:11434 ? npm run setup:native-ollama-gemma"
echo ""

echo "--- Registry reachability ---"
if curl -fsS --max-time 8 https://registry-1.docker.io/v2/ >/dev/null 2>&1; then
  echo "OK: Docker Hub reachable"
else
  echo "FAIL: Docker Hub NOT reachable (TLS timeout / blocked network)."
  echo "  This is why pulls fail and Docker Desktop stays empty."
  echo "  Fix: VPN, or Docker Desktop → Settings → Docker Engine → registry-mirrors"
fi
echo ""

echo "--- Local GEMMA GGUF (for Ollama mount) ---"
GGUF="$ROOT/models/GEMMA/gemma-4-E2B_q4_0-it.gguf"
if [ -f "$GGUF" ]; then
  ls -lh "$GGUF"
else
  echo "MISSING: $GGUF"
fi
echo ""

echo "--- Recommended bring-up (after network fix) ---"
echo "  cd \"$ROOT\""
echo "  npm run setup:native-ollama-gemma   # Ollama on host :11434 (no Docker)"
echo "  docker compose pull postgres redis rabbitmq minio typesense"
echo "  docker compose build worker-go chat"
echo "  npm run docker:stack:up"
echo "  curl -s http://127.0.0.1:11434/api/tags"
