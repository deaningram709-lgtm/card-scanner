const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3003;
const WWW = path.join(__dirname, 'www');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  // Proxy API calls to Anthropic
  if (req.url.startsWith('/api/')) {
    const anthropicPath = '/v1/' + req.url.slice(5);
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const opts = {
        hostname: 'api.anthropic.com', port: 443, path: anthropicPath,
        method: req.method,
        headers: { ...req.headers, host: 'api.anthropic.com' }
      };
      const proxy = https.request(opts, pRes => {
        res.writeHead(pRes.statusCode, pRes.headers);
        pRes.pipe(res);
      });
      proxy.on('error', e => { res.writeHead(502); res.end('Proxy error: ' + e.message); });
      if (body) proxy.write(body);
      proxy.end();
    });
    return;
  }

  // Serve static files
  let filePath = path.join(WWW, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Test server: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
