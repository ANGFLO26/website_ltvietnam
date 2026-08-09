#!/usr/bin/env node
/**
 * TIEM LOI CHO F5–F8 — chung minh cac phep kiem cua bao gia, SEO, media va quan tri
 * KHONG RONG.
 *
 *     DATABASE_URL=... node scripts/inject-f5-f8.mjs
 *
 * VI SAO TEP NAY TON TAI. `doc/15` ra soat F1–F8, sua 10 loi (mot trong so do muc
 * NGHIEM TRONG: `hard=false` bien xoa mem thanh xoa cung) va ket luan "khong con loi
 * chuc nang". Moi ban sua deu co mot bai kiem hoi quy. Nhung mot bai kiem hoi quy chi
 * co gia tri neu no DO khi loi quay lai — va dieu do chua tung duoc do. Truoc tep nay,
 * toan bo 14 phep tiem cua kho ma deu thuoc F4.
 *
 * MOI PHEP TIEM O DAY LA MOT LOI DA TUNG XAY RA hoac mot bao dam ma neu mat thi hau
 * qua im lang. Khong tiem nhung thu chi la "tot neu co".
 *
 * Bo khung (sao luu rieng tung lan, doi chieu bam sau khi hoan tac, so khop chiu duoc
 * dinh dang lai) nam o `scripts/lib/inject-harness.mjs`.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { taoBoTiem } from './lib/inject-harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.DATABASE_URL) {
  console.error('Can DATABASE_URL (PostgreSQL that) — mot so phep kiem la test tich hop.\n');
  process.exit(1);
}
const { tiem, ketLuan } = taoBoTiem({ goc: ROOT });

const T_F8 = 'test/admin-f8.test.ts';
const T_INQ = 'src/services/inquiries/service.test.ts';
const T_OUTBOX = 'test/inquiry-outbox.integration.test.ts';
const T_SEO = 'src/services/seo/service.test.ts';
const T_SEO_DB = 'test/seo.integration.test.ts';
const T_MEDIA_DB = 'test/media-redirect.integration.test.ts';
const T_STORAGE = 'test/media-storage.test.ts';
const T_USER = 'test/user-service.integration.test.ts';

// ══════════════════════════ F5 — yeu cau bao gia ══════════════════════════

/**
 * IDEMPOTENCY. Nguoi dung bam Gui hai lan (hoac mang chap chon) khong duoc tao hai
 * yeu cau. Mat bao dam nay thi kinh doanh goi lai khach hang hai lan cho mot yeu cau,
 * va khong ai coi do la bug cua phan mem.
 */
tiem({
  ten: 'F5 idempotency: replay tra lai ban cu',
  tep: 'backend/src/services/inquiries/service.ts',
  tim: 'if (existing) return accepted(existing.id);',
  thay: '// bi tiem: bo qua ban ghi da co',
  test: T_INQ,
  phepKiem: 'replay tra cung request_id',
});

/**
 * CAPTCHA sai thi KHONG duoc cham database.
 *
 * Neu ghi truoc roi kiem sau thi mot bot chi can gui rac lien tuc de lam day bang
 * `inquiries` — va moi ban ghi rac deu sinh mot job gui mail.
 */
tiem({
  ten: 'F5 CAPTCHA sai thi khong ghi gi',
  tep: 'backend/src/services/inquiries/service.ts',
  tim: "throw new DomainError('CAPTCHA_INVALID', 'CAPTCHA khong hop le hoac da het han');",
  thay: '// bi tiem: bo qua CAPTCHA',
  test: T_INQ,
  phepKiem: 'CAPTCHA sai thi khong ghi database',
});

/**
 * `toView` KHONG duoc tra khoa idempotency, IP hay diem CAPTCHA.
 *
 * Ba truong nay la du lieu CHONG LAM DUNG, khong phai du lieu nghiep vu. Lo khoa
 * idempotency ra man hinh quan tri nghia la bat ky ai doc duoc man hinh do cung gia
 * mao duoc mot replay; lo IP la du lieu ca nhan khong ai can de xu ly bao gia.
 */
tiem({
  ten: 'F5 admin detail khong lo du lieu chong spam',
  tep: 'backend/src/services/inquiries/service.ts',
  tim: 'function toView(row: Inquiry): InquiryView {\n  return {\n    id: row.id,',
  thay:
    'function toView(row: Inquiry): InquiryView {\n' +
    '  return {\n' +
    '    ...({ idempotency_key: (row as { idempotencyKey?: string }).idempotencyKey } as object),\n' +
    '    id: row.id,',
  test: T_INQ,
  phepKiem: 'admin detail khong tiet lo',
});

