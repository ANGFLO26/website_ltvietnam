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
const ORIGIN = (valueOf('--base') ?? 'http://localhost:3001').replace(/\/+$/, '');
const BASE = ORIGIN + '/api/v1';

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
    try {
      body = JSON.parse(raw);
    } catch {
      /* khong phai JSON */
    }
  }
  return { status: res.status, body };
}

async function rawCall(path) {
  const res = await fetch(ORIGIN + path);
  return {
    status: res.status,
    raw: await res.text(),
    contentType: res.headers.get('content-type') ?? '',
  };
}

async function postCall(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  return { status: res.status, body: raw === '' ? null : JSON.parse(raw) };
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
  const chuan = keys.includes('data') && keys.every((k) => k === 'data' || k === 'meta');
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
check(
  '/brands/pac: parent_slug la slug hoac null',
  b.body?.data?.parent_slug === null || typeof b.body?.data?.parent_slug === 'string',
  true,
);

const kids = await call('/brands/pac/children');
check('GET /brands/pac/children', kids.status, 200);
vo('/brands/pac/children', kids);

console.log('\n-- F1: san pham theo nhanh (MO RONG NHANH CON) --');
const goc = await call('/product-categories/petroleum-testing/products?page_size=100');
const la = await call('/product-categories/atmospheric-distillation/products?page_size=100');
check('GET .../petroleum-testing/products', goc.status, 200);
vo('.../petroleum-testing/products', goc, { coMeta: true });
check(
  'cap 0 >= cap 2 (mo rong nhanh con)',
  (goc.body?.meta?.total_items ?? 0) >= (la.body?.meta?.total_items ?? 0),
  true,
);
check(
  'cap 0 > cap 2 (long CHAT, khong bang nhau)',
  (goc.body?.meta?.total_items ?? 0) > (la.body?.meta?.total_items ?? 0),
  true,
);

// ════════════════ F2 — san pham ════════════════
console.log('\n-- F2: bo loc ADR-007 --');
const n = async (qs) => (await call(`/products${qs}`)).body?.meta?.total_items ?? -1;
const tatCa = await n('?page_size=100');
const pac = await n('?brand=pac&page_size=100');
const pacHz = await n('?brand=pac&brand=herzog&page_size=100');
const d86 = await n('?standard=astm-d86&page_size=100');
const va = await n('?brand=pac&brand=herzog&standard=astm-d86&page_size=100');

console.log(
  `        tat ca=${tatCa} pac=${pac} pac|herzog=${pacHz} d86=${d86} (pac|herzog)&d86=${va}`,
);
check('CUNG dimension = OR (pac|herzog > pac)', pacHz > pac, true);
check('KHAC dimension = AND (ket qua < moi ve rieng)', va < pacHz && va < d86, true);
check('AND KHONG phai OR (neu OR thi >= pacHz)', va < pacHz, true);

console.log('\n-- F2: landing --');
const l = await call('/products/landing');
check('GET /products/landing', l.status, 200);
vo('/products/landing', l);
for (const k of [
  'featured_categories',
  'featured_brands',
  'featured_standards',
  'featured_applications',
  'featured_products',
]) {
  check(`landing.${k} co du lieu`, (l.body?.data?.[k]?.length ?? 0) > 0, true);
}

console.log('\n-- F2: chi tiet --');
const sp = await call('/products/optidist-automatic-distillation-analyzer');
check('GET /products/:slug', sp.status, 200);
vo('/products/:slug', sp);
khongLoNoiBo('/products/:slug', sp.body?.data);
check('chi tiet: quan he dung slug', typeof sp.body?.data?.brand?.slug, 'string');
check(
  'chi tiet: DUNG MOT danh muc chinh (ADR-010)',
  (sp.body?.data?.categories ?? []).filter((c) => c.is_primary).length,
  1,
);

console.log('\n-- ADR-011: san pham NGUNG KINH DOANH giu URL --');
const ct = await call('/products/isl-legacy-distillation-analyzer');
check('chi tiet -> 200 (KHONG 404)', ct.status, 200);
check('co discontinued = true', ct.body?.data?.discontinued, true);
const trongDs = (await call('/products?page_size=100')).body?.data ?? [];
check(
  'VAN nam trong danh sach',
  trongDs.some((p) => p.slug === 'isl-legacy-distillation-analyzer'),
  true,
);

// ════════════════ F3 — noi dung co ban dich ════════════════
console.log('\n-- F3: danh sach --');
for (const p of ['services', 'projects', 'posts', 'post-categories', 'documents']) {
  const r = await call(`/${p}`);
  check(`GET /${p}`, r.status, 200);
  vo(`/${p}`, r, { coMeta: true });
  check(`/${p}: co du lieu (can db:seed:demo)`, (r.body?.data?.length ?? 0) > 0, true);
}

console.log('\n-- F3: ADR-004 — CA HAI phai publish --');
/**
 * Seed co y tao hai bai KHONG duoc hien:
 *   `draft-translation-only` : cha publish, BAN DICH nhap
 *   `draft-parent-only`      : CHA nhap, ban dich publish
 * Neu mot trong hai xuat hien thi mot dieu kien trang thai da bi bo.
 */
const baiEn = (await call('/posts?page_size=100')).body?.data ?? [];
const slugBai = baiEn.map((x) => x.slug);
check('bai da publish CA HAI -> hien', slugBai.includes('new-optidist-launch'), true);
check('BAN DICH nhap -> vang', slugBai.includes('draft-translation-only'), false);
check('CHA nhap -> vang', slugBai.includes('draft-parent-only'), false);
for (const slug of ['draft-translation-only', 'draft-parent-only']) {
  check(`chi tiet ${slug} -> 404`, (await call(`/posts/${slug}`)).status, 404);
}

console.log('\n-- F3: locale --');
const pEn = await call('/posts/new-optidist-launch?locale=en');
const pVi = await call('/posts/new-optidist-launch-vi?locale=vi');
check('chi tiet EN -> 200', pEn.status, 200);
check('chi tiet VI (slug rieng) -> 200', pVi.status, 200);
check('phan hoi TU KE locale (en)', pEn.body?.data?.locale, 'en');
check('phan hoi TU KE locale (vi)', pVi.body?.data?.locale, 'vi');
check(
  'slug cua locale KHAC -> 404',
  (await call('/posts/new-optidist-launch?locale=vi')).status,
  404,
);

console.log('\n-- F3: hreflang (ADR-004) --');
/**
 * `new-optidist-launch` co CA HAI locale publish -> hai muc alternate.
 * `astm-d86-explained` chi co EN -> mang RONG. Mot the `<link hreflang>` la LOI
 * HUA voi Google rang dia chi kia ton tai; loi hua sai thi Google im lang ha do
 * tin cay ca cum trang.
 */
check('hai ngon ngu -> 2 muc alternate', (pEn.body?.data?.hreflang_alternates ?? []).length, 2);
const motNgu = await call('/posts/astm-d86-explained');
check('mot ngon ngu -> hreflang RONG', (motNgu.body?.data?.hreflang_alternates ?? []).length, 0);

console.log('\n-- F3: cay dich vu + quan he --');
const cay = await call('/services/tree');
check('GET /services/tree', cay.status, 200);
const sauCay = (ns, d = 0) => Math.max(d, ...ns.map((n) => sauCay(n.children, d + 1)));
check(
  'cay dich vu co it nhat 2 cap',
  (cay.body?.data?.length ? sauCay(cay.body.data) : 0) >= 2,
  true,
);
const nganhSv = await call('/industries/oil-and-gas/services');
check('GET /industries/:slug/services', nganhSv.status, 200);
check('nganh co dich vu gan vao', (nganhSv.body?.data?.length ?? 0) > 0, true);
check('nganh khong ton tai -> 404', (await call('/industries/khong-he-co/services')).status, 404);

console.log('\n-- F3: ADR-014 — nhom KHONG co ban dich --');
/**
 * `documents` va `post-categories` khong co bang dich, nen `?locale=` la tham so
 * LA -> 422. Neu chung im lang bo qua thi nguoi goi tin rang co ban dich.
 */
check('?locale tren /documents -> 422', (await call('/documents?locale=vi')).status, 422);
check(
  '?locale tren /post-categories -> 422',
  (await call('/post-categories?locale=vi')).status,
  422,
);
const tl = await call('/documents/optidist-datasheet');
check('chi tiet tai lieu -> 200', tl.status, 200);
khongLoNoiBo('/documents/:slug', tl.body?.data);
check('tai lieu KHONG mang locale', 'locale' in (tl.body?.data ?? {}), false);

console.log('\n-- F3: ten khach hang chi khi duoc phep --');
/**
 * Seed dat du an thu hai la `confidential`. Neu ca hai deu `public` thi nhanh che
 * ten khong bao gio duoc chay, va bai kiem nay vo nghia.
 */
const duAn1 = await call('/projects/refinery-lab-upgrade');
const duAn2 = await call('/projects/qc-lab-commissioning');
check('du an public -> 200', duAn1.status, 200);
check('du an confidential -> VAN 200 (chi che ten)', duAn2.status, 200);
check('du an confidential KHONG neu ten khach hang', duAn2.body?.data?.customer_name, null);

// ════════════════ F4 — khung site ════════════════
console.log('\n-- F4: /home --');
const home = await call('/home');
check('GET /home', home.status, 200);
vo('/home', home);
const hd = home.body?.data ?? {};
check('/home: mang locale trong than', hd.locale, 'en');
check('/home: sections co thu tu', Array.isArray(hd.sections) && hd.sections.length > 0, true);
for (const k of [
  'featured_categories',
  'featured_brands',
  'featured_applications',
  'featured_products',
  'featured_services',
  'featured_projects',
  'latest_posts',
  'customers',
]) {
  check(`/home: nhom ${k} co du lieu (can db:seed:demo)`, (hd[k]?.length ?? 0) > 0, true);
}
/**
 * KHONG LO `id`/`status` — kiem tren CA phan hoi, khong tren mot the mau.
 *
 * `/home` gop tam nhom the tu bon service khac nhau. Kiem mot the cua mot nhom
 * roi coi nhu da kiem ca trang la dung loi toi mac o F2 (kiem `brands` roi coi
 * nhu ca bon nhom taxonomy deu sach).
 */
const homeJson = JSON.stringify(hd);
check('/home: khong lo "id" o bat ky nhom nao', /"id"\s*:/.test(homeJson), false);
check('/home: khong lo "status"', /"status"\s*:/.test(homeJson), false);
check('/home: khong lo camelCase', /"[a-z]+[A-Z]\w*"\s*:/.test(homeJson), false);

console.log('\n-- F4: /home — banner co CUA SO THOI GIAN va LIEN KET DA HINH --');
const bTitles = (hd.banners ?? []).map((x) => x.title);
check('banner con hieu luc CO mat', bTitles.includes('DEMO Hero — san pham'), true);
check('banner DA HET HAN khong xuat hien', bTitles.includes('DEMO Hero — da het han'), false);
check('banner BAN NHAP khong xuat hien', bTitles.includes('DEMO Hero — ban nhap'), false);
/**
 * Banner lien ket CHET: GIU ANH, BO LIEN KET — khac voi muc menu (bi bo han).
 * Mot banner la anh lon dau trang chu; bo di thi bang chay tro trong nhu bi hong.
 */
const bChet = (hd.banners ?? []).find((x) => x.title === 'DEMO Hero — lien ket chet');
check('banner lien ket chet VAN co mat', bChet !== undefined, true);
/**
 * `bChet?.url` TRAN, khong `?? 'co'`.
 *
 * Toi viet ban dau `check(..., bChet?.url ?? 'co', null)` va ca ba phep kiem
 * "url = null" deu do: `null ?? 'co'` la `'co'`, nen chung KHONG THE dat. May la
 * loai sai nay do on ao. Neu viet nguoc lai (`?? null` cho mot phep kiem "phai co
 * gia tri") thi no se dat sai va khong ai biet.
 */
check('banner lien ket chet co url = null', bChet?.url, null);
const bSong = (hd.banners ?? []).find((x) => x.title === 'DEMO Hero — san pham');
check(
  'banner song co url da giai (bat dau /products/)',
  typeof bSong?.url === 'string' && bSong.url.startsWith('/products/'),
  true,
);

console.log('\n-- F4: /navigation --');
for (const loc of ['header', 'mobile', 'footer']) {
  const r = await call(`/navigation/${loc}`);
  check(`GET /navigation/${loc}`, r.status, 200);
  vo(`/navigation/${loc}`, r);
  check(`/navigation/${loc}: location dung`, r.body?.data?.location, loc);
}
const nav = await call('/navigation/header');
check('/navigation/header: CO mega menu tu sinh', nav.body?.data?.product_mega_menu !== null, true);
check(
  '/navigation/footer: KHONG co mega menu',
  (await call('/navigation/footer')).body?.data?.product_mega_menu,
  null,
);
check(
  '/navigation/footer: gop nhieu menu footer_*',
  ((await call('/navigation/footer')).body?.data?.menus ?? []).length > 1,
  true,
);
check('/navigation/khong-co -> 422', (await call('/navigation/khong-co')).status, 422);
check('/navigation/%00 -> 422', (await call('/navigation/%00')).status, 422);

console.log('\n-- F4: /navigation KHONG PHAT LIEN KET CHET --');
/**
 * Nam phep kiem duoi day la ly do `LinkResolver` ton tai. `link_target_id` la da
 * hinh va KHONG co khoa ngoai, nen database khong bao dam dich con ton tai — va
 * menu nam tren MOI trang.
 */
const ft = (await call('/navigation/footer')).body?.data?.menus ?? [];
const mucPhang = [];
const duyet = (xs) => {
  for (const x of xs) {
    mucPhang.push(x);
    duyet(x.children ?? []);
  }
};
for (const m of ft) duyet(m.items ?? []);
const nhan = mucPhang.map((x) => x.label);
check(
  'muc menu tro toi noi dung THAT co url',
  mucPhang.find((x) => x.label === 'DEMO Product link')?.url?.startsWith('/products/') ?? false,
  true,
);
check('muc menu LIEN KET CHET bi bo han', nhan.includes('DEMO Dead link'), false);
check('muc menu `javascript:` bi bo han', nhan.includes('DEMO Unsafe link'), false);
check('muc `link_type=none` GIU lai lam tieu de', nhan.includes('DEMO Heading'), true);
check('tieu de co url = null', mucPhang.find((x) => x.label === 'DEMO Heading')?.url, null);
/** Cha chet + con song: bo ca nhanh nghia la mat luon nhung lien ket con dung. */
const chaChet = mucPhang.find((x) => x.label === 'DEMO Dead parent');
check('cha CHET co con SONG thi VAN duoc giu', chaChet !== undefined, true);
check('cha chet co url = null', chaChet?.url, null);
check('con song van co url', nhan.includes('DEMO Live child'), true);
check(
  'KHONG muc nao co url la "javascript:..."',
  mucPhang.some((x) => typeof x.url === 'string' && x.url.startsWith('javascript:')),
  false,
);

console.log('\n-- F4: /customers — HAI dieu kien (published VA is_public) --');
const kh = await call('/customers');
check('GET /customers', kh.status, 200);
vo('/customers', kh);
const khTen = (kh.body?.data ?? []).map((x) => x.name);
check(
  'khach da duyet VA duoc phep VA co logo -> co mat',
  khTen.includes('DEMO Petro Lab JSC'),
  true,
);
check(
  'khach da duyet nhung CHUA cho phep -> khong co mat',
  khTen.includes('DEMO Quiet Refinery Ltd'),
  false,
);
check(
  'khach duoc phep nhung KHONG co logo -> khong co mat',
  khTen.includes('DEMO No Logo Co'),
  false,
);
khongLoNoiBo('/customers[0]', (kh.body?.data ?? [])[0]);
check('/customers?limit=1 -> mot muc', (await call('/customers?limit=1')).body?.data?.length, 1);
check('/customers?limit=0 -> 422', (await call('/customers?limit=0')).status, 422);
check('/customers?limit=abc -> 422', (await call('/customers?limit=abc')).status, 422);

console.log('\n-- F4: /offices --');
const vp = await call('/offices');
check('GET /offices', vp.status, 200);
vo('/offices', vp);
const vpTen = (vp.body?.data ?? []).map((x) => x.name);
check('van phong da duyet co mat', vpTen.includes('DEMO LT Vietnam — Head Office'), true);
check('van phong AN khong co mat', vpTen.includes('DEMO Workshop — an'), false);
khongLoNoiBo('/offices[0]', (vp.body?.data ?? [])[0]);
/** NUMERIC(10,7) phai ve dang SO, khong phai chuoi — `pg` tra NUMERIC la chuoi. */
const truSo = (vp.body?.data ?? []).find((x) => x.office_type === 'head_office');
check('toa do la SO, khong phai chuoi', typeof truSo?.latitude, 'number');

console.log('\n-- F4: /search --');
const s1 = await call('/search?q=OptiDist');
check('GET /search?q=OptiDist', s1.status, 200);
vo('/search', s1, { coMeta: true });
check('/search: co ket qua', (s1.body?.data?.length ?? 0) > 0, true);
check(
  '/search: moi ket qua co type=product',
  (s1.body?.data ?? []).every((x) => x.type === 'product'),
  true,
);
/**
 * TIM THEO TEN HANG — phep kiem quan trong nhat cua `/search`.
 *
 * `doc/06` PHAN IX doi tim kiem phu ca hang/danh muc/tieu chuan. Ba truong do o
 * bang KHAC, va chung phai duoc noi bang `EXISTS` chu khong bang alias cua `JOIN`:
 * doan `where` dung cho CA HAI cau, va cau DEM khong co `JOIN ltv.brands b`. Nen
 * phep kiem phai doc `total_items` (den tu cau dem), khong chi doc `data`.
 */
const s2 = await call('/search?q=PAC');
check('/search theo TEN HANG -> co ket qua', (s2.body?.data?.length ?? 0) > 0, true);
check('/search: cau DEM chay duoc (total_items > 0)', (s2.body?.meta?.total_items ?? 0) > 0, true);
check(
  '/search: total_items khop so dong khi chi mot trang',
  s2.body?.meta?.total_pages === 1 ? s2.body.meta.total_items === s2.body.data.length : true,
  true,
);
const s3 = await call('/search?q=D86');
check('/search theo MA TIEU CHUAN -> co ket qua', (s3.body?.data?.length ?? 0) > 0, true);
check('/search?q=a (mot ky tu) -> 422', (await call('/search?q=a')).status, 422);
check('/search khong co q -> 422', (await call('/search')).status, 422);
check('/search?q= rong -> 422', (await call('/search?q=')).status, 422);
check('/search: tham so la -> 422', (await call('/search?q=abc&kieu=x')).status, 422);

console.log('\n-- F4: /products/landing van dung sau khi them cache --');
const lp = await call('/products/landing');
check('GET /products/landing', lp.status, 200);
vo('/products/landing', lp);
check(
  '/products/landing: van du nam nhom',
  [
    'featured_categories',
    'featured_brands',
    'featured_standards',
    'featured_applications',
    'featured_products',
  ].every((k) => Array.isArray(lp.body?.data?.[k])),
  true,
);
/**
 * CACHE khong duoc lam sai phan hoi. Goi hai lan phai ra ket qua GIONG HET —
 * neu khac thi hoac cache tra ban cua khoa khac, hoac no dang giu tham chieu bi
 * nguoi khac sua.
 */
const lp2 = await call('/products/landing');
check(
  '/products/landing: hai lan goi cho ket qua giong het',
  JSON.stringify(lp.body) === JSON.stringify(lp2.body),
  true,
);
const home2 = await call('/home?locale=vi');
check('/home?locale=vi -> 200', home2.status, 200);
check('/home?locale=vi: locale dung (khong lay ban cache cua en)', home2.body?.data?.locale, 'vi');
check('/home?locale=fr -> 422', (await call('/home?locale=fr')).status, 422);

// ════════════════ F5 — inquiry idempotent ════════════════
console.log('\n-- F5: inquiry idempotent --');
const requestId = crypto.randomUUID();
const inquiryBody = {
  inquiry_type: 'quotation',
  full_name: 'Smoke Test F5',
  phone: '0900000000',
  message: 'Kiem tra luong inquiry idempotent',
  source_url: '/contact',
  preferred_contact_method: 'phone',
  privacy_consent: true,
  locale: 'vi',
  captcha_token: valueOf('--captcha-token') ?? 'dev-bypass',
};
const iq1 = await postCall('/inquiries', inquiryBody, { 'idempotency-key': requestId });
const iq2 = await postCall('/inquiries', inquiryBody, { 'idempotency-key': requestId });
check('POST /inquiries lan dau -> 202', iq1.status, 202);
check('POST /inquiries replay -> 202', iq2.status, 202);
check('replay tra cung request_id', iq2.body?.data?.request_id, iq1.body?.data?.request_id);
check('response public khong lo email_status', 'email_status' in (iq1.body?.data ?? {}), false);
const iqRac = await postCall(
  '/inquiries',
  {
    ...inquiryBody,
    phone: null,
    captcha_token: 'x',
  },
  { 'idempotency-key': crypto.randomUUID() },
);
check('inquiry khong phone/email -> 422', iqRac.status, 422);

// ════════════════ F6 — SEO ════════════════
console.log('\n-- F6: canonical, sitemap va robots --');
const seoProduct = await call('/products/optidist-automatic-distillation-analyzer');
check(
  'product detail: canonical tuyet doi',
  /^https?:\/\//.test(seoProduct.body?.data?.canonical ?? ''),
  true,
);
check('product detail: robots index,follow', seoProduct.body?.data?.robots, 'index,follow');

const seoThin = await call('/product-categories/petroleum-testing');
check('landing mong: robots noindex,follow', seoThin.body?.data?.robots, 'noindex,follow');
const seoThinCanonical = seoThin.body?.data?.canonical;
check(
  'landing mong: canonical ve /products/all',
  typeof seoThinCanonical === 'string' ? new URL(seoThinCanonical).pathname : null,
  '/products/all',
);

const smIndex = await rawCall('/sitemap.xml');
check('GET /sitemap.xml', smIndex.status, 200);
check('sitemap.xml la XML tho, khong boc JSON', smIndex.raw.startsWith('<?xml'), true);
check('sitemap.xml tro toi EN', smIndex.raw.includes('/sitemap-en.xml'), true);
check('sitemap.xml tro toi VI', smIndex.raw.includes('/sitemap-vi.xml'), true);

const smEn = await rawCall('/sitemap-en.xml');
check('GET /sitemap-en.xml', smEn.status, 200);
check(
  'sitemap EN co san pham published',
  smEn.raw.includes('/products/optidist-automatic-distillation-analyzer'),
  true,
);
check('sitemap EN khong co query filter', smEn.raw.includes('?brand='), false);
check(
  'sitemap EN khong co landing mong',
  smEn.raw.includes('/products/category/petroleum-testing'),
  false,
);

const smVi = await rawCall('/sitemap-vi.xml');
check('GET /sitemap-vi.xml', smVi.status, 200);
check('sitemap VI co URL /vi/', smVi.raw.includes('/vi/'), true);
check('sitemap VI khong tron san pham mot-ngon-ngu', smVi.raw.includes('/products/'), false);

const robots = await rawCall('/robots.txt');
check('GET /robots.txt', robots.status, 200);
check('robots la text/plain', robots.contentType.startsWith('text/plain'), true);
check('robots tro toi sitemap', robots.raw.includes('/sitemap.xml'), true);
check('locale sitemap sai -> 422', (await rawCall('/sitemap-fr.xml')).status, 422);

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
  [
    'mang qua 20 phan tu',
    `/products?${Array.from({ length: 30 }, (_, i) => `brand=x${i}`).join('&')}`,
    422,
  ],
  ['slug khong ton tai', '/brands/khong-he-co', 404],
  ['nhanh khong ton tai', '/product-categories/khong-he-co/products', 404],
  ['locale khong hop le', '/posts?locale=fr', 422],
  ['tree khong co phan trang', '/services/tree?page=2', 422],
  ['byte NUL trong slug noi dung', '/posts/x%00y', 422],
];
for (const [ten, u, mong] of rac) check(ten, (await call(u)).status, mong);

console.log('\n-- SQL injection: khong duoc 5xx, khong duoc lo du lieu --');
const doc = [
  ["' OR 1=1 --", "/brands/'%20OR%201%3D1%20--"],
  ['UNION SELECT', '/products?q=%27%20UNION%20SELECT%20password_hash%20FROM%20ltv.users--'],
  ['wildcard %', '/products?q=%25'],
  ['wildcard _', '/products?q=_'],
];
for (const [ten, u] of doc) {
  const r = await call(u);
  check(`${ten}: khong 5xx`, r.status < 500, true);
  if (r.status === 200 && r.body?.meta) {
    check(
      `${ten}: KHONG tra toan bo (wildcard khong lot vao LIKE)`,
      r.body.meta.total_items < tatCa,
      true,
    );
  }
}

// ──────────────────────────────────────────────
console.log(
  `\n${fail === 0 ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${pass} dat, ${fail} khong dat\n`,
);
if (fail > 0) {
  for (const e of loi) console.error(`  - ${e}`);
  console.error('');
}
process.exit(fail === 0 ? 0 : 1);
