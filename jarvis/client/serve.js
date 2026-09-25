// JARVIS — client fayllarini xizmat qiluvchi oddiy statik server
// Hech qanday tashqi paket kerak emas (faqat Node.js ichki modullari).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.CLIENT_PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Papkadan tashqariga chiqishning oldini olamiz
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Ruxsat etilmagan.');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — Fayl topilmadi.');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('==================================================');
  console.log('   JARVIS CLIENT — statik server');
  console.log('==================================================');
  console.log(`  Manzil: http://localhost:${PORT}`);
  console.log('==================================================');
});
