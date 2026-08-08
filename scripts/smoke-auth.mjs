#!/usr/bin/env node
/**
 * Kiem luong dang nhap tren mot backend DANG CHAY.
 *
 *     node scripts/smoke-auth.mjs
 *     node scripts/smoke-auth.mjs --base http://localhost:3001
 *
 * Vi sao co kich ban nay thay vi mot danh sach lenh `curl` trong tai lieu:
 * mot danh sach lenh phai go tay, de go nham, va khong ai chay lai sau khi
 * doi ma nguon. Mot kich ban thi chay duoc moi luc va noi ro cho nao hong.
 *
 * KHONG phai test tu dong — bo test that nam o `backend/test/`. Day la phep
 * thu cuoi cung tren HTTP that, sau khi da khoi dong may chu.
 */

const args = process.argv.slice(2);
const BASE = valueOf('--base') ?? 'http://localhost:3001';
const EMAIL = valueOf('--email') ?? 'admin@ltvietnam.local';
const GOC = valueOf('--password') ?? 'mat-khau-quan-tri-rat-dai';
/**
 * Kich ban DOI mat khau o cuoi (de kiem viec thu hoi phien), nen sau mot lan
 * chay thi mat khau khong con la `GOC` nua. Doi qua lai giua HAI gia tri thay
 * vi noi them duoi: chay bao nhieu lan cung duoc, va mat khau khong dai ra.
 */
const KIA = `${GOC}-doi-roi`;
let PASSWORD = GOC;

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

let pass = 0;
let fail = 0;

function check(name, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  const dau = ok ? '  ok  ' : ' FAIL ';
  console.log(`${dau} ${name.padEnd(48)} ${got}${ok ? '' : `  (mong ${want})`}`);
  return ok;
}

/** Giu cookie giua cac lan goi, giong trinh duyet. */
const jar = new Map();

async function call(method, path, body, extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar.size > 0) {
    headers['Cookie'] = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // `getSetCookie` co tu Node 20 — tra ve TUNG header rieng, khong gop chuoi.
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === '' ) jar.delete(name);
    else jar.set(name, value);
  }

  /**
   * Doc THAN THO truoc, roi moi parse.
   *
   * Ban truoc goi `res.json()` trong `try/catch` va tra `{}` khi that bai —
   * nen mot phan hoi 204 co than `{ "data": null }` (sai chuan HTTP) va mot
   * phan hoi 204 dung chuan deu cho ra `{}`, khong the phan biet. Giu `raw`
   * thi kiem duoc "204 KHONG co than" thanh mot khang dinh that.
   */
  const raw = await res.text();
  let json = null;
  if (raw !== '') {
    try { json = JSON.parse(raw); } catch { /* than khong phai JSON */ }
  }
  return { status: res.status, body: json, raw, setCookie: res.headers.getSetCookie?.() ?? [] };
}

/**
 * Vo phan hoi thanh cong PHAI la `{ data }` hoac `{ data, meta }` — doc/06
 * PHAN X.
 *
 * Kiem ca hai chieu: co `data`, VA khong co khoa nao khac. Chieu thu hai moi
 * la chieu bat loi that: mot controller tra `{ data, user }` van co `data` nen
 * phep kiem mot chieu se cho qua, va hop dong ra ro dan ma khong ai thay.
 */
function voChuan(name, r) {
  const keys = Object.keys(r.body ?? {});
  const dung = keys.includes('data') && keys.every((k) => k === 'data' || k === 'meta');
  check(`${name}: than la { data } / { data, meta }`, dung, true);
  if (!dung) console.log(`        khoa thuc te: ${keys.join(', ') || '(khong co)'}`);
}

/** `204` la KHONG CO THAN. Mot than rong `{}` cung la sai. */
function khongThan(name, r) {
  check(`${name}: 204 khong co than`, r.raw, '');
}

// ──────────────────────────────────────────────────────────────
console.log(`\nKiem backend tai ${BASE}\n`);

try {
  await fetch(BASE + '/health/live');
} catch {
  console.error(`Khong ket noi duoc toi ${BASE}.\nChay \`pnpm dev:backend\` o mot cua so khac roi thu lai.\n`);
  process.exit(1);
}

console.log('-- health khong can dang nhap, va KHONG bi boc vo --');
const live = await call('GET', '/health/live');
check('GET /health/live', live.status, 200);
check('GET /health/ready', (await call('GET', '/health/ready')).status, 200);
/**
 * Health nam NGOAI `/api/v1` (`main.ts` loai no khoi tien to), nen no khong
 * thuoc hop dong API — nguoi tieu thu la trinh dieu phoi, khong phai frontend.
 * `@NoEnvelope()` giu no phang, va Luat 10c gioi han decorator do trong mot
 * danh sach trang de no khong tro thanh duong thoat cho endpoint khac.
 */
