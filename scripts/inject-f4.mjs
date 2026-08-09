#!/usr/bin/env node
/**
 * TIEM LOI — chung minh cac phep kiem cua F4 KHONG RONG.
 *
 *     node scripts/inject-f4.mjs
 *
 * Mot phep kiem xanh khong noi len dieu gi ca cho den khi ta pha ma nguon va thay
 * no DO. Trong du an nay toi da viet vai phep kiem xanh vi khong co gi de do:
 * `sort=newest` khong bao gio do thu tu, trang landing chi kiem mot nhom trong nam,
 * `findHeadOffice` khong bao gio tao ban chua xuat ban.
 *
 * HAI LUAT ra tu mot lan toi tu lam hong phep do cua chinh minh:
 *
 *  1. MOI lan tiem co MOT tep sao luu RIENG. Lan truoc toi dung chung mot
 *     `/tmp/bak` cho cac lan tiem long nhau, va "hoan tac" de lai tep thieu mot
 *     dieu kien — roi toi do tiep tren ma nguon DA HONG trong nua gio.
 *  2. Sau khi hoan tac phai DOI CHIEU BAM. Khong doi chieu thi "da hoan tac" chi
 *     la mot y dinh.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DB = process.env.DATABASE_URL;
if (!DB) {
  console.error('Can DATABASE_URL (PostgreSQL that) — cac phep kiem la test tich hop.\n');
  process.exit(1);
}

const bam = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

let pass = 0;
const loi = [];

/**
 * Chay mot bai kiem va tra ve `true` neu no XANH.
 *
 * `--reporter=dot` de dau ra ngan; ma thoat la thu duy nhat duoc dung de quyet
 * dinh, khong phai viec doc van ban ket qua.
 */
