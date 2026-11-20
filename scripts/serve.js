// Máy chủ tĩnh cho bản trình duyệt. Chỉ phục vụ web/, src/ và game.contract.json.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const ALLOWED = ['/web/', '/src/'];

export const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (p === '/') {
    // Chuyển hướng để URL có thư mục web/: ./main.js trong index.html phải resolve về /web/main.js.
    res.writeHead(302, { location: '/web/' + new URL(req.url, 'http://localhost').search }).end();
    return;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = '/' + path.relative(ROOT, file).split(path.sep).join('/');
  const ok = ALLOWED.some((a) => rel.startsWith(a)) || rel === '/game.contract.json';
  if (!ok || !file.startsWith(ROOT + path.sep)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  });
});

export function startServer(port = PORT, onReady = () => {}) {
  return server.listen(port, '127.0.0.1', () => {
    console.log(`Đảo Đèn Lồng đang chạy: http://127.0.0.1:${port}/`);
    onReady(port);
  });
}

// Chạy trực tiếp: node scripts/serve.js
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) startServer();
