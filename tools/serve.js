// Tiny static server for local preview:  node tools/serve.js  ->  http://localhost:8080
// (The page fetches img/map.svg, so opening index.html straight from disk won't work.)
const http = require('http'), fs = require('fs'), path = require('path')
const ROOT = path.join(__dirname, '..'), PORT = +process.env.PORT || 8080
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json' }
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p.endsWith('/')) p += 'index.html'
  const file = path.join(ROOT, path.normalize(p))
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found') }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(buf)
  })
}).listen(PORT, () => console.log(`Serving on http://localhost:${PORT}`))
