/**
 * BO KHUNG TIEM LOI — dung chung cho `inject-f4.mjs` va `inject-f5-f8.mjs`.
 *
 * Mot phep kiem xanh khong noi len dieu gi ca cho den khi ta pha ma nguon va thay
 * no DO. Trong du an nay toi da viet vai phep kiem xanh vi khong co gi de do:
 * `sort=newest` khong bao gio do thu tu, trang landing chi kiem mot nhom trong nam,
 * `findHeadOffice` khong bao gio tao ban chua xuat ban.
 *
 * BA LUAT, ca ba deu ra tu mot lan hong that:
 *
 *  1. MOI lan tiem co MOT tep sao luu RIENG. Lan o F3 toi dung chung mot `/tmp/bak`
 *     cho cac lan tiem long nhau, va "hoan tac" de lai tep thieu mot dieu kien —
 *     roi toi do tiep tren ma nguon DA HONG trong nua gio.
 *  2. Sau khi hoan tac phai DOI CHIEU BAM. Khong doi chieu thi "da hoan tac" chi la
 *     mot y dinh.
 *  3. So khop phai chiu duoc viec DINH DANG LAI. Dot don dep 2026-08-09 chay Prettier
 *     tren 146 tep; formatter ngat lai dong o ba cho ma kich ban tro toi bang chuoi
 *     nguyen van, ba phep tiem lang le chuyen sang "BO QUA", script VAN THOAT 0, va
 *     bao cao chep con so cu (14/14) sang. Tuc la: cong cu dung de chung minh phep
 *     kiem khong rong da tu hong, dung theo kieu no sinh ra de bat.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DAU = /[(){}[\],;:=><+\-*/&|!?.]/;

export const bam = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/**
 * Gom khoang trang, GIU dau vet vi tri goc.
 *
 * Tra ve mang `{ c, i }`: `c` la ky tu sau khi gom, `i` la vi tri cua no trong chuoi
 * goc. Nho `i` ma sau khi khop tren ban da gom, ta cat duoc dung doan NGUYEN VAN
 * trong tep — khong phai ghi lai tep bang ban da gom (lam vay se pha dinh dang cua
 * ca tep, va phep hoan tac bang bam se bao dong gia).
 *
 * Khoang trang canh mot DAU CAU bi bo han (`list( {` va `list({` la mot), con giua
 * hai ky tu chu thi thu lai mot dau cach (`const r` khong duoc dinh thanh `constr`
 * — de nhu vay se khop nham).
 */
function gom(s) {
  const ra = [];
  let cho = false;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (/\s/.test(c)) {
      cho = true;
      continue;
    }
    if (cho && ra.length > 0) {
      const truoc = ra[ra.length - 1].c;
      if (!DAU.test(truoc) && !DAU.test(c)) ra.push({ c: ' ', i });
    }
    cho = false;
    ra.push({ c, i });
  }
  return ra;
}

/**
 * Tim mot doan ma BAT KE dinh dang, tra ve doan NGUYEN VAN trong tep.
 *
 * Hai thu duoc bo qua, va chi hai thu do:
 *   - CACH XUONG DONG va thut le
 *   - DAU PHAY CUOI truoc mot dau dong `)` `}` `]`
 *
 * Doi ten bien hay doi logic van lam no khong khop — va do la dung: luc do phep tiem
 * phai duoc doc lai, khong duoc lang le khop vao mot doan khac.
 */
export function timDoan(src, mau) {
  const g = gom(src);
  const re = new RegExp(
    gom(mau)
      .map((x) => x.c)
      .join('')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\([)\]}])/g, ',?\\$1'),
    'g',
  );
  const daGom = g.map((x) => x.c).join('');
  const khop = [...daGom.matchAll(re)];

  /**
   * NHIEU HON MOT CHO KHOP -> TU CHOI, khong lang le lay cai dau tien.
   *
   * Phep bao ve nay ra doi tu hai lan hong that trong dot F5–F8:
   *
   *   a. Mau `FOR UPDATE SKIP LOCKED` khop CHU THICH o dong 189 truoc khi khop cau
   *      SQL that o dong 206. Phep tiem sua mot dong chu thich, khong doi hanh vi gi,
   *      va bao cao dung ra la "phep kiem RONG" — mot ket luan SAI ve mot bai kiem
   *      hoan toan tot.
   *   b. Mau `t.status = 'published'` khop `pt.status = 'published'` (chuoi con trong
   *      mot dinh danh khac) o mot truy van khong lien quan.
   *
   * Ca hai deu nguy hiem hon mot phep tiem that bai: chung cho ra ket luan sai VE BAI
   * KIEM, va nguoi doc se di sua mot bai kiem khong co van de gi.
   *
   * Nen mau khong duy nhat la LOI CUA PHEP TIEM: nguoi viet phai them ngu canh cho
   * den khi no chi con tro toi mot cho.
   */
  if (khop.length > 1) {
    return { loi: `mau khop ${khop.length} cho — them ngu canh de no chi tro toi MOT cho` };
  }
  const m = khop[0];
  if (m === undefined || m.index === undefined) return null;
  const dau = g[m.index];
  const cuoi = g[m.index + m[0].length - 1];
  if (dau === undefined || cuoi === undefined) return null;
  return src.slice(dau.i, cuoi.i + 1);
}

