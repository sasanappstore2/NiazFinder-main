#!/bin/bash
# Keep-alive dev server script
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..."
  sleep 2
done