check('health KHONG co khoa `data`', 'data' in (live.body ?? {}), false);
check('health tra thang { status }', live.body?.status, 'ok');

console.log('\n-- mac dinh MOI endpoint deu can dang nhap --');
check('GET /auth/me khi chua dang nhap', (await call('GET', '/api/v1/auth/me')).status, 401);

console.log('\n-- tai khoan quan tri dau tien --');
const boot = await call('POST', '/api/v1/auth/bootstrap', {
  name: 'Quan tri', email: EMAIL, password: PASSWORD,
});
if (boot.status === 409) {
  console.log(`  bo qua  da co tai khoan quan tri — dung ${EMAIL} da tao truoc do`);
  // Lan chay truoc da doi mat khau. Xem gia tri nao dang dung, roi dung tiep
  // gia tri do — KHONG noi long bai kiem nao, chi lay dung trang thai hien co.
  const thu = await call('POST', '/api/v1/auth/login', { email: EMAIL, password: GOC });
  if (thu.status !== 201) PASSWORD = KIA;
  console.log(`  bo qua  mat khau dang dung: ${PASSWORD === GOC ? 'goc' : 'da doi o lan truoc'}`);
} else {
  check('POST /auth/bootstrap lan dau', boot.status, 201);
  voChuan('bootstrap', boot);
  check('bootstrap: data CHINH LA tai nguyen', boot.body?.data?.email, EMAIL);
}
// Email phai HOP LE that: `x@y.z` bi tu choi o buoc kiem dinh dang (TLD mot
// ky tu) va tra 422 truoc khi cham toi luat "da co quan tri" — bai kiem se
// do vi ly do sai. Lan chay dau cua chinh kich ban nay dinh dung cho do.
check('POST /auth/bootstrap lan hai bi tu choi',
  (await call('POST', '/api/v1/auth/bootstrap',
    { name: 'Nguoi thu hai', email: 'nguoi-hai@ltvietnam.local', password: PASSWORD })).status, 409);

console.log('\n-- kiem dau vao --');
const bad = await call('POST', '/api/v1/auth/login', { email: 'khong-phai-email', password: '' });
check('email sai dinh dang -> 422', bad.status, 422);
// Vo LOI la `{ error }`, khong phai `{ data }`. Hai vo khac nhau cho hai ket
// qua khac nhau; tron chung lai thi frontend phai doan.
check('than loi co `error`, KHONG co `data`',
  'error' in (bad.body ?? {}) && !('data' in (bad.body ?? {})), true);
const fields = (bad.body?.error?.details ?? bad.body?.details)?.fields ?? [];
console.log(`        truong sai: ${fields.map((f) => f.field).join(', ') || '(khong co)'}`);

console.log('\n-- dang nhap --');
check('sai mat khau -> 401',
  (await call('POST', '/api/v1/auth/login', { email: EMAIL, password: 'sai-mat-khau-roi' })).status, 401);

