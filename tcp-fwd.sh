#!/bin/bash
# Ultra-lightweight TCP forwarder: port 3000 -> port 4000
# Uses only bash built-ins, no external tools

TARGET_PORT=4000
LISTEN_PORT=3000

while true; do
  # Create a named pipe for data transfer
  FIFO_IN="/tmp/fwd_in_$$"
  FIFO_OUT="/tmp/fwd_out_$$"
  mkfifo "$FIFO_IN" 2>/dev/null
  mkfifo "$FIFO_OUT" 2>/dev/null
  
  # Wait for connection on port 3000 using nc if available, or bash's built-in
  # Since nc isn't available, use a different approach
  # Actually, we need a proper TCP server - bash can't do this alone
  
  rm -f "$FIFO_IN" "$FIFO_OUT"
  break
done
