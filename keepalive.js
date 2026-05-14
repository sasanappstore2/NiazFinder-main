/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logFile = '/home/z/my-project/dev.log';

function startServer() {
  const log = fs.openSync(logFile, 'a');
  // Use direct binary path to avoid npx port override
  const nextBin = path.join('/home/z/my-project/node_modules/.bin/next');
  const server = spawn(nextBin, ['dev', '--port', '3000'], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', log, log],
    detached: true,
    env: { ...process.env, PORT: '3000' },
  });
  
  server.unref();
  console.log(`Started server PID: ${server.pid}`);
  return server;
}

// Keep server alive by polling
function keepAlive() {
  const http = require('http');
  
  setInterval(() => {
    const req = http.get('http://localhost:3000/', (res) => {
      console.log(`Ping: ${res.statusCode}`);
    });
    req.on('error', () => {
      console.log('Server down, restarting...');
      startServer();
    });
    req.setTimeout(5000, () => req.destroy());
  }, 8000);
}

startServer();
keepAlive();

// Keep process alive
setInterval(() => {}, 60000);