/**
 * `SKIP LOCKED` — hai worker khong duoc lay trung job.
 *
 * Bo `SKIP LOCKED` thi PostgreSQL khong bao loi: worker thu hai DUNG CHO worker thu
 * nhat nha khoa. Khong ai thay loi, chi thay hang doi cham dan khi them worker — dung
 * nguoc voi ly do them worker.
 */
tiem({
  ten: 'F5 outbox: SKIP LOCKED giu hai worker khong dam nhau',
  tep: 'backend/src/dao/inquiries/dao.ts',
  tim: 'ORDER BY next_attempt_at, created_at\n        FOR UPDATE SKIP LOCKED',
  thay: 'ORDER BY next_attempt_at, created_at\n        FOR UPDATE',
  test: T_OUTBOX,
  phepKiem: 'SKIP LOCKED — worker khong DUNG CHO nhau',
});

/**
 * Het luot thu KHONG duoc xoa yeu cau.
 *
 * SMTP hong la su co ha tang; yeu cau bao gia la du lieu kinh doanh. Xoa yeu cau khi
 * khong gui duoc mail nghia la mat mot khach hang vi mot loi cau hinh mail.
 */
tiem({
  ten: 'F5 het luot thu: giu yeu cau, chi danh dau failed',
  tep: 'backend/src/dao/inquiries/dao.ts',
  tim: "status          = ${nextAttemptAt === null ? 'failed' : 'pending'},",
  thay: "status          = 'pending',",
  test: T_OUTBOX,
  phepKiem: 'het luot thu',
});

// ══════════════════════════ F6 — SEO ══════════════════════════

/**
 * ADR-011 §2b — landing PHAN LOAI khong co mo ta thi KHONG vao sitemap.
 *
 * Quy tac co dieu kien, va sai thi Google khong bao gi ca: no am tham ha do tin cay
 * cua ca cum trang vi sitemap day URL mong.
 */
tiem({
  ten: 'F6 ADR-011 §2b: landing mong khong vao sitemap',
  tep: 'backend/src/services/seo/service.ts',
  tim: 'if (!source.hasEditorialContent) return null;',
  thay: '// bi tiem: dua ca landing mong vao sitemap',
  test: T_SEO,
  phepKiem: 'chi dua landing co noi dung',
});

/**
 * URL da co redirect KHONG duoc nam trong sitemap.
 *
 * Mot sitemap tro vao chinh nguon cua mot 301 la bao Google "day la trang chuan" roi
 * lap tuc day no di cho khac. Google ghi nhan la loi chat luong sitemap.
 *
 * TIEM VAO CO CHE, KHONG VAO MOT TRONG HAI BO LOC — va day la mot ket luan do duoc.
 * `sitemap()` loai URL redirect o HAI cho:
 *
 *   1. `continue` trong vong lap  -> chan URL DONG truoc khi vao `byPath`
 *   2. `.filter()` sau vong lap   -> chan ca URL TINH (`/products`, `/news`...)
 *
 * Toi thu tiem tung cai mot: BO CAI NAO thi bai kiem cung VAN XANH, vi cai con lai
 * bat duoc. Tuc chung thua so voi nhau o truong hop dang duoc kiem, va (2) manh hon
 * han (1) — no phu ca URL tinh, thu ma vong lap khong cham toi.
 *
 * Nen phep tiem nham vao NGUON: neu danh sach redirect khong duoc tra cuu, ca hai bo
 * loc deu vo hieu. Do la cach dien dat dung bao dam ("sitemap khong chua URL da co
 * redirect") thay vi dien dat mot dong ma cu the.
 */
tiem({
  ten: 'F6 sitemap khong tro vao nguon redirect',
  tep: 'backend/src/services/seo/service.ts',
  tim: 'const redirected = new Set(redirectSources.map((x) => normalizePath(x).toLowerCase()));',
  thay: 'const redirected = new Set<string>();\n    void redirectSources;',
  test: T_SEO,
  phepKiem: 'loai filter va URL redirect',
});