const login = await call('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD });
if (!check('dung mat khau -> 201', login.status, 201)) {
  console.error('\nKhong dang nhap duoc — dung o day.\n');
  process.exit(1);
}
voChuan('login', login);
/**
 * `data` CHINH LA tai nguyen, khong phai `{ user: ... }`.
 *
 * Ban truoc controller tra `{ user: result.user }`; qua vo se thanh
 * `{ data: { user: {...} } }` — mot lop long khong noi gi. Khang dinh nay la
 * cho phat hien nguoc lai neu ai do them lop do tro lai.
 */
check('login: data.email dung', login.body?.data?.email, EMAIL);
check('login: KHONG long them lop `user`', 'user' in (login.body?.data ?? {}), false);
check('login: KHONG lo the phien trong than', 'token' in (login.body?.data ?? {}), false);

const sess = login.setCookie.find((c) => c.startsWith('ltv_session')) ?? '';
const csrfCookie = login.setCookie.find((c) => c.startsWith('ltv_csrf')) ?? '';
check('cookie phien co HttpOnly', sess.includes('HttpOnly'), true);
check('cookie phien co SameSite=Strict', sess.includes('SameSite=Strict'), true);
check('cookie CSRF doc duoc tu JavaScript', !csrfCookie.includes('HttpOnly'), true);

console.log('\n-- dung phien --');
const me = await call('GET', '/api/v1/auth/me');
check('GET /auth/me', me.status, 200);
voChuan('me', me);
/**
 * Khang dinh CO cho DUNG truoc, roi moi khang dinh KHONG co cho SAI.
 *
 * Ban truoc dong nay la `'passwordHash' in (me.body.user ?? {})` — va `?? {}`
 * lam no XANH MOT CACH VO NGHIA sau khi vo doi hinh dang: `me.body.user` thanh
 * `undefined`, nen `'passwordHash' in {}` la `false`, dung ket qua mong doi.
 * Mot phep kiem bao mat khong con doc dung cho nao thi no khong con kiem gi.
 *
 * Nen: xac nhan doc DUNG cho truoc (`data.email` khop), sau do moi noi ve
 * nhung truong khong duoc co.
 */
const meData = me.body?.data ?? {};
check('me: doc dung cho — data.email khop', meData.email, EMAIL);
for (const truong of ['passwordHash', 'password_hash', 'status', 'passwordChangedAt', 'password_changed_at']) {
  check(`me: KHONG lo \`${truong}\``, truong in meData, false);
}
// snake_case mot chieu cho toan bo API (doc/06 dung `page_size`, `request_id`).
check('me: chi dung snake_case', Object.keys(meData).some((k) => /[A-Z]/.test(k)), false);
check('me: co last_login_at', 'last_login_at' in meData, true);

console.log('\n-- CSRF --');
check('POST thieu header CSRF -> 403',
  (await call('POST', '/api/v1/auth/change-password',
    { current_password: PASSWORD, new_password: 'khong-quan-trong-lam' })).status, 403);
check('POST header CSRF sai -> 403',
  (await call('POST', '/api/v1/auth/change-password',
    { current_password: PASSWORD, new_password: 'khong-quan-trong-lam' },
    { 'x-csrf-token': 'gia-mao-ma-nay' })).status, 403);

console.log('\n-- doi mat khau va thu hoi phien --');
const MOI = PASSWORD === GOC ? KIA : GOC;
/**
 * `204`, khong phai `201 { ok: true }`.
 *
 * `{ ok: true }` khong mang thong tin nao ma ma HTTP chua noi, va no bat
 * frontend chon giua `res.ok` va `body.data.ok` — hai nguon cho cung mot su
 * that, nen som muon co cho doc nguon sai.
 */
const doi = await call('POST', '/api/v1/auth/change-password',
  { current_password: PASSWORD, new_password: MOI },
  { 'x-csrf-token': jar.get('ltv_csrf') ?? '' });
check('doi mat khau voi CSRF dung -> 204', doi.status, 204);
khongThan('doi mat khau', doi);

// Cookie da bi xoa boi phan hoi tren; dat lai de chung minh THE CU da chet
// chu khong phai chi vi trinh duyet khong con cookie.
jar.set('ltv_session', sess.split(';')[0].split('=')[1]);
check('phien CU bi thu hoi ngay', (await call('GET', '/api/v1/auth/me')).status, 401);
jar.clear();

check('mat khau CU khong dung nua',
  (await call('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD })).status, 401);
const lai = await call('POST', '/api/v1/auth/login', { email: EMAIL, password: MOI });
check('mat khau MOI dung duoc', lai.status, 201);

console.log('\n-- dang xuat --');
const out = await call('POST', '/api/v1/auth/logout', {});
check('POST /auth/logout -> 204', out.status, 204);
khongThan('logout', out);

console.log('\n-- quen mat khau khong lo email nao co that --');
const a = await call('POST', '/api/v1/auth/forgot-password', { email: EMAIL });
const b = await call('POST', '/api/v1/auth/forgot-password', { email: 'khong-he-co@ltvietnam.local' });
/**
 * Hai muc nay tim ra mot loi that: han muc theo IP cua `forgot-password` la 3,
 * nen ba yeu cau tu MOT IP voi BA email khac nhau la het luot — nguoi thu tu
 * trong mot van phong sau NAT khong the dat lai mat khau. Da tach thanh
 * IP 10 / email 3.
 *
 * Neu chung do voi 429 thi kich ban da chay qua nhieu lan trong 15 phut, chu
 * khong phai backend hong.
 */
if (a.status === 429 || b.status === 429) {
  console.log('        (429 — da chay kich ban nay >5 lan trong 15 phut, doi roi thu lai)');
}
check('email co that / khong co that cung ma HTTP', a.status === b.status && a.status === 204, true);
// Cung phai cung THAN: mot than khac nhau cung la mot kenh ro ri, du ma HTTP
// giong nhau.
check('va cung mot than', a.raw === b.raw && a.raw === '', true);

// ──────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${pass} dat, ${fail} khong dat\n`);

if (fail === 0) {
  console.log(`Tai khoan quan tri: ${EMAIL}`);
  console.log(`Mat khau hien tai : ${MOI}`);
  console.log('(kich ban da doi mat khau de kiem viec thu hoi phien)\n');
}

process.exit(fail === 0 ? 0 : 1);
