/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const TARGET = 'http://localhost:4000';

const server = http.createServer((req, res) => {
  const opts = new URL(req.url, TARGET);
  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });
  req.pipe(proxyReq);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Proxy listening on port 3000 -> 4000');
});