/**
 * `site_indexable=false` phai chan TOAN BO.
 *
 * Day la cong tac dung khi chay ban dan (staging) hoac khi noi dung chua san sang. Mat
 * no nghia la mot ban chua xong bi index, va go mot trang khoi Google mat hang tuan.
 */
tiem({
  ten: 'F6 site_indexable=false chan toan bo',
  tep: 'backend/src/services/seo/service.ts',
  tim: "if (!indexable) return 'User-agent: *\\nDisallow: /\\n';",
  thay: '// bi tiem: bo qua co site_indexable',
  test: T_SEO,
  phepKiem: 'site_indexable=false chan toan bo',
});

/**
 * Sitemap chi chua noi dung DA PUBLISH — kiem tren PostgreSQL that.
 *
 * Phep tiem tren la unit test voi DAO gia; phep nay danh vao cau SQL that, vi dieu
 * kien `published` nam trong SQL chu khong trong TypeScript.
 */
tiem({
  ten: 'F6 sitemap chi lay noi dung da publish (SQL that)',
  tep: 'backend/src/dao/seo/dao.ts',
  tim: "WHERE ${locale} = 'en' AND p.status = 'published' AND p.deleted_at IS NULL",
  thay: "WHERE ${locale} = 'en' AND p.deleted_at IS NULL",
  test: T_SEO_DB,
  phepKiem: 'DAO chi tra published',
});

// ══════════════════════════ F7 — media ══════════════════════════

/**
 * MAGIC BYTES phai khop MIME khai bao.
 *
 * Mot tep PHP doi duoi `.jpg` va khai bao `image/jpeg` se qua duoc neu chi tin phan
 * mo rong. Day la duong tai ma len may chu — loai lo hong nghiem trong nhat cua mot
 * chuc nang upload.
 */
tiem({
  ten: 'F7 MIME khai bao phai khop magic bytes',
  tep: 'backend/src/services/media/storage.ts',
  tim: 'if (!mimeType || !sameClaimedMime(file.claimedMimeType, mimeType)) {',
  thay: 'if (!mimeType) {',
  test: T_STORAGE,
  phepKiem: 'tu choi MIME khai bao khac magic bytes',
});

/**
 * `detectMime` la DANH SACH TRANG, khong phai danh sach den.
 *
 * Tra ve mot MIME mac dinh khi khong nhan dang duoc nghia la SVG (co the chua script),
 * HTML, PHP... deu duoc nhan. Danh sach den luon thieu mot muc.
 */
tiem({
  ten: 'F7 dinh dang khong nhan dang duoc thi TU CHOI',
  tep: 'backend/src/services/media/storage.ts',
  tim: '  return null;\n}\n\nfunction sameClaimedMime',
  thay: "  return 'image/jpeg';\n}\n\nfunction sameClaimedMime",
  test: T_STORAGE,
  phepKiem: 'chan PHP doi duoi jpg, SVG va ten co path traversal',
});

/**
 * PDF protected KHONG duoc phuc vu qua `/media/*`.
 *
 * DUNG BAI KIEM TICH HOP, KHONG dung `media-service.test.ts`. Bai kiem service co ten
 * "protected PDF khong qua /media" nhung no truyen mot DAO GIA
 * (`findActiveByPublicAssetPath: vi.fn(...)`), nen no do tang service chu khong do
 * dieu kien SQL. Khi toi bo `storage_class = 'public'` khoi cau lenh that, bo test VAN
 * XANH. Da them `test/media-redirect.integration.test.ts` -> "LO HONG F7" chay tren
 * PostgreSQL that; phep tiem nay do cai do.
 *
 * `storage_class` la ranh gioi giua "ai cung xem duoc" va "phai qua cong tai lieu".
 * Bo dieu kien nay thi moi tai lieu ky thuat noi bo tro thanh cong khai — va URL do
 * doan duoc, khong can dang nhap.
 */
tiem({
  ten: 'F7 /media chi phuc vu tep public',
  tep: 'backend/src/dao/media/dao.ts',
  tim: ".where('storage_class', '=', 'public')\n      .where('deleted_at', 'is', null)",
  thay: ".where('deleted_at', 'is', null)",
  test: T_MEDIA_DB,
  phepKiem: 'LO HONG F7',
});

