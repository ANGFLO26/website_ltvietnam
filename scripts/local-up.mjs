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
import { connect, createServer } from 'node:net';
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

const vo = process.platform === 'win32';

/**
 * Boc dau nhay cho tham so khi phai chay qua `cmd.exe`.
 *
 * Tren Windows ta buoc phai dat `shell: true` vi `pnpm` va `docker` la cac tep
 * `.cmd`. Nhung khi do Node KHONG tu boc dau nhay — no chi noi cac tham so lai
 * bang dau cach roi dua cho `cmd.exe`. Tham so nao co san dau cach se bi tach
 * lam hai.
 *
 * Da mat mot vong lap vi dieu nay: `--format "{{.Names}} {{.Ports}}"` bi tach
 * ra, `docker ps` tra ve mot danh sach vo nghia, nen phep do cong tuong cong
 * 5432 dang trong trong khi no dang bi chiem.
 */
const boc = (a) => (vo && /[\s"^&|<>()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/** Chay lenh, in truc tiep ra man hinh. Nem loi neu that bai. */
function chay(cmd, args) {
  const r = spawnSync(cmd, args.map(boc), { stdio: 'inherit', shell: vo });
  if (r.status !== 0) chet(`Lenh that bai: ${cmd} ${args.join(' ')}`);
}

/** Chay lenh im lang, tra ve { ok, out }. Khong nem loi. */
function thu(cmd, args) {
  const r = spawnSync(cmd, args.map(boc), { encoding: 'utf8', shell: vo });
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

/** Tu MAY CHU co mo duoc ket noi TCP toi cong nay khong. */
function noiDuoc(port) {
  return new Promise((resolve) => {
    const s = connect({ port, host: '127.0.0.1' });
    const xong = (kq) => {
      s.destroy();
      resolve(kq);
    };
    s.setTimeout(2000);
    s.once('connect', () => xong(true));
    s.once('timeout', () => xong(false));
    s.once('error', () => xong(false));
  });
}

/** Doc/ghi mot khoa trong `.env` ma khong dung toi cac dong khac. */
function datEnv(khoa, giaTri) {
  const cu = readFileSync('.env', 'utf8');
  const mau = new RegExp(`^${khoa}=.*$`, 'm');
  const moi = mau.test(cu)
    ? cu.replace(mau, `${khoa}=${giaTri}`)
    : `${cu.trimEnd()}\n${khoa}=${giaTri}\n`;
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

  /**
   * Container CUA TA dang chay san thi cong bi chiem la binh thuong — nhung
   * chi khi no THAT SU dang gan mot cong tren may chu.
   *
   * Mot container van bao "healthy" ma khong gan cong nao ca: khi do
   * `pg_isready` chay BEN TRONG container van xanh, con ung dung tren may chu
   * thi khong sao noi toi. Lan truoc kich ban bao buoc 3 thanh cong chinh vi
   * chi hoi "container co chay khong" chu khong hoi "gan vao cong nao".
   * Nen hoi thang docker, roi dong bo `.env` theo cau tra loi.
   */
  const cong = thu('docker', ['port', 'ltv-postgres', '5432/tcp']);
  const daGan = cong.ok ? /:(\d+)\s*$/m.exec(cong.out) : null;
  if (daGan) {
    const p = Number(daGan[1]);
    xong(`container ltv-postgres da chay, gan tren cong ${p}`);
    if (p !== dangDung) {
      datEnv('POSTGRES_HOST_PORT', String(p));
      datEnv('DATABASE_URL', (docEnv('DATABASE_URL') ?? '').replace(/(@[^/:]+):\d+\//, `$1:${p}/`));
      xong(`dong bo .env theo cong dang chay: ${p}`);
    }
    return;
  }

  /**
   * Dò cổng bằng TCP thôi thì CHUA DU.
   *
   * Docker Desktop khi khoi dong lai se bat lai cac container dang chay luc
   * tat may. Trong vai giay do, cong chua co ai nghe — dò TCP bao "trong" —
   * nhung ngay sau do docker gan cong va `compose up` do voi "port is already
   * allocated". Da dinh dung bay nay mot lan.
   *
   * Nen hoi them chinh docker: cong nao dang duoc container khac gan.
   */
  const congDocker = () => {
    const r = thu('docker', ['ps', '--format', '{{.Names}} {{.Ports}}']);
    const set = new Set();
    if (!r.ok) return set;
    for (const dong of r.out.split('\n')) {
      if (dong.startsWith('ltv-postgres ')) continue; // container cua ta, xu ly o tren
      for (const m of dong.matchAll(/:(\d+)->/g)) set.add(Number(m[1]));
    }
    return set;
  };

  const docker = congDocker();
  const conTrong = async (p) => !docker.has(p) && (await congTrong(p));

  if (await conTrong(dangDung)) {
    xong(`cong ${dangDung} con trong`);
    return;
  }

  let moi = null;
  for (let p = dangDung + 1; p <= dangDung + 20; p++) {
    if (await conTrong(p)) {
      moi = p;
      break;
    }
  }
  if (moi === null) chet(`Cong ${dangDung} bi chiem va khong tim duoc cong trong nao gan do.`);

  loi(`Cong ${dangDung} da bi mot chuong trinh khac chiem`);
  if (docker.has(dangDung)) {
    const ai = thu('docker', ['ps', '--format', '{{.Names}} {{.Ports}}']);
    const ten = ai.out
      .split('\n')
      .find((d) => d.includes(`:${dangDung}->`))
      ?.split(' ')[0];
    loi(`(container docker "${ten ?? '?'}" dang gan cong nay)`);
  } else {
    loi('(thuong la mot ban PostgreSQL cai truc tiep tren may)');
  }
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

/** Cong tren MAY CHU ma docker THUC SU dang gan cho container cua ta. */
function congDaGan() {
  const r = thu('docker', ['port', 'ltv-postgres', '5432/tcp']);
  const m = r.ok ? /:(\d+)\s*$/m.exec(r.out) : null;
  return m ? Number(m[1]) : null;
}

/**
 * Dung cong ma DOCKER bao, chu khong phai cong ta mong doi.
 *
 * Da co lan container len va bao "healthy" nhung docker khong gan cong nao ra
 * may chu ca. Khi do moi thu ma ta doan deu sai: `.env` tro toi 5432, va tren
 * 5432 lai co MOT postgres KHAC dang tra loi — nen migration chay vao nham co
 * so du lieu va bao "password authentication failed". Mot loi rat kho lan ra.
 *
 * Hoi docker la cach duy nhat biet chac. Cong nao docker gan cho container thi
 * ket noi toi do chac chan vao dung container do.
 */
let congThat = congDaGan();
if (congThat === null) {
  loi('Container len nhung docker khong gan cong nao ra may chu — dung lai container.');
  chay('docker', ['compose', 'up', '-d', '--force-recreate', 'postgres']);
  congThat = congDaGan();
}
if (congThat === null) {
  chet(
    'Docker van khong gan duoc cong nao cho ltv-postgres.\n' +
      '    Xem chi tiet: docker port ltv-postgres 5432/tcp\n' +
      '                  docker inspect ltv-postgres --format "{{json .NetworkSettings.Ports}}"',
  );
}
if (congThat !== Number(docEnv('POSTGRES_HOST_PORT') ?? 5432)) {
  datEnv('POSTGRES_HOST_PORT', String(congThat));
  datEnv(
    'DATABASE_URL',
    (docEnv('DATABASE_URL') ?? '').replace(/(@[^/:]+):\d+\//, `$1:${congThat}/`),
  );
  xong(`dong bo .env theo cong docker da gan: ${congThat}`);
}

process.stdout.write('    cho PostgreSQL san sang');
let san = false;
for (let i = 0; i < 60; i++) {
  if (
    thu('docker', [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_isready',
      '-U',
      'ltv',
      '-d',
      'ltvn_dev',
    ]).ok
  ) {
    san = true;
    break;
  }
  process.stdout.write('.');
  execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)']);
}
console.log('');
if (!san) chet('PostgreSQL khong len. Xem nhat ky: docker compose logs postgres');

/**
 * `pg_isready` o tren chay BEN TRONG container, nen no xanh ke ca khi container
 * khong gan cong nao ra may chu. Dieu ma phan con lai cua du an thuc su can la
 * "tu may chu noi toi duoc" — nen kiem dung dieu do.
 */
if (!(await noiDuoc(congThat))) {
  chet(
    `Container len roi nhung may chu khong noi toi cong ${congThat} duoc.\n` +
      `    Xem docker da gan cong nao: docker port ltv-postgres 5432/tcp`,
  );
}
xong(`PostgreSQL san sang tren cong ${congThat}, may chu noi toi duoc`);

// Container mot-lan: `up -d` khong bao loi neu no chay xong roi chet.
const media = thu('docker', ['inspect', '-f', '{{.State.ExitCode}}', 'ltv-media-init']);
if (media.ok && media.out.trim() !== '0') {
  chet(`ltv-media-init that bai (ma thoat ${media.out.trim()}). Xem: docker logs ltv-media-init`);
}
xong('Thu muc media da dung');

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
