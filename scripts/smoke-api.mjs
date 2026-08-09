#!/usr/bin/env node
/**
 * Kiem API CONG KHAI tren mot backend DANG CHAY.
 *
 *     node scripts/smoke-api.mjs
 *     node scripts/smoke-api.mjs --base http://localhost:3001
 *
 * Doi lai `scripts/smoke-auth.mjs` (duong dang nhap). Kich ban nay kiem duong
 * DOC cong khai: F1 taxonomy + F2 san pham.
 *
 * Can du lieu demo:  pnpm db:seed:demo
 *
 * KHONG phai test tu dong — bo test that nam o `backend/test/`. Day la phep thu
 * cuoi cung tren HTTP that, va no bat nhung thu test khong bat: vo phan hoi tren
 * day, ma trang thai, va cach tang HTTP xu ly dau vao rac.
 */

const args = process.argv.slice(2);
const BASE = (valueOf('--base') ?? 'http://localhost:3001') + '/api/v1';

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

let pass = 0;
let fail = 0;
const loi = [];

function check(name, got, want) {
  const ok = got === want;
  if (ok) pass += 1;
  else {
    fail += 1;
    loi.push(`${name}: nhan ${JSON.stringify(got)}, mong ${JSON.stringify(want)}`);
  }
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name.padEnd(60)} ${got}`);
  return ok;
}

async function call(path) {
  const res = await fetch(BASE + path);
  const raw = await res.text();
  let body = null;
  if (raw !== '') {
    try { body = JSON.parse(raw); } catch { /* khong phai JSON */ }
  }
  return { status: res.status, body };
}

/**
 * VO PHAN HOI phai la `{ data }` hoac `{ data, meta }` — o MOI endpoint.
 *
 * Kiem ca hai chieu: co `data`, VA khong co khoa nao khac. Chieu thu hai moi bat
 * loi that: mot controller tra `{ data, total }` van co `data` nen phep kiem mot
 * chieu se cho qua, va hop dong ra ro dan tung endpoint mot.
 */
function vo(name, r, { coMeta = false } = {}) {
  const keys = Object.keys(r.body ?? {});
  const chuan =
    keys.includes('data') && keys.every((k) => k === 'data' || k === 'meta');
  check(`${name}: vo { data${coMeta ? ', meta' : ''} }`, chuan, true);
  if (coMeta) {
    const m = r.body?.meta ?? {};
    check(
      `${name}: meta du bon truong`,
      ['page', 'page_size', 'total_items', 'total_pages'].every((k) => k in m),
      true,
    );
  }
}

/** Khong endpoint cong khai nao duoc lo `id` hay `status` cua thuc the. */
function khongLoNoiBo(name, obj) {
  const xau = ['id', 'status', 'published_at', 'publishedAt', 'deleted_at', 'created_by'];
  const co = xau.filter((k) => k in (obj ?? {}));
  check(`${name}: KHONG lo truong noi bo`, co.join(',') || 'khong', 'khong');
  const camel = Object.keys(obj ?? {}).filter((k) => /[A-Z]/.test(k));
  check(`${name}: chi snake_case`, camel.join(',') || 'khong', 'khong');
}

console.log(`\nKiem API cong khai tai ${BASE}\n`);
try {
  await fetch(BASE.replace('/api/v1', '') + '/health/live');
} catch {
  console.error(`Khong ket noi duoc.\nChay \`pnpm dev:backend\` roi thu lai.\n`);
  process.exit(1);
}

// ════════════════ F1 — taxonomy ════════════════
console.log('-- F1 taxonomy: danh sach --');
for (const p of ['brands', 'product-categories', 'standards', 'applications', 'industries']) {
  const r = await call(`/${p}`);
  check(`GET /${p}`, r.status, 200);
  vo(`/${p}`, r, { coMeta: true });
  check(`/${p}: co du lieu (can db:seed:demo)`, (r.body?.data?.length ?? 0) > 0, true);
}

console.log('\n-- F1: cay long nhau --');
for (const p of ['product-categories', 'applications']) {
  const r = await call(`/${p}/tree`);
  check(`GET /${p}/tree`, r.status, 200);
  vo(`/${p}/tree`, r);
  const sau = (ns, d = 0) => Math.max(d, ...ns.map((n) => sau(n.children, d + 1)));
  const cap = r.body?.data?.length ? sau(r.body.data) : 0;
  check(`/${p}/tree: cay co it nhat 2 cap`, cap >= 2, true);
}

console.log('\n-- F1: chi tiet + khong lo truong noi bo --');
const b = await call('/brands/pac');
check('GET /brands/pac', b.status, 200);
vo('/brands/pac', b);
khongLoNoiBo('/brands/pac', b.body?.data);
check('/brands/pac: parent_slug la slug hoac null',
  b.body?.data?.parent_slug === null || typeof b.body?.data?.parent_slug === 'string', true);

const kids = await call('/brands/pac/children');
check('GET /brands/pac/children', kids.status, 200);
vo('/brands/pac/children', kids);