/** Xoa mem cung phai chan — cung mot cau SQL, mot dieu kien khac. */
tiem({
  ten: 'F7 /media khong phuc vu tep da xoa mem',
  tep: 'backend/src/dao/media/dao.ts',
  tim: ".where('storage_class', '=', 'public')\n      .where('deleted_at', 'is', null)",
  thay: ".where('storage_class', '=', 'public')",
  test: T_MEDIA_DB,
  phepKiem: 'LO HONG F7',
});

// ══════════════════════════ F8 — quan tri ══════════════════════════

/**
 * `hard=false` KHONG duoc thanh `true` — loi muc NGHIEM TRONG cua `doc/15`.
 *
 * Query string la van ban, va trong JavaScript moi chuoi khong rong deu truthy, ke ca
 * `"false"`. Voi `z.coerce.boolean()` thi `?hard=false` — cach mot frontend can than
 * viet ra de noi "dung xoa cung" — tro thanh dung yeu cau xoa cung.
 */
tiem({
  ten: 'F8 hard=false KHONG duoc thanh true',
  tep: 'backend/src/api/dto/parse.ts',
  tim: "if (value === false || value === 'false' || value === '0') return false;",
  thay: '// bi tiem: bo nhanh false',
  test: T_F8,
  phepKiem: 'parses false query booleans as false',
});

/**
 * PATCH ban dich chi doi `status` KHONG duoc dung toi noi dung.
 *
 * Man hinh quan tri co nut "Xuat ban" gui mot PATCH chi co `status`. Neu duong ghi van
 * chay thi cac truong khong gui bi coi la rong — va bam Xuat ban se XOA TRANG bai viet
 * dung luc no duoc cong bo.
 */
tiem({
  ten: 'F8 PATCH chi doi status khong ghi noi dung',
  tep: 'backend/src/services/admin-content/service.ts',
  tim: 'if (Object.keys(changes).length > 0 || !current) {',
  thay: 'if (true) {',
  test: T_F8,
  phepKiem: 'accepts a status-only translation PATCH',
});

/**
 * PATCH tung phan phai GIU truong khong gui.
 *
 * Cung ho voi tren nhung o tang khac: neu `mergeTranslation` khong lay lai gia tri cu
 * thi sua mot truong se xoa muoi truong con lai.
 */
tiem({
  ten: 'F8 PATCH tung phan giu truong khong gui',
  tep: 'backend/src/services/admin-content/service.ts',
  tim: 'else if (current && Object.hasOwn(current, field)) merged[field] = current[field];',
  thay: '// bi tiem: khong giu gia tri cu',
  test: T_F8,
  phepKiem: 'preserves omitted translation fields',
});

/**
 * ADR-008: truong mang CO MAT thi thay ca tap, VANG thi giu nguyen.
 *
 * Doi thanh "luon thay" nghia la mot PATCH chi sua ten san pham se XOA SACH danh muc,
 * tieu chuan, ung dung va anh cua no. Duong ghi im lang, va chi phat hien khi ai do mo
 * lai trang san pham.
 */
tiem({
  ten: 'F8 ADR-008: mang vang thi giu nguyen tap quan he',
  tep: 'backend/src/services/admin-products/service.ts',
  tim: 'if (input.standards !== undefined) await tx.products.replaceStandards(id, input.standards);',
  thay: 'await tx.products.replaceStandards(id, input.standards ?? []);',
  test: T_F8,
  phepKiem: 'PATCH product only replaces relation sets that are present',
});

/**
 * `include_deleted` phai duoc TRUYEN XUONG, khong duoc nuot.
 *
 * Nuot no thi man hinh "thung rac" cua quan tri luon trong, va noi dung da xoa mem
 * khong bao gio khoi phuc duoc qua giao dien.
 */
tiem({
  ten: 'F8 include_deleted duoc truyen xuong DAO',
  tep: 'backend/src/services/admin-content/service.ts',
  tim: 'let rows = await this.daos.pages.listAll(filter.includeDeleted === true);',
  thay: 'let rows = await this.daos.pages.listAll(false);',
  test: T_F8,
  phepKiem: 'honors include_deleted',
});

/**
 * AN mot khach hang KHONG duoc thu hoi co DONG Y dung logo.
 *
 * `status` la trang thai bien tap, `is_public` la khach da ky giay cho phep neu ten.
 * Tron hai thu nay lai thi mot lan an tam de sua noi dung se xoa mat bang chung dong
 * y — va lan hien lai se dung logo khi chua duoc phep.
 */
