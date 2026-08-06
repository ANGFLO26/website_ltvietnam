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
const PASSWORD = valueOf('--password') ?? 'mat-khau-quan-tri-rat-dai';

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

  let json = {};
  try { json = await res.json(); } catch { /* than rong */ }
  return { status: res.status, body: json, setCookie: res.headers.getSetCookie?.() ?? [] };
}

// ──────────────────────────────────────────────────────────────
console.log(`\nKiem backend tai ${BASE}\n`);

try {
  await fetch(BASE + '/health/live');
} catch {
  console.error(`Khong ket noi duoc toi ${BASE}.\nChay \`pnpm dev:backend\` o mot cua so khac roi thu lai.\n`);
  process.exit(1);
}

console.log('-- health khong can dang nhap --');
check('GET /health/live', (await call('GET', '/health/live')).status, 200);
check('GET /health/ready', (await call('GET', '/health/ready')).status, 200);

console.log('\n-- mac dinh MOI endpoint deu can dang nhap --');
check('GET /auth/me khi chua dang nhap', (await call('GET', '/api/v1/auth/me')).status, 401);

console.log('\n-- tai khoan quan tri dau tien --');
const boot = await call('POST', '/api/v1/auth/bootstrap', {
  name: 'Quan tri', email: EMAIL, password: PASSWORD,
});
if (boot.status === 409) {
  console.log(`  bo qua  da co tai khoan quan tri — dung ${EMAIL} da tao truoc do`);
} else {
  check('POST /auth/bootstrap lan dau', boot.status, 201);
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

const sess = login.setCookie.find((c) => c.startsWith('ltv_session')) ?? '';
const csrfCookie = login.setCookie.find((c) => c.startsWith('ltv_csrf')) ?? '';
check('cookie phien co HttpOnly', sess.includes('HttpOnly'), true);
check('cookie phien co SameSite=Strict', sess.includes('SameSite=Strict'), true);
check('cookie CSRF doc duoc tu JavaScript', !csrfCookie.includes('HttpOnly'), true);

console.log('\n-- dung phien --');
const me = await call('GET', '/api/v1/auth/me');
check('GET /auth/me', me.status, 200);
check('KHONG lo ma bam mat khau', 'passwordHash' in (me.body.user ?? {}), false);

console.log('\n-- CSRF --');
check('POST thieu header CSRF -> 403',
  (await call('POST', '/api/v1/auth/change-password',
    { current_password: PASSWORD, new_password: 'khong-quan-trong-lam' })).status, 403);
check('POST header CSRF sai -> 403',
  (await call('POST', '/api/v1/auth/change-password',
    { current_password: PASSWORD, new_password: 'khong-quan-trong-lam' },
    { 'x-csrf-token': 'gia-mao-ma-nay' })).status, 403);

console.log('\n-- doi mat khau va thu hoi phien --');
const MOI = PASSWORD + '-doi-roi';
check('doi mat khau voi CSRF dung -> 201',
  (await call('POST', '/api/v1/auth/change-password',
    { current_password: PASSWORD, new_password: MOI },
    { 'x-csrf-token': jar.get('ltv_csrf') ?? '' })).status, 201);

// Cookie da bi xoa boi phan hoi tren; dat lai de chung minh THE CU da chet
// chu khong phai chi vi trinh duyet khong con cookie.
jar.set('ltv_session', sess.split(';')[0].split('=')[1]);
check('phien CU bi thu hoi ngay', (await call('GET', '/api/v1/auth/me')).status, 401);
jar.clear();

check('mat khau CU khong dung nua',
  (await call('POST', '/api/v1/auth/login', { email: EMAIL, password: PASSWORD })).status, 401);
check('mat khau MOI dung duoc',
  (await call('POST', '/api/v1/auth/login', { email: EMAIL, password: MOI })).status, 201);

console.log('\n-- quen mat khau khong lo email nao co that --');
const a = await call('POST', '/api/v1/auth/forgot-password', { email: EMAIL });
const b = await call('POST', '/api/v1/auth/forgot-password', { email: 'khong-he-co@ltvietnam.local' });
check('email co that / khong co that cung ma HTTP', a.status === b.status && a.status === 201, true);

// ──────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${pass} dat, ${fail} khong dat\n`);

if (fail === 0) {
  console.log(`Tai khoan quan tri: ${EMAIL}`);
  console.log(`Mat khau hien tai : ${MOI}`);
  console.log('(kich ban da doi mat khau de kiem viec thu hoi phien)\n');
}

process.exit(fail === 0 ? 0 : 1);