console.log('\n-- F1: san pham theo nhanh (MO RONG NHANH CON) --');
const goc = await call('/product-categories/petroleum-testing/products?page_size=100');
const la = await call('/product-categories/atmospheric-distillation/products?page_size=100');
check('GET .../petroleum-testing/products', goc.status, 200);
vo('.../petroleum-testing/products', goc, { coMeta: true });
check('cap 0 >= cap 2 (mo rong nhanh con)',
  (goc.body?.meta?.total_items ?? 0) >= (la.body?.meta?.total_items ?? 0), true);
check('cap 0 > cap 2 (long CHAT, khong bang nhau)',
  (goc.body?.meta?.total_items ?? 0) > (la.body?.meta?.total_items ?? 0), true);

// ════════════════ F2 — san pham ════════════════
console.log('\n-- F2: bo loc ADR-007 --');
const n = async (qs) => (await call(`/products${qs}`)).body?.meta?.total_items ?? -1;
const tatCa = await n('?page_size=100');
const pac = await n('?brand=pac&page_size=100');
const pacHz = await n('?brand=pac&brand=herzog&page_size=100');
const d86 = await n('?standard=astm-d86&page_size=100');
const va = await n('?brand=pac&brand=herzog&standard=astm-d86&page_size=100');

console.log(`        tat ca=${tatCa} pac=${pac} pac|herzog=${pacHz} d86=${d86} (pac|herzog)&d86=${va}`);
check('CUNG dimension = OR (pac|herzog > pac)', pacHz > pac, true);
check('KHAC dimension = AND (ket qua < moi ve rieng)', va < pacHz && va < d86, true);
check('AND KHONG phai OR (neu OR thi >= pacHz)', va < pacHz, true);

console.log('\n-- F2: landing --');
const l = await call('/products/landing');
check('GET /products/landing', l.status, 200);
vo('/products/landing', l);
for (const k of ['featured_categories', 'featured_brands', 'featured_standards',
  'featured_applications', 'featured_products']) {
  check(`landing.${k} co du lieu`, (l.body?.data?.[k]?.length ?? 0) > 0, true);
}

console.log('\n-- F2: chi tiet --');
const sp = await call('/products/optidist-automatic-distillation-analyzer');
check('GET /products/:slug', sp.status, 200);
vo('/products/:slug', sp);
khongLoNoiBo('/products/:slug', sp.body?.data);
check('chi tiet: quan he dung slug', typeof sp.body?.data?.brand?.slug, 'string');
check('chi tiet: DUNG MOT danh muc chinh (ADR-010)',
  (sp.body?.data?.categories ?? []).filter((c) => c.is_primary).length, 1);

console.log('\n-- ADR-011: san pham NGUNG KINH DOANH giu URL --');
const ct = await call('/products/isl-legacy-distillation-analyzer');
check('chi tiet -> 200 (KHONG 404)', ct.status, 200);
check('co discontinued = true', ct.body?.data?.discontinued, true);
const trongDs = (await call('/products?page_size=100')).body?.data ?? [];
check('VAN nam trong danh sach',
  trongDs.some((p) => p.slug === 'isl-legacy-distillation-analyzer'), true);

// ════════════════ dau vao rac ════════════════
console.log('\n-- dau vao rac: phai 4xx, KHONG BAO GIO 5xx --');
const rac = [
  ['byte NUL trong duong dan', '/brands/pac%00', 422],
  ['slug 300 ky tu', `/brands/${'a'.repeat(300)}`, 422],
  ['tham so LA', '/products?brandd=pac', 422],
  ['sort la ten cot', '/products?sort=published_at', 422],
  ['page_size qua tran', '/products?page_size=1000', 422],
  ['page = 0', '/products?page=0', 422],
  ['page khong phai so', '/products?page=abc', 422],
  ['mang qua 20 phan tu', `/products?${Array.from({ length: 30 }, (_, i) => `brand=x${i}`).join('&')}`, 422],
  ['slug khong ton tai', '/brands/khong-he-co', 404],
  ['nhanh khong ton tai', '/product-categories/khong-he-co/products', 404],
];
for (const [ten, u, mong] of rac) check(ten, (await call(u)).status, mong);

console.log('\n-- SQL injection: khong duoc 5xx, khong duoc lo du lieu --');
const doc = [
  ["' OR 1=1 --", "/brands/'%20OR%201%3D1%20--"],
  ['UNION SELECT', "/products?q=%27%20UNION%20SELECT%20password_hash%20FROM%20ltv.users--"],
  ['wildcard %', '/products?q=%25'],
  ['wildcard _', '/products?q=_'],
];
for (const [ten, u] of doc) {
  const r = await call(u);
  check(`${ten}: khong 5xx`, r.status < 500, true);
  if (r.status === 200 && r.body?.meta) {
    check(`${ten}: KHONG tra toan bo (wildcard khong lot vao LIKE)`,
      r.body.meta.total_items < tatCa, true);
  }
}

// ──────────────────────────────────────────────
console.log(`\n${fail === 0 ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${pass} dat, ${fail} khong dat\n`);
if (fail > 0) {
  for (const e of loi) console.error(`  - ${e}`);
  console.error('');
}
process.exit(fail === 0 ? 0 : 1);
