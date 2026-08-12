// Verification proxy: serves dist/web statically and forwards /api → :3046
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../dist/web/browser');
const API = { host: '127.0.0.1', port: 3046 };
const PORT = 4299;

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
  '.txt': 'text/plain',
};

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const proxy = http.request(
      { host: API.host, port: API.port, path: req.url, method: req.method, headers: req.headers },
      (pr) => {
        res.writeHead(pr.statusCode, pr.headers);
        pr.pipe(res);
      },
    );
    proxy.on('error', () => { res.writeHead(502); res.end('proxy error'); });
    req.pipe(proxy);
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(idx);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('verification server on :' + PORT));
