#!/bin/bash
# Auto-restart manager for NeedFinder
# Keeps the production server and proxy alive

PROJECT_DIR="/home/z/my-project"
SERVER_LOG="$PROJECT_DIR/server.log"
PROXY_LOG="$PROJECT_DIR/proxy.log"
MANAGER_LOG="$PROJECT_DIR/manager.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') Manager starting..." >> "$MANAGER_LOG"

while true; do
  # Check if Next.js server is running on port 4000
  if ! ss -tlnp | grep -q ':4000'; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') Starting Next.js server on port 4000..." >> "$MANAGER_LOG"
    cd "$PROJECT_DIR/.next/standalone"
    PORT=4000 NODE_OPTIONS="--max-old-space-size=512" NODE_ENV=production nohup node server.js >> "$SERVER_LOG" 2>&1 &
    echo "$(date '+%Y-%m-%d %H:%M:%S') Next.js server started (PID: $!)" >> "$MANAGER_LOG"
    sleep 5
  fi

  # Check if proxy is running on port 3000
  if ! ss -tlnp | grep -q ':3000'; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') Starting proxy on port 3000..." >> "$MANAGER_LOG"
    cd "$PROJECT_DIR"
    nohup node proxy.cjs >> "$PROXY_LOG" 2>&1 &
    echo "$(date '+%Y-%m-%d %H:%M:%S') Proxy started (PID: $!)" >> "$MANAGER_LOG"
    sleep 2
  fi

  # Wait before checking again
  sleep 3
done
