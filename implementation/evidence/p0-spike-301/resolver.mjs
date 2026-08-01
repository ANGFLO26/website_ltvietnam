import { createServer } from 'node:http';

/**
 * Gia lap Nest route resolver.
 * Nest la nguon authoritative cho redirect (D11). Next chi giao ket qua.
 */
const RULES = new Map([
  ['/old-product',   { kind: 'redirect', status: 301, target: '/products/optidist' }],
  ['/a',             { kind: 'redirect', status: 301, target: '/b' }],
  // A -> B -> C phai giai TRUC TIEP ve C (plan 12 muc 7)
  ['/chain-a',       { kind: 'redirect', status: 301, target: '/chain-c' }],
  ['/chain-b',       { kind: 'redirect', status: 301, target: '/chain-c' }],
  ['/temporary',     { kind: 'redirect', status: 302, target: '/products/optidist' }],
  ['/gone-page',     { kind: 'gone' }],
  ['/missing-page',  { kind: 'not_found' }],
]);

let mode = 'normal';           // normal | timeout | unavailable
let hits = 0, cacheHits = 0;

export const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__control') {
    mode = url.searchParams.get('mode') ?? 'normal';
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ mode }));
  }
  if (url.pathname === '/__stats') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ hits, cacheHits, mode }));
  }

  if (mode === 'unavailable') { res.destroy(); return; }
  if (mode === 'timeout') { return; }           // khong bao gio tra loi

  hits++;
  const target = url.searchParams.get('path') ?? '/';
  const rule = RULES.get(target) ?? { kind: 'content' };
  res.writeHead(200, { 'content-type': 'application/json', 'x-resolver-cache': 'MISS' });
  res.end(JSON.stringify(rule));
});

server.listen(4001, () => process.stdout.write('[resolver] :4001\n'));
