import { spawn } from 'node:child_process';
import { fetchRaw, startProxy, ctl, waitUp, sleep } from './runner.mjs';

const R = [];
const rec = (n, ok, detail) => R.push({ n, ok, detail });

const resolver = spawn('node', ['resolver.mjs'], { stdio: 'ignore' });
await sleep(600);

// ---------- PRODUCTION ----------
const prod = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', '4000'],
  { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
await waitUp(4000, '/products/x');
const proxy = await startProxy(4003, 4000);

// 1. 301 chinh xac
{ const r = await fetchRaw(4000, '/old-product');
  rec('1. Ma trang thai dung 301', r.status === 301, `status=${r.status} location=${r.headers.location}`); }

// 2. Body khong chua HTML da render
{ const r = await fetchRaw(4000, '/old-product');
  const clean = !/<html|SPIKE_HOME_RENDERED|SPIKE_PRODUCT_RENDERED/i.test(r.body);
  rec('2. Body khong co HTML da render', clean, `bodyLen=${r.body.length} body=${JSON.stringify(r.body.slice(0,40))}`); }

// 3. Redirect xay ra TRUOC streaming — chung minh bang: trang dich khong he chay
{ const rRedir = await fetchRaw(4000, '/old-product');
  const rPage  = await fetchRaw(4000, '/products/optidist');
  const pageDoesRender = /SPIKE_PRODUCT_RENDERED/.test(rPage.body);
  const redirectNeverRendered = !/SPIKE_/.test(rRedir.body) && rRedir.body.length < 100;
  rec('3. Redirect truoc streaming (trang dich khong chay)',
      pageDoesRender && redirectNeverRendered,
      `trang that render=${pageDoesRender}, redirect body=${rRedir.body.length}B, header sau ${rRedir.msToHeaders}ms`); }

// 5. Production build
{ const r = await fetchRaw(4000, '/old-product');
  rec('5. Production build', r.status === 301, `status=${r.status}`); }

// 6. Qua reverse proxy
{ const r = await fetchRaw(4003, '/old-product');
  rec('6. Qua reverse proxy', r.status === 301 && !!r.headers.location,
      `status=${r.status} location=${r.headers.location}`); }

// 7/8. Cache miss roi cache hit — status va Location phai giong het
{ const a = await fetchRaw(4000, '/old-product');
  const b = await fetchRaw(4000, '/old-product');
  rec('7. Cache miss', a.status === 301, `status=${a.status} cache-control=${a.headers['cache-control']}`);
  rec('8. Cache hit (lan hai giong het)', b.status === a.status && b.headers.location === a.headers.location,
      `lan1=${a.status}/${a.headers.location} lan2=${b.status}/${b.headers.location}`); }

// 9. A -> B
{ const r = await fetchRaw(4000, '/a');
  rec('9. A -> B', r.status === 301 && r.headers.location?.endsWith('/b'), `-> ${r.headers.location}`); }

// 10. A -> B -> C giai TRUC TIEP ve C, chi mot hop
{ const r = await fetchRaw(4000, '/chain-a');
  const oneHop = r.status === 301 && r.headers.location?.endsWith('/chain-c');
  rec('10. A->B->C truc tiep (mot hop)', oneHop, `-> ${r.headers.location}`); }

// 11. Resolver timeout -> fail-safe, khong render doan
await ctl('timeout');
{ const r = await fetchRaw(4000, '/old-product');
  const failSafe = r.status === 503 && !/SPIKE_/.test(r.body);
  rec('11. Resolver timeout -> 503 fail-safe', failSafe,
      `status=${r.status} resolver=${r.headers['x-resolver']} ms=${r.headers['x-resolver-ms']}`); }

// 12. Resolver chet han
await ctl('unavailable');
{ const r = await fetchRaw(4000, '/old-product');
  rec('12. Resolver khong san sang -> 503', r.status === 503 && !/SPIKE_/.test(r.body),
      `status=${r.status} resolver=${r.headers['x-resolver']}`); }

// 13. Ban cache cu cua trang: sau khi resolver song lai va doi thanh redirect,
//     request tiep theo PHAI la 301, khong duoc tra ban 200 cu.
await ctl('normal');
{ const before = await fetchRaw(4000, '/products/optidist');   // 200 that
  const after  = await fetchRaw(4000, '/old-product');          // duong da doi -> 301
  rec('13. Ban cache trang cu khong de len redirect',
      before.status === 200 && after.status === 301,
      `trang that=${before.status}, duong cu=${after.status}`); }

// 14. Sitemap cache invalidation: header no-store tren redirect
{ const r = await fetchRaw(4000, '/old-product');
  const noStore = (r.headers['cache-control'] ?? '').includes('no-store');
  rec('14. Redirect khong bi cache (no-store)', noStore, `cache-control=${r.headers['cache-control']}`); }

// 15. 20 request dong thoi trong luc doi slug
{ const results = await Promise.all(Array.from({ length: 20 }, () => fetchRaw(4000, '/old-product')));
  const allSame = results.every((x) => x.status === 301 && x.headers.location === results[0].headers.location);
  rec('15. 20 request dong thoi nhat quan', allSame,
      `status khac nhau=${new Set(results.map((x) => x.status)).size}`); }

// ---------- 4. DEVELOPMENT BUILD (chay cuoi vi `next dev` ghi de .next) ----------
proxy.close(); prod.kill(); await sleep(800);
{
  const dev = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-p', '4002'], { stdio: 'ignore' });
  await waitUp(4002, '/products/x');
  const r = await fetchRaw(4002, '/old-product');
  rec('4. Development build', r.status === 301 && !/SPIKE_/.test(r.body),
      `status=${r.status} bodyLen=${r.body.length}`);
  dev.kill(); await sleep(500);
}

console.log('='.repeat(78));
console.log('MA TRAN SPIKE HTTP 301 — Next.js 15.5.22');
console.log('='.repeat(78));
R.sort((a,b)=>parseInt(a.n)-parseInt(b.n));
for (const x of R) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.n.padEnd(48)} ${x.detail}`);
console.log('='.repeat(78));
console.log(`${R.filter(x=>x.ok).length}/${R.length} PASS`);

resolver.kill();
process.exit(R.every(x=>x.ok) ? 0 : 1);
