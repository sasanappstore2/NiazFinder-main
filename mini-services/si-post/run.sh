#!/usr/bin/env bash
# SI inference worker launcher.
# Model identity and the private inference package are read from the
# repo-root env files (.env / .env.local) — never hardcoded here.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENV_DIR="${SI_VENV_DIR:-$HOME/si-runtime/venv}"
if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "venv missing at $VENV_DIR — run: npm run setup:si-post" >&2
  exit 1
fi
set -a
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
[ -f "$ROOT/.env.local" ] && . "$ROOT/.env.local"
set +a
cd "$ROOT/mini-services/si-post"
exec "$VENV_DIR/bin/python" -m uvicorn app:app --host 127.0.0.1 --port 8101
