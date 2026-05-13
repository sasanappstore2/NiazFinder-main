#!/bin/bash
# Kill existing processes
fuser -k 3000/tcp 2>/dev/null
fuser -k 4000/tcp 2>/dev/null
sleep 1

# Start proxy
cd /home/z/my-project
node proxy3000.cjs &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Start Next.js dev server  
npx next dev -p 4000 &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Wait for both
wait
