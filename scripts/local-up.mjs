#!/usr/bin/env node
/**
 * Dung moi truong phat trien — MOT lenh, chay duoc tren Windows / macOS / Linux.
 *
 *     node scripts/local-up.mjs
 *
 * Vi sao viet bang Node chu khong phai PowerShell hay bash:
 *   - PowerShell 7 (`pwsh`) KHONG co san tren Windows. Ban co san la
 *     "Windows PowerShell" 5.1, chay tren .NET Framework va thieu mot so API
 *     cua .NET moi — mot kich ban `.ps1` de ngam khac biet do.
 *   - `.sh` can Git Bash hoac WSL.
 *   - Node thi DA LA dieu kien bat buoc cua du an nay, va giong nhau tren
 *     moi he dieu hanh.
 *
 * Kich ban AN TOAN khi chay lai: khong ghi de `.env` da co, va migration co
 * checksum nen chay lai khong lam gi thua.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const buoc = (n, msg) => console.log(`\n==> ${n}  ${msg}`);
const xong = (msg) => console.log(`    ${msg}`);
const loi = (msg) => console.error(`    ${msg}`);

function chet(msg) {
  loi(msg);
  process.exit(1);
}

/** Chay lenh, in truc tiep ra man hinh. Nem loi neu that bai. */
function chay(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) chet(`Lenh that bai: ${cmd} ${args.join(' ')}`);
}

/** Chay lenh im lang, tra ve { ok, out }. Khong nem loi. */
function thu(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

/** Cong TCP nay co dang trong khong. */
function congTrong(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '0.0.0.0');
  });
}

/** Doc/ghi mot khoa trong `.env` ma khong dung toi cac dong khac. */
function datEnv(khoa, giaTri) {
  const cu = readFileSync('.env', 'utf8');
  const mau = new RegExp(`^${khoa}=.*$`, 'm');
  const moi = mau.test(cu) ? cu.replace(mau, `${khoa}=${giaTri}`) : `${cu.trimEnd()}\n${khoa}=${giaTri}\n`;
  writeFileSync('.env', moi);
}

function docEnv(khoa) {
  const m = new RegExp(`^${khoa}=(.*)$`, 'm').exec(readFileSync('.env', 'utf8'));
  return m ? m[1].trim() : null;
}

/**
 * Chon cong con trong cho PostgreSQL, va ghi lai vao `.env`.
 *
 * Rat nhieu may da co san mot ban PostgreSQL cai truc tiep tren Windows dang
 * giu 5432. Khi do `docker compose up` do voi "port is already allocated" —
 * mot thong bao dung nhung khong noi phai lam gi tiep.
 *
 * Thay vi bat nguoi dung tu go cai kia hay tu sua cau hinh, kich ban tim
 * cong trong tiep theo va cap nhat CA HAI cho phai khop nhau:
 * `POSTGRES_HOST_PORT` (docker gan cong nao) va `DATABASE_URL` (ung dung goi
 * cong nao). Sua mot cai ma quen cai kia la loi kho lan ra nhat.
 */
async function chonCongTrong() {
  const dangDung = Number(docEnv('POSTGRES_HOST_PORT') ?? 5432);

  // Container CUA TA dang chay san thi cong bi chiem la binh thuong.
  const ten = thu('docker', ['ps', '--filter', 'name=ltv-postgres', '--format', '{{.Names}}']);
  if (ten.ok && ten.out.includes('ltv-postgres')) {
    xong(`container ltv-postgres da chay tren cong ${dangDung}`);
    return;
  }

  if (await congTrong(dangDung)) {
    xong(`cong ${dangDung} con trong`);
    return;
  }

  let moi = null;
  for (let p = dangDung + 1; p <= dangDung + 20; p++) {
    if (await congTrong(p)) { moi = p; break; }
  }
  if (moi === null) chet(`Cong ${dangDung} bi chiem va khong tim duoc cong trong nao gan do.`);

  loi(`Cong ${dangDung} da bi mot chuong trinh khac chiem`);
  loi('(thuong la mot ban PostgreSQL cai truc tiep tren may)');
  xong(`Chuyen sang cong ${moi} va cap nhat .env:`);
  datEnv('POSTGRES_HOST_PORT', String(moi));

  const url = docEnv('DATABASE_URL') ?? '';
  const urlMoi = url.replace(/(@[^/:]+):\d+\//, `$1:${moi}/`);
  datEnv('DATABASE_URL', urlMoi);
  xong(`  POSTGRES_HOST_PORT=${moi}`);
  xong(`  DATABASE_URL=...@localhost:${moi}/...`);
}

// ────────────────────────────────────────────────────────────────
buoc('1/6', 'Kiem cong cu');

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 22) chet(`Can Node >= 22, dang co v${process.versions.node}`);
xong(`Node v${process.versions.node}`);

