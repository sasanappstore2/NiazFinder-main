#!/usr/bin/env bash
# Start full stack + 6-hour Playwright crawl marathon (detached).
#   bash scripts/crawl/start-marathon.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/data/crawl-marathon/logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
MARATHON_LOG="$LOG_DIR/marathon-$STAMP.log"
PID_FILE="$LOG_DIR/marathon.pid"

kill_port() {
  local port="$1"
  lsof -ti ":$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
}

echo "=== NiazFinder crawl marathon starter ===" | tee "$MARATHON_LOG"
echo "  Root: $ROOT" | tee -a "$MARATHON_LOG"
echo "  Log:  $MARATHON_LOG" | tee -a "$MARATHON_LOG"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Marathon already running (PID $(cat "$PID_FILE"))." | tee -a "$MARATHON_LOG"
  exit 0
fi

echo "[1/6] Docker postgres + redis..." | tee -a "$MARATHON_LOG"
docker compose up postgres redis -d 2>&1 | tee -a "$MARATHON_LOG"

echo "[2/6] Playwright chromium..." | tee -a "$MARATHON_LOG"
npx playwright install chromium 2>&1 | tee -a "$MARATHON_LOG"

echo "[3/6] Next.js :3000..." | tee -a "$MARATHON_LOG"
if ! lsof -ti :3000 >/dev/null 2>&1; then
  npm run dev >> "$LOG_DIR/next-dev-$STAMP.log" 2>&1 &
  echo "  started next (log: $LOG_DIR/next-dev-$STAMP.log)" | tee -a "$MARATHON_LOG"
else
  echo "  already running" | tee -a "$MARATHON_LOG"
fi

echo "[4/6] Chat :3004..." | tee -a "$MARATHON_LOG"
if ! lsof -ti :3004 >/dev/null 2>&1; then
  npm run dev:chat >> "$LOG_DIR/chat-$STAMP.log" 2>&1 &
  echo "  started chat" | tee -a "$MARATHON_LOG"
else
  echo "  already running" | tee -a "$MARATHON_LOG"
fi

echo "[5/6] Waiting for Next.js..." | tee -a "$MARATHON_LOG"
for _ in $(seq 1 90); do
  if curl -sf -m 4 "http://127.0.0.1:3000" >/dev/null 2>&1; then
    echo "  Next ready" | tee -a "$MARATHON_LOG"
    break
  fi
  sleep 2
done

if ! curl -sf -m 4 "http://127.0.0.1:3000" >/dev/null 2>&1; then
  echo "ERROR: Next.js not ready on :3000" | tee -a "$MARATHON_LOG"
  exit 1
fi

echo "[6/6] Starting 6h marathon (background)..." | tee -a "$MARATHON_LOG"
export CRAWL_DURATION_HOURS="${CRAWL_DURATION_HOURS:-6}"
export CRAWL_BASE_URL="${CRAWL_BASE_URL:-http://127.0.0.1:3000}"
export CRAWL_CONCURRENCY="${CRAWL_CONCURRENCY:-4}"

nohup env \
  CRAWL_DURATION_HOURS="$CRAWL_DURATION_HOURS" \
  CRAWL_BASE_URL="$CRAWL_BASE_URL" \
  CRAWL_CONCURRENCY="$CRAWL_CONCURRENCY" \
  npx --yes tsx scripts/crawl/run-marathon.ts >> "$MARATHON_LOG" 2>&1 < /dev/null &
MARATHON_PID=$!
echo "$MARATHON_PID" > "$PID_FILE"

echo "" | tee -a "$MARATHON_LOG"
echo "=== Marathon started ===" | tee -a "$MARATHON_LOG"
echo "  PID: $(cat "$PID_FILE")" | tee -a "$MARATHON_LOG"
echo "  Duration: ${CRAWL_DURATION_HOURS}h" | tee -a "$MARATHON_LOG"
echo "  Reports: data/crawl-marathon/marathon-*/REPORT.md" | tee -a "$MARATHON_LOG"
echo "  Live log: tail -f $MARATHON_LOG" | tee -a "$MARATHON_LOG"
