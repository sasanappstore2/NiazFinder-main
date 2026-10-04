#!/usr/bin/env bash
# Ensure Typesense is running before `npm run dev` (see docs/TYPESENSE_SYNC.md).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST="${TYPESENSE_HOST:-127.0.0.1}"
PORT="${TYPESENSE_PORT:-8108}"
HEALTH_URL="http://${HOST}:${PORT}/health"

wait_for_health() {
  local attempts="${1:-30}"
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf "$HEALTH_URL" 2>/dev/null | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
      echo "✓ Typesense healthy at ${HEALTH_URL}"
      return 0
    fi
    sleep 1
  done
  return 1
}

if wait_for_health 3; then
  exit 0
fi

echo "Typesense not reachable — starting docker service..."
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Run: docker compose up -d typesense" >&2
  exit 1
fi

docker compose up -d typesense

if wait_for_health 45; then
  exit 0
fi

echo "ERROR: Typesense failed to become healthy at ${HEALTH_URL}" >&2
echo "Check: docker compose logs typesense" >&2
exit 1
