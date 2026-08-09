#!/usr/bin/env node
/**
 * TIEM LOI CHO F4 — chung minh cac phep kiem cua khung site KHONG RONG.
 *
 *     DATABASE_URL=... node scripts/inject-f4.mjs
 *
 * Bo khung nam o `scripts/lib/inject-harness.mjs` (dung chung voi
 * `inject-f5-f8.mjs`); o day chi con DANH SACH phep tiem.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { taoBoTiem } from './lib/inject-harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL) {
  console.error('Can DATABASE_URL (PostgreSQL that) — cac phep kiem la test tich hop.\n');
  process.exit(1);
}
const { tiem, ketLuan } = taoBoTiem({ goc: ROOT });

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
  tim: "(p) => this.daos.products.list({ status: 'published' }, p),",
  thay: '(p) => this.daos.products.list({}, p),',
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
    'const banners: BannerView[] = banner\n' +
    '      .filter((b) => b.linkTargetId === null || daGiai.has(b.linkTargetId))\n' +
    '      .map((b, i) => ({',
  test: T,
  phepKiem: 'banner co lien ket CHET van GIU ANH',
});

// ── 6. logo khach hang can CA HAI dieu kien ──
tiem({
  ten: 'khach hang: is_public la bat buoc',
  tep: SITE,
  tim: 'const xs = await this.daos.customers.findPublicWithLogo(',
  thay:
    "const xs = (await this.daos.customers.list({ status: 'published' }, { page: 1, pageSize: 100 }))\n" +
    '      .data.filter((c) => c.logoId !== null) as never;\n' +
    '    void (',
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

process.exit(ketLuan('F4'));
