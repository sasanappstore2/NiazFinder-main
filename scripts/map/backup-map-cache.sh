#!/usr/bin/env bash
# Backup local map tile caches (not in git).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="map-cache-${STAMP}.tar.gz"

echo "Backing up map caches to ${OUT}..."
tar -czf "$OUT" \
  data/map-vector-cache \
  data/map-tiles-cache 2>/dev/null || {
  echo "WARN: some cache dirs missing ? archiving what exists"
  tar -czf "$OUT" data/map-vector-cache 2>/dev/null || true
}

ls -lh "$OUT"
echo "Done. Store this file outside the repo before rm -rf .next or fresh clone."