tiem({
  ten: 'F8 an khach hang khong thu hoi co dong y',
  tep: 'backend/src/services/admin-site/service.ts',
  tim: 'return this.daos.customers.unpublish(id);',
  thay: 'return { ...(await this.daos.customers.unpublish(id)), isPublic: false };',
  test: T_F8,
  phepKiem: 'hides a customer editorially',
});

/**
 * Redirect KHONG duoc che mot duong dan dang song.
 *
 * Tao redirect `/products/optidist` -> cho khac se lam trang san pham that bien mat,
 * va no bien mat o TANG MIDDLEWARE nen khong loi nao duoc ghi. Hai lop: route he thong
 * (tinh) va noi dung da publish (dong) — day la lop thu hai.
 */
tiem({
  ten: 'F8 redirect khong che noi dung dang publish',
  tep: 'backend/src/services/admin-redirects/service.ts',
  tim: 'if (await this.slugs.isLivePath(source)) {',
  thay: 'if (false) {',
  test: T_F8,
  phepKiem: 'rejects redirect sources that shadow published dynamic content',
});

/** Lop thu nhat: route he thong tinh (`/products`, `/news`...). */
tiem({
  ten: 'F8 redirect khong che route he thong',
  tep: 'backend/src/services/admin-redirects/service.ts',
  tim: 'if (isReservedPath(source, this.reserved)) {',
  thay: 'if (false) {',
  test: T_F8,
  phepKiem: 'rejects redirect sources that would shadow a live system route',
});

/**
 * Doi dich redirect phai SUA TAI CHO, khong duoc xoa roi tao lai.
 *
 * Xoa roi tao lai lam mat `id`, `hit_count` va lich su thoi gian. `hit_count` la thu
 * duy nhat noi duoc mot redirect con dang duoc dung hay da chet — mat no thi khong bao
 * gio don dep duoc bang redirect.
 */
tiem({
  ten: 'F8 doi dich redirect giu nguyen ban ghi',
  tep: 'backend/src/services/admin-redirects/service.ts',
  tim: 'if (input.targetPath !== undefined) {',
  thay: 'if (false) {',
  test: T_F8,
  phepKiem: 'retargets a redirect without deleting the row',
});

/**
 * `********` KHONG duoc ghi de mat khau SMTP that.
 *
 * Man hinh quan tri hien dau sao o o mat khau. Nguoi dung sua mot o khac roi bam Luu
 * se gui ca form — ke ca chuoi dau sao. Ghi no vao nghia la mat khau SMTP that bi thay
 * bang tam ky tu sao, va mail ngung gui MA KHONG AI DOI GI CA.
 */
tiem({
  ten: 'F8 dau sao khong ghi de mat khau SMTP',
  tep: 'backend/src/services/settings/service.ts',
  tim: 'if (setting.isEncrypted && value === MASKED_VALUE) continue;',
  thay: '// bi tiem: ghi ca gia tri da che',
  test: T_F8,
  phepKiem: 'settings group update never writes the masked SMTP password back',
});

/**
 * Khong duoc vo hieu hoa quan tri vien HOAT DONG CUOI CUNG.
 *
 * Mat dieu kien nay thi khong con ai dang nhap duoc vao trang quan tri, va — theo
 * chuoi khai thac da ghi o `doc/13` muc 15 — endpoint `bootstrap` cong khai co the mo
 * ra tro lai.
 *
 * GHI RO PHAN KHONG DO DUOC: `lockActiveAdmins()` (SELECT ... FOR UPDATE) chong hai
 * yeu cau DONG THOI cung vo hieu hoa hai tai khoan cuoi. Bo dong khoa do di thi bo test
 * VAN XANH, vi test chay mot luong. Do la mot khoang trong that, khong phai mot phep
 * tiem bi bo quen — kiem no can hai ket noi chay song song va mot diem dong bo.
 */
tiem({
  ten: 'F8 khong vo hieu hoa quan tri hoat dong cuoi cung',
  tep: 'backend/src/services/users/service.ts',
  tim: "if (user.status === 'active' && (await tx.users.countActiveAdmins()) <= 1) {",
  thay: "if (user.status === 'active' && (await tx.users.countActiveAdmins()) <= 0) {",
  test: T_USER,
  phepKiem: 'khong vo hieu hoa duoc quan tri hoat dong cuoi cung',
});

process.exit(ketLuan('F5–F8'));
