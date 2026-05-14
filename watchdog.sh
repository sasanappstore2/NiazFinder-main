#!/bin/bash
# Dev server watchdog - keeps Next.js alive
LOG="/home/z/my-project/dev.log"
echo "[$(date)] Watchdog started" >> "$LOG"

while true; do
  # Check if Next.js is already running
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    # Server is alive, keep alive by fetching
    sleep 10
    continue
  fi

  # Kill any stale processes
  pkill -f "next dev" 2>/dev/null
  sleep 1

  echo "[$(date)] Starting Next.js dev server..." >> "$LOG"
  
  # Start server in background
  cd /home/z/my-project
  npx next dev --port 3000 >> "$LOG" 2>&1 &
  SERVER_PID=$!
  
  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
      echo "[$(date)] Server ready (PID: $SERVER_PID)" >> "$LOG"
      break
    fi
    # Check if process died
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[$(date)] Server process died immediately" >> "$LOG"
      break
    fi
    sleep 1
  done
  
  # Keep this process running
  sleep 5
done