/**
 * Tao mot bo chay tiem cho mot kho ma.
 *
 * `goc` la thu muc goc kho; `cwd` la noi chay vitest (mac dinh `backend`), vi bo test
 * cua du an nay nam o do.
 */
export function taoBoTiem({ goc, cwd = 'backend', db = process.env.DATABASE_URL }) {
  let dat = 0;
  const loi = [];

  /**
   * Chay mot bai kiem va tra ve `true` neu no XANH.
   *
   * `--reporter=dot` de dau ra ngan; MA THOAT la thu duy nhat duoc dung de quyet
   * dinh, khong phai viec doc van ban ket qua.
   */
  function testXanh(file, ten) {
    try {
      execFileSync(
        process.execPath,
        [join(goc, 'node_modules/vitest/vitest.mjs'), 'run', file, '-t', ten, '--reporter=dot'],
        {
          cwd: join(goc, cwd),
          env: { ...process.env, ...(db ? { DATABASE_URL: db } : {}) },
          stdio: 'pipe',
        },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * MOT lan tiem: sua mot doan trong mot tep, doi bai kiem phai DO, roi hoan tac.
   *
   * Ba dieu kien deu phai dat, va thieu cai nao thi ket luan khac nhau:
   *   - truoc khi tiem, bai kiem phai XANH   (neu khong: bai kiem dang do vi ly do khac)
   *   - sau khi tiem, bai kiem phai DO       (neu khong: bai kiem khong do gi ca)
   *   - sau khi hoan tac, bam phai khop      (neu khong: ma nguon dang hong)
   */
  function tiem({ ten, tep, tim, thay, test, phepKiem }) {
    const p = join(goc, tep);
    const sao = `${p}.bak-${ten.replace(/[^\w]+/g, '-')}`;
    const truoc = bam(p);

    process.stdout.write(`\n── ${ten}\n`);

    if (!testXanh(test, phepKiem)) {
      loi.push(`${ten}: phep kiem DO TRUOC khi tiem — khong ket luan duoc gi`);
      process.stdout.write('   BO QUA (phep kiem do tu truoc)\n');
      return;
    }

    copyFileSync(p, sao);
    try {
      const src = readFileSync(p, 'utf8');
      const doan = timDoan(src, tim);
      if (doan === null) {
        loi.push(`${ten}: khong tim thay doan can sua trong ${tep}`);
        process.stdout.write('   BO QUA (khong khop doan can sua)\n');
        return;
      }
      if (typeof doan === 'object') {
        loi.push(`${ten}: ${doan.loi} (${tep})`);
        process.stdout.write('   BO QUA (mau khong duy nhat)\n');
        return;
      }
      writeFileSync(p, src.replace(doan, thay));

      if (testXanh(test, phepKiem)) {
        loi.push(`${ten}: phep kiem VAN XANH sau khi pha ma — no khong do gi ca`);
        process.stdout.write('   KHONG DAT — phep kiem rong\n');
      } else {
        dat += 1;
        process.stdout.write('   dat (pha ma -> phep kiem do)\n');
      }
    } finally {
      copyFileSync(sao, p);
      unlinkSync(sao);
      const sau = bam(p);
      if (sau !== truoc) {
        loi.push(
          `${ten}: HOAN TAC THAT BAI — ${tep} da doi (${truoc.slice(0, 12)} -> ${sau.slice(0, 12)})`,
        );
        process.stdout.write('   CANH BAO: hoan tac that bai\n');
      }
    }
  }

  /** In tong ket va tra ve ma thoat. Goi mot lan o cuoi kich ban. */
  function ketLuan(nhan) {
    const xong = loi.length === 0;
    process.stdout.write(
      `\n${xong ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${nhan}: ${dat} phep tiem dat, ${loi.length} van de\n\n`,
    );
    for (const e of loi) process.stderr.write(`  - ${e}\n`);
    if (loi.length > 0) process.stderr.write('\n');
    return xong ? 0 : 1;
  }

  return { tiem, ketLuan, testXanh };
}
