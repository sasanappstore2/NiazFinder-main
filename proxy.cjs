const http = require('http');
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '4000', 10);
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '3000', 10);
const TARGET = `http://localhost:${TARGET_PORT}`;

const server = http.createServer((clientReq, clientRes) => {
  const opts = new URL(clientReq.url, TARGET);
  opts.method = clientReq.method;
  opts.headers = { ...clientReq.headers, host: `localhost:${TARGET_PORT}` };

  const proxyReq = http.request(opts, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on('error', (e) => {
    clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${LISTEN_PORT} already in use`);
  } else {
    console.error(`Server error: ${e.message}`);
  }
  process.exit(1);
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`Proxy: :${LISTEN_PORT} -> :${TARGET_PORT}`);
});
