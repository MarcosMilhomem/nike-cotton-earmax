// Minimal static file server (supports HTTP Range for video seeking).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 4599;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    // Dev server: never let the browser serve a stale index.html / css / js
    const noCache = { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' };

    if (range && type === 'video/mp4') {
      const [s, e] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(s, 10);
      const end = e ? parseInt(e, 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': type,
        ...noCache,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', ...noCache });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}).listen(PORT, () => console.log(`Serving ${ROOT} on http://localhost:${PORT}`));