if (!thu('pnpm', ['-v']).ok) {
  console.log('    Chua co pnpm — dang cai...');
  chay('npm', ['install', '-g', 'pnpm@10.34.5']);
}
xong(`pnpm ${thu('pnpm', ['-v']).out}`);

const docker = thu('docker', ['info']);
if (!docker.ok) {
  chet(
    'Docker chua chay.\n' +
      '    Windows/macOS: mo Docker Desktop roi chay lai kich ban nay.\n' +
      '    Linux: sudo systemctl start docker',
  );
}
xong('Docker dang chay');

// ────────────────────────────────────────────────────────────────
buoc('2/6', 'Tao .env neu chua co');

if (existsSync('.env')) {
  xong('.env da co — GIU NGUYEN, khong ghi de');
} else {
  if (!existsSync('.env.example')) chet('Khong tim thay .env.example');
  /**
   * Bi mat sinh tu bo sinh ngau nhien cua he dieu hanh.
   *
   * Hai bi mat phai KHAC nhau: dung chung thi mot the dat lai mat khau doi
   * duoc thanh the phien va nguoc lai. `assertProductionSafe()` cung tu choi
   * khoi dong neu chung trung nhau.
   */
  const biMat = () => randomBytes(48).toString('base64');
  const env = readFileSync('.env.example', 'utf8')
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${biMat()}`)
    .replace(/^PASSWORD_RESET_SECRET=.*$/m, `PASSWORD_RESET_SECRET=${biMat()}`);
  writeFileSync('.env', env);
  xong('.env da tao, bi mat sinh ngau nhien');
  xong('COOKIE_SECURE=false — dung cho http://localhost.');
  xong('Tren may chu that phai de `true`, neu khong API TU CHOI khoi dong.');
}

// ────────────────────────────────────────────────────────────────
buoc('3/6', 'Khoi dong PostgreSQL 16');

await chonCongTrong();
chay('docker', ['compose', 'up', '-d', 'postgres', 'media-init']);

process.stdout.write('    cho PostgreSQL san sang');
let san = false;
for (let i = 0; i < 60; i++) {
  if (thu('docker', ['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', 'ltv', '-d', 'ltvn_dev']).ok) {
    san = true;
    break;
  }
  process.stdout.write('.');
  execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)']);
}
console.log('');
if (!san) chet('PostgreSQL khong len. Xem nhat ky: docker compose logs postgres');
xong(`PostgreSQL san sang tren cong ${docEnv('POSTGRES_HOST_PORT') ?? 5432}`);

// ────────────────────────────────────────────────────────────────
buoc('4/6', 'Cai dependency va dung cac goi workspace');
chay('pnpm', ['install']);

/**
 * Dung `packages/*` TRUOC khi chay bat ky thu gi.
 *
 * `backend` import `@ltv/config`, va `package.json` cua goi do tro toi
 * `dist/index.js`. Tren mot ban vua clone thi `dist/` chua ton tai, nen
 * `pnpm dev:backend` do voi ERR_MODULE_NOT_FOUND — mot thong bao khong he
 * goi y rang thu con thieu la mot buoc bien dich.
 *
 * Cac lenh `dev:*` va `db:*` o `package.json` goc cung tu goi buoc nay, nen
 * chay tay chung van dung ma khong phai nho gi. O day chi de nguoi dung thay
 * no dang xay ra.
 */
chay('pnpm', ['build:packages']);

// ────────────────────────────────────────────────────────────────
buoc('5/6', 'Chay migration va du lieu khoi tao');
chay('pnpm', ['db:migrate']);
chay('pnpm', ['db:seed']);
chay('pnpm', ['db:status']);

// ────────────────────────────────────────────────────────────────
buoc('6/6', 'Xong');

console.log(`
    Mo MOT cua so lenh khac, vao dung thu muc du an roi chay:

        cd ${ROOT}
        pnpm dev:backend

    Roi quay lai cua so nay va chay:

        node scripts/smoke-auth.mjs

    Kich ban do tu tao tai khoan quan tri dau tien va kiem ca luong dang
    nhap — khong phai go curl bang tay.
`);
