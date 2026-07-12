#!/usr/bin/env bash
# Ensure Typesense is running and reachable before the Next.js app starts.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_KEY="${TYPESENSE_API_KEY:-niazfinder_typesense_dev_key}"
HOST="${TYPESENSE_HOST:-127.0.0.1}"
PORT="${TYPESENSE_PORT:-8108}"
PROTOCOL="${TYPESENSE_PROTOCOL:-http}"
BASE="${PROTOCOL}://${HOST}:${PORT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ensure:typesense] docker not found — skip (search will fall back to DB if Typesense is down)"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "[ensure:typesense] docker daemon not reachable — skip"
  exit 0
fi

echo "[ensure:typesense] starting typesense container…"
docker compose up -d typesense >/dev/null

ok=0
for _ in $(seq 1 30); do
  body="$(curl -sf -m 2 "${BASE}/health" 2>/dev/null || true)"
  if echo "$body" | grep -q ok; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "[ensure:typesense] WARNING: Typesense did not become healthy at ${BASE}/health"
  exit 0
fi

echo "[ensure:typesense] healthy at ${BASE}"

DOC_COUNT="$(
  curl -sf -m 5 -H "X-TYPESENSE-API-KEY: ${API_KEY}" \
    "${BASE}/collections/business_profiles" 2>/dev/null \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('num_documents',0))" 2>/dev/null \
    || echo "missing"
)"

if [[ "$DOC_COUNT" == "missing" || "$DOC_COUNT" == "0" ]]; then
  if [[ "${TYPESENSE_SKIP_AUTO_SYNC:-}" == "1" ]]; then
    echo "[ensure:typesense] index empty — auto-sync skipped (TYPESENSE_SKIP_AUTO_SYNC=1)"
  else
    echo "[ensure:typesense] index empty — running sync:typesense…"
    set +e
    TYPESENSE_ENABLED=true \
      TYPESENSE_API_KEY="${API_KEY}" \
      TYPESENSE_HOST="${HOST}" \
      TYPESENSE_PORT="${PORT}" \
      TYPESENSE_PROTOCOL="${PROTOCOL}" \
      npm run sync:typesense
    sync_ec=$?
    set -e
    if [[ "$sync_ec" -ne 0 ]]; then
      echo "[ensure:typesense] WARNING: sync:typesense failed (exit ${sync_ec}) — browse will fall back to DB until sync succeeds"
    fi
  fi
else
  echo "[ensure:typesense] collection business_profiles has ${DOC_COUNT} document(s)"
fi
