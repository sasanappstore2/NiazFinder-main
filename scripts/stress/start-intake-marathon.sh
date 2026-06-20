#!/usr/bin/env bash
# Start 10k intake marathon in background (resumable).
#   bash scripts/stress/start-intake-marathon.sh
#   bash scripts/stress/start-intake-marathon.sh 500 --source mixed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COUNT="${1:-10000}"
SOURCE="${2:-gemma}"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$ROOT/data/intake-marathon/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/marathon-$STAMP.log"

echo "Starting intake marathon: count=$COUNT source=$SOURCE" | tee "$LOG"
echo "Log: $LOG" | tee -a "$LOG"

cd "$ROOT"
nohup npx --yes tsx scripts/stress/run-intake-marathon-10k.ts \
  --count "$COUNT" \
  --source "$SOURCE" \
  --delay-ms 200 \
  >> "$LOG" 2>&1 &

echo $! > "$LOG_DIR/marathon.pid"
echo "PID $(cat "$LOG_DIR/marathon.pid") — tail -f $LOG"
