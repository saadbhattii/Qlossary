// serve.mjs -- preview the site locally, including the worldwide leaderboard.
//   node tools/serve.mjs [port]
// Serves dist/ with the same headers Cloudflare sends, and runs the functions
// in functions/api/ against a local SQLite file in .local/ (Node 22.5+).
// On older Node the page works and the leaderboard reports it is not set up.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './tsv.mjs';
import { openLocalD1 } from './d1-local.mjs';
import * as leaderboard from '../functions/api/leaderboard.js';
import * as scores from '../functions/api/scores.js';
import * as activityFn from '../functions/api/activity.js';

const port = +process.argv[2] || 8788;
const dist = join(ROOT, 'dist');
const DB = await openLocalD1(join(ROOT, '.local', 'leaderboard.sqlite'), join(ROOT, 'migrations'));
const env = DB ? { DB } : {};
const routes = { '/api/leaderboard': leaderboard, '/api/scores': scores, '/api/activity': activityFn };

// Read on every request, so a rebuild never leaves stale CSP hashes. Applies
// every block whose path matches, in order, like Cloudflare: "! Name" drops a
// header set by an earlier block.
function readHeaders(path = '/') {
  const headers = {};
  let on = false;
  for (const line of readFileSync(join(dist, '_headers'), 'utf8').split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('#')) {
      const pat = line.trim();
      on = pat.endsWith('*') ? path.startsWith(pat.slice(0, -1)) : path === pat;
      continue;
    }
    if (!on) continue;
    const drop = line.match(/^\s+!\s*([\w-]+)\s*$/);
    if (drop) { delete headers[drop[1]]; continue; }
    const m = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (m) headers[m[1]] = m[2];
  }
  return headers;
}

createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const fn = routes[path];
  if (fn) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request('http://localhost:' + port + req.url, {
      method: req.method,
      headers: Object.assign({}, req.headers, { 'CF-Connecting-IP': req.socket.remoteAddress || 'local' }),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
    });
    const handler = req.method === 'GET' ? fn.onRequestGet : req.method === 'POST' ? fn.onRequestPost : null;
    const response = handler ? await handler({ request, env }) : new Response('Method not allowed', { status: 405 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    return;
  }
  const def = path.match(/^\/defs\/([\w.-]+\.json)$/);
  if (def) {
    try {
      const body = readFileSync(join(dist, 'defs', def[1]));
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, readHeaders(path)));
      res.end(body);
    } catch (e) { res.writeHead(404); res.end('Not found'); }
    return;
  }
  const font = path.match(/^\/fonts\/([\w.-]+\.woff2)$/);
  if (font) {
    try {
      const body = readFileSync(join(dist, 'fonts', font[1]));
      res.writeHead(200, Object.assign({ 'Content-Type': 'font/woff2' }, readHeaders(path)));
      res.end(body);
    } catch (e) { res.writeHead(404); res.end('Not found'); }
    return;
  }
  if (path !== '/' && path !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, readHeaders(path)));
  res.end(readFileSync(join(dist, 'index.html')));
}).listen(port, () => console.log('http://localhost:' + port + (DB ? '' : '  (leaderboard off: needs Node 22.5 or later)')));