function testXanh(file, ten) {
  try {
    execFileSync(
      join(ROOT, 'node_modules/.bin/vitest'),
      ['run', file, '-t', ten, '--reporter=dot'],
      { cwd: join(ROOT, 'backend'), env: { ...process.env, DATABASE_URL: DB }, stdio: 'pipe' },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * MOT lan tiem: sua mot chuoi trong mot tep, doi bai kiem phai DO, roi hoan tac.
 *
 * Ba dieu kien deu phai dat, va thieu cai nao thi ket luan khac nhau:
 *   - truoc khi tiem, bai kiem phai XANH   (neu khong: bai kiem dang do vi ly do khac)
 *   - sau khi tiem, bai kiem phai DO       (neu khong: bai kiem khong do gi ca)
 *   - sau khi hoan tac, bam phai khop      (neu khong: ma nguon dang hong)
 */
function tiem({ ten, tep, tim, thay, test, phepKiem }) {
  const p = join(ROOT, tep);
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
    if (!src.includes(tim)) {
      loi.push(`${ten}: khong tim thay doan can sua trong ${tep}`);
      process.stdout.write('   BO QUA (khong khop doan can sua)\n');
      return;
    }
    writeFileSync(p, src.replace(tim, thay));

    if (testXanh(test, phepKiem)) {
      loi.push(`${ten}: phep kiem VAN XANH sau khi pha ma — no khong do gi ca`);
      process.stdout.write('   KHONG DAT — phep kiem rong\n');
    } else {
      pass += 1;
      process.stdout.write('   dat (pha ma -> phep kiem do)\n');
    }
  } finally {
    copyFileSync(sao, p);
    unlinkSync(sao);
    const sau = bam(p);
    if (sau !== truoc) {
      loi.push(`${ten}: HOAN TAC THAT BAI — ${tep} da doi (${truoc.slice(0, 12)} -> ${sau.slice(0, 12)})`);
      process.stdout.write('   CANH BAO: hoan tac that bai\n');
    }
  }
}

const SITE = 'backend/src/services/site/service.ts';
const RESOLVER = 'backend/src/services/site/link-resolver.ts';
const T = 'test/site-service.integration.test.ts';

// ── 1. muc menu chet phai bi BO, khong duoc phat ra ngoai ──
tiem({
  ten: 'muc menu chet bi bo',
  tep: SITE,
  tim: "if (url === null && n.linkType !== 'none' && con.length === 0) continue;",
  thay: '// bi tiem: khong bo muc nao',
  test: T,
  phepKiem: 'muc tro toi noi dung KHONG TON TAI bi bo',
});

// ── 2. muc tro toi noi dung CHUA PUBLISH cung phai bi bo ──
tiem({
  ten: 'muc tro toi ban nhap bi bo',
  tep: RESOLVER,
  tim: "const r = await this.daos.products.list({ status: 'published' }, { page: 1, pageSize: 100 });",
  thay: 'const r = await this.daos.products.list({}, { page: 1, pageSize: 100 });',
  test: T,
  phepKiem: 'muc tro toi noi dung CHUA PUBLISH bi bo',
});

// ── 3. `javascript:` khong duoc thanh mot lien ket ──
tiem({
  ten: 'javascript: bi chan',
  tep: RESOLVER,
  tim: "if (u.startsWith('https://') || u.startsWith('/')) return u;",
  thay: 'return u;',
  test: T,
  phepKiem: 'bi bo, `https://` duoc giu',
});

// ── 4. cha chet co con song thi KHONG duoc bo ca nhanh ──
tiem({
  ten: 'cha chet co con song thi giu',
  tep: SITE,
  tim: "if (url === null && n.linkType !== 'none' && con.length === 0) continue;",
  thay: "if (url === null && n.linkType !== 'none') continue;",
  test: T,
  phepKiem: 'cha CHET nhung co con SONG thi giu ca hai',
});

// ── 5. banner lien ket chet phai GIU ANH ──
tiem({
  ten: 'banner chet giu anh',
  tep: SITE,
  tim: 'const banners: BannerView[] = banner.map((b, i) => ({',
  thay:
    'const banners: BannerView[] = banner\n'
    + '      .filter((b) => b.linkTargetId === null || daGiai.has(b.linkTargetId))\n'
    + '      .map((b, i) => ({',
  test: T,
  phepKiem: 'banner co lien ket CHET van GIU ANH',
});

// ── 6. logo khach hang can CA HAI dieu kien ──
tiem({
  ten: 'khach hang: is_public la bat buoc',
  tep: SITE,
  tim: 'const xs = await this.daos.customers.findPublicWithLogo(',
  thay:
    "const xs = (await this.daos.customers.list({ status: 'published' }, { page: 1, pageSize: 100 }))\n"
    + '      .data.filter((c) => c.logoId !== null) as never;\n'
    + '    void (',
  test: T,
  phepKiem: 'chi khach da publish VA duoc phep VA co logo',
});

// ── 7. van phong an khong duoc lo ra ──
tiem({
  ten: 'van phong an bi loai',
  tep: SITE,
  tim: "const xs = await this.daos.offices.list({ status: 'published' });",
  thay: 'const xs = await this.daos.offices.list({});',
  test: T,
  phepKiem: 'van phong an KHONG xuat hien',
});

// ── 8. cache phai THAT SU chan truy van ──
tiem({
  ten: 'cache that su duoc dung',
  tep: SITE,
  tim: 'return this.cache.lay(`home:${locale}`, () => this.homeThat(locale));',
  thay: 'return this.homeThat(locale);',
  test: T,
  phepKiem: 'lan hai khong chay them truy van nao',
});

// ── 9. khoa cache phai co locale ──
tiem({
  ten: 'khoa cache mang locale',
  tep: SITE,
  tim: 'return this.cache.lay(`home:${locale}`, () => this.homeThat(locale));',
  thay: "return this.cache.lay('home', () => this.homeThat(locale));",
  test: T,
  phepKiem: 'hai locale la hai khoa khac nhau',
});

// ── 10. `TranslationSupport` phai BO khoa `undefined` ──
tiem({
  ten: 'where: bo khoa undefined',
  tep: 'backend/src/dao/translation.support.ts',
  tim: '      .filter((e): e is [string, string | boolean | null] => e[1] !== undefined);',
  thay: '      .filter((e): e is [string, string | boolean | null] => true);',
  test: 'test/translation.integration.test.ts',
  phepKiem: 'khoa `undefined` duoc BO',
});

// ── 10b. `where` phai doi `null` thanh `IS NULL` ──
tiem({
  ten: 'where: null thanh IS NULL',
  tep: 'backend/src/dao/translation.support.ts',
  tim: `              v === null
                ? sql\`AND p.\${sql.ref(k)} IS NULL\`
                : sql\`AND p.\${sql.ref(k)} = \${v}\`,`,
  thay: '              sql`AND p.${sql.ref(k)} = ${v}`,',
  test: 'test/translation.integration.test.ts',
  phepKiem: 'nghia la NUT GOC',
});

// ── 11. tim kiem theo ten hang: cau DEM cung phai chay ──
tiem({
  ten: 'search theo hang dung EXISTS (khong dung alias JOIN)',
  tep: 'backend/src/dao/products/query.ts',
  tim: `      OR EXISTS (
        SELECT 1 FROM ltv.brands b
        WHERE b.id = p.brand_id AND b.deleted_at IS NULL AND b.name ILIKE \${needle}
      )`,
  thay: '      OR b.name ILIKE ${needle}',
  test: T,
  phepKiem: 'tim theo TEN HANG',
});

// ── 12. TTL phai duoc ap dung ──
tiem({
  ten: 'TtlCache: het han thi tinh lai',
  tep: 'backend/src/shared/cache.ts',
  tim: 'if (co && co.hetHanLuc > now) {',
  thay: 'if (co) {',
  test: 'test/cache.test.ts',
  phepKiem: 'qua TTL thi tinh lai',
});

// ── 13. khoi tren trang chu: `listEnabled` chu khong `listAll` ──
tiem({
  ten: 'khoi da tat khong len trang chu',
  tep: SITE,
  tim: 'this.daos.homepageSections.listEnabled(),',
  thay: 'this.daos.homepageSections.listAll(),',
  test: T,
  phepKiem: 'tat mot khoi',
});

/**
 * ── 14. TRAN SO KHOA: KHONG CO PHEP TIEM, va day la ket luan chu khong phai su bo sot
 *
 * Toi da thu HAI phep tiem cho `maxKeys` va ca hai deu KHONG DAT — bai kiem van
 * xanh sau khi pha ma:
 *
 *   a. bo vong don muc HET HAN
 *      -> khong the sai: TTL la MOT con so cho ca cache, nen thu tu het han trung
 *         thu tu chen, va vong `while` (bo tu dau `Map`) da bo dung cai het han som
 *         nhat. Cau toi viet trong `cache.ts` ("tran se bo mot khoa CON HIEU LUC")
 *         la SAI; da sua lai chu thich va xoa bai kiem rong do.
 *
 *   b. doi `while (size >= maxKeys)` thanh `while (size > 0)` (don sach cache)
 *      -> bai kiem "khoa moi nhat con lai" VAN xanh, vi `set()` chay SAU vong don:
 *         don sach roi ghi lai khoa moi thi khoa moi van co mat.
 *
 * Suy ra: bao dam "khoa moi nhat con lai" ben voi MOI bien the bo-tu-dau, nen mot
 * phep tiem chi pha duoc no bang cach xoa dung khoa vua ghi — mot loi khong ai viet
 * ra. Toi de trong o day thay vi bay ra mot phep tiem giao ve co kiem: mot dong
 * "dat" gia con te hon khong co dong nao.
 *
 * Bai kiem trong `cache.test.ts` van giu, vi no NEU RO hop dong (cache co tran, va
 * gia tri vua tinh phai lay lai duoc) — chi la no khong duoc dem bang phep tiem.
 */

console.log(`\n${loi.length === 0 ? 'TAT CA DEU DAT' : 'CO MUC KHONG DAT'} — ${pass} phep tiem dat, ${loi.length} van de\n`);
for (const e of loi) console.error(`  - ${e}`);
process.exit(loi.length === 0 ? 0 : 1);
