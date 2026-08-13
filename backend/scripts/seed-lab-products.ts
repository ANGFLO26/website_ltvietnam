/**
 * NAP DU LIEU SAN PHAM THAT — 17 dong may cua Herzog / ISL / Phase / PAC.
 *
 * Nguon: `doc/data/lab-products/du-lieu-chuan-hoa.json`, sinh ra boi
 * `doc/data/lab-products/tools/chuan_hoa.py` tu tai lieu goc cua hang.
 * Ke hoach: `doc/28_KE_HOACH_UI_PHAN_TANG_VA_DU_LIEU_THAT.md`.
 *
 * KHAC voi `seed-demo.ts`: day la du lieu THAT, dung duoc de bao gia. Vi vay:
 *   - `internal_code` bat dau bang `LAB-`, KHONG phai `DEMO-`
 *   - script XOA het san pham `DEMO-%` truoc khi nap (theo yeu cau nguoi dung)
 *
 * IDEMPOTENT: tra cuu theo slug truoc khi tao. Chay lai khong nhan doi.
 *
 * XUAT BAN: kiem dieu kien bang PublishService truoc. San pham nao chua du
 * (vd chua co anh dai dien) thi GIU O TRANG THAI NHAP va bao ro — khong im lang.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, mediaPaths, type AppConfig } from '@ltv/config';
import type { ContentBlock } from '@ltv/contracts';
import sharp from 'sharp';
import { createDaoRuntime } from '../src/dao/connection.js';
import type { DaoManager } from '../src/dao/dao-manager.js';
import { PublishServiceImpl } from '../src/services/shared/publish.service.js';

const log = (m: string): void => process.stdout.write(`${m}\n`);
const dem = { moi: 0, daCo: 0, boQua: 0 };

const GOC = fileURLToPath(new URL('../../', import.meta.url));
const FILE_DU_LIEU = join(GOC, 'doc', 'data', 'lab-products', 'du-lieu-chuan-hoa.json');

// ─────────────────────────── kieu du lieu vao ───────────────────────────
interface Chuan {
  readonly slug: string;
  readonly organization: string;
  readonly code: string;
}
interface LienKetChuan {
  readonly slug: string;
  readonly compliance_type: 'compliance' | 'correlation' | 'specification' | 'reference';
  readonly note: string | null;
}
interface ThongSo {
  readonly group_key: string | null;
  readonly label: string;
  readonly value: string;
  readonly unit: string | null;
}
interface SanPham {
  readonly file: string;
  readonly name: string;
  readonly model: string | null;
  readonly slug: string;
  readonly brand: string;
  readonly product_type: string;
  readonly short_description: string;
  readonly seo_title: string;
  readonly seo_description: string;
  readonly categories: readonly string[];
  readonly applications: readonly string[];
  readonly industries: readonly string[];
  readonly overview: readonly string[];
  readonly features: readonly string[];
  readonly applications_text: readonly string[];
  readonly principle: readonly string[];
  readonly sample_types: readonly string[];
  readonly operating_conditions: readonly string[];
  readonly accessories_options: readonly string[];
  readonly specifications: readonly ThongSo[];
  readonly standards: readonly LienKetChuan[];
  readonly image_path: string | null;
}
interface DuLieu {
  readonly brands_moi: readonly { slug: string; name: string; code: string; country: string }[];
  readonly categories_moi: readonly { slug: string; name: string; parent: string | null }[];
  readonly standards: readonly Chuan[];
  readonly products: readonly SanPham[];
}

// ─────────────────────────── khoi noi dung ───────────────────────────
const doan = (text: string): ContentBlock => ({
  id: randomUUID(),
  type: 'paragraph',
  spans: [{ text }],
});

const gachDau = (items: readonly string[]): ContentBlock => ({
  id: randomUUID(),
  type: 'list',
  style: 'bullet',
  items: items.map((t) => ({ spans: [{ text: t }] })),
});

/** Doan van -> mang `paragraph`. */
const vanXuoi = (xs: readonly string[]): ContentBlock[] => xs.map(doan);

/** Gach dau dong -> MOT khoi `list` (rong thi tra mang rong). */
const danhSach = (xs: readonly string[]): ContentBlock[] => (xs.length === 0 ? [] : [gachDau(xs)]);

// ─────────────────────────── xoa du lieu demo ───────────────────────────
async function xoaDemo(daos: DaoManager): Promise<void> {
  const tatCa = await daos.products.list({ includeDeleted: true }, { page: 1, pageSize: 100 });
  const demo = tatCa.data.filter((p) => p.internalCode?.startsWith('DEMO-'));
  for (const p of demo) {
    await daos.products.hardDelete(p.id);
  }
  log(`  xoa san pham demo   ${demo.length}`);
}

// ─────────────────────────── hang ───────────────────────────
async function napHang(daos: DaoManager, du: DuLieu): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  for (const h of du.brands_moi) {
    const co = await daos.brands.findBySlug(h.slug);
    if (co) {
      ra.set(h.slug, co.id);
      dem.daCo += 1;
      continue;
    }
    const b = await daos.brands.insert({
      brandType: 'manufacturer',
      name: h.name,
      slug: h.slug,
      code: h.code,
      countryCode: h.country,
    });
    await daos.brands.publish(b.id, new Date());
    ra.set(h.slug, b.id);
    dem.moi += 1;
  }
  // Hang da co san trong he thong
  for (const slug of ['pac', 'herzog', 'isl']) {
    const b = await daos.brands.findBySlug(slug);
    if (b) ra.set(slug, b.id);
  }
  log(`  hang                ${ra.size}`);
  return ra;
}

// ─────────────────────────── danh muc ───────────────────────────
async function napDanhMuc(daos: DaoManager, du: DuLieu): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  const tatCa = await daos.productCategories.list({}, { page: 1, pageSize: 100 });
  for (const c of tatCa.data) ra.set(c.slug, c.id);

  for (const c of du.categories_moi) {
    if (ra.has(c.slug)) {
      dem.daCo += 1;
      continue;
    }
    const parentId = c.parent === null ? null : (ra.get(c.parent) ?? null);
    const t = await daos.productCategories.insert({ parentId, name: c.name, slug: c.slug });
    await daos.productCategories.publish(t.id, new Date());
    ra.set(c.slug, t.id);
    dem.moi += 1;
  }
  log(`  danh muc            ${ra.size}`);
  return ra;
}

// ─────────────────────────── tieu chuan ───────────────────────────
async function napTieuChuan(daos: DaoManager, du: DuLieu): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  let moi = 0;
  for (const t of du.standards) {
    const co =
      (await daos.standards.findBySlug(t.slug)) ??
      (await daos.standards.findByCode(t.organization, t.code));
    if (co) {
      ra.set(t.slug, co.id);
      dem.daCo += 1;
      continue;
    }
    const s = await daos.standards.insert({
      organization: t.organization,
      code: t.code,
      slug: t.slug,
    });
    await daos.standards.publish(s.id, new Date());
    ra.set(t.slug, s.id);
    moi += 1;
    dem.moi += 1;
  }
  log(`  tieu chuan          ${ra.size} (moi ${moi})`);
  return ra;
}

// ─────────────────────────── anh ───────────────────────────
/**
 * Chep anh THAT tu kho tai lieu cua hang vao thu muc media, roi tao ban ghi.
 *
 * Anh goc rat lon (co file 3-4 MB, kich thuoc trên 3000px). Resize ve toi da
 * 1600px va nen lai: anh san pham tren web khong can hon, ma tai trang thi
 * nhanh hon han.
 */
async function napAnh(
  daos: DaoManager,
  cfg: AppConfig,
  duongDanGoc: string,
  ten: string,
  alt: string,
): Promise<string | null> {
  let goc: Buffer;
  try {
    goc = await readFile(duongDanGoc);
  } catch {
    log(`    ! khong doc duoc anh: ${duongDanGoc}`);
    return null;
  }

  const anh = await sharp(goc)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  const meta = await sharp(anh).metadata();
  const checksum = createHash('sha256').update(anh).digest('hex');

  const daCo = await daos.media.findByChecksum(checksum).catch(() => null);
  if (daCo) {
    dem.daCo += 1;
    return daCo.id;
  }

  const tenFile = `${ten}.jpg`;
  const thuMuc = mediaPaths(cfg).public;
  await mkdir(thuMuc, { recursive: true });
  const dich = join(thuMuc, tenFile);
  await sharp(anh).toFile(dich);

  const m = await daos.media.insert({
    fileName: tenFile,
    originalName: basename(duongDanGoc),
    storageClass: 'public',
    storagePath: `public/${tenFile}`,
    publicUrl: `/media/public/${tenFile}`,
    mimeType: 'image/jpeg',
    fileExtension: 'jpg',
    fileSize: anh.byteLength,
    width: meta.width ?? null,
    height: meta.height ?? null,
    checksum,
    title: alt,
    altText: alt,
  });
  dem.moi += 1;
  return m.id;
}

// ─────────────────────────── san pham ───────────────────────────
async function napSanPham(
  daos: DaoManager,
  cfg: AppConfig,
  du: DuLieu,
  hang: Map<string, string>,
  danhMuc: Map<string, string>,
  chuan: Map<string, string>,
  ungDung: Map<string, string>,
  nganh: Map<string, string>,
): Promise<{ id: string; slug: string; name: string }[]> {
  const daNap: { id: string; slug: string; name: string }[] = [];

  for (const [i, p] of du.products.entries()) {
    const daCo = await daos.products.findBySlug(p.slug);
    if (daCo) {
      dem.daCo += 1;
      daNap.push({ id: daCo.id, slug: p.slug, name: p.name });
      continue;
    }

    const brandId = hang.get(p.brand);
    if (!brandId) throw new Error(`${p.slug}: khong thay hang '${p.brand}'`);

    // Anh nap NGOAI transaction: ghi file la thao tac tren dia, khong roll back
    // duoc: de trong transaction thi khi transaction that bai se con file rac.
    const anhId =
      p.image_path === null
        ? null
        : await napAnh(
            daos,
            cfg,
            p.image_path,
            p.slug,
            `${p.name}${p.model === null ? '' : ` ${p.model}`}`,
          );

    await daos.transaction(async (tx) => {
      const sp = await tx.products.insert({
        brandId,
        name: p.name,
        slug: p.slug,
        model: p.model,
        internalCode: `LAB-${String(i + 1).padStart(3, '0')}`,
        shortDescription: p.short_description,
        seoTitle: p.seo_title,
        seoDescription: p.seo_description,
        productType: p.product_type as 'equipment' | 'accessory',
        featuredImageId: anhId,
        overview: vanXuoi(p.overview),
        features: danhSach(p.features),
        applicationsText: danhSach(p.applications_text),
        principle: vanXuoi(p.principle),
        sampleTypes: danhSach(p.sample_types),
        operatingConditions: danhSach(p.operating_conditions),
        accessoriesOptions: danhSach(p.accessories_options),
      });

      // ADR-010: phan tu DAU la danh muc CHINH.
      await tx.products.replaceCategories(
        sp.id,
        p.categories.map((slug, k) => {
          const categoryId = danhMuc.get(slug);
          if (!categoryId) throw new Error(`${p.slug}: khong thay danh muc '${slug}'`);
          return { categoryId, isPrimary: k === 0 };
        }),
      );

      await tx.products.replaceStandards(
        sp.id,
        p.standards.map((s, k) => {
          const standardId = chuan.get(s.slug);
          if (!standardId) throw new Error(`${p.slug}: khong thay tieu chuan '${s.slug}'`);
          return {
            standardId,
            complianceType: s.compliance_type,
            note: s.note,
            displayOrder: k,
          };
        }),
      );

      await tx.products.replaceApplications(
        sp.id,
        p.applications.map((slug, k) => {
          const applicationId = ungDung.get(slug);
          if (!applicationId) throw new Error(`${p.slug}: khong thay ung dung '${slug}'`);
          return { applicationId, isPrimary: k === 0 };
        }),
      );

      await tx.products.replaceIndustries(
        sp.id,
        p.industries.map((slug) => {
          const industryId = nganh.get(slug);
          if (!industryId) throw new Error(`${p.slug}: khong thay nganh '${slug}'`);
          return { industryId };
        }),
      );

      /**
       * Anh dai dien phai co MAT trong `product_media`, khong chi o
       * `featured_image_id`.
       *
       * `ProductGallery` cua frontend duyet mang `media` roi doi chieu voi
       * `featured_image_id` de chon anh hien dau tien. Chi dat khoa ngoai ma
       * khong them vao gallery thi mang `media` rong -> trang san pham hien
       * "Product image coming soon" du anh da nap thanh cong.
       */
      if (anhId !== null) {
        await tx.products.replaceMedia(sp.id, [
          { mediaId: anhId, mediaRole: 'gallery', displayOrder: 0 },
        ]);
      }

      await tx.products.replaceSpecifications(
        sp.id,
        p.specifications.map((s, k) => ({
          groupKey: s.group_key,
          label: s.label,
          value: s.value,
          unit: s.unit,
          displayOrder: k,
        })),
      );

      daNap.push({ id: sp.id, slug: p.slug, name: p.name });
    });
    dem.moi += 1;
  }

  log(`  san pham            ${daNap.length}`);
  return daNap;
}

// ─────────────────────────── xuat ban ───────────────────────────
/**
 * Xuat ban qua PublishService chu KHONG qua `products.publish()` truc tiep.
 *
 * `products.publish()` chi doi co trang thai; PublishService moi kiem du dieu
 * kien cua `05` PHAN IV (anh dai dien, danh muc chinh, mo ta ngan...). Dung
 * duong tat thi san pham thieu anh van len song va trang cong khai hien o trong.
 */
async function xuatBan(
  daos: DaoManager,
  ds: readonly { id: string; slug: string; name: string }[],
): Promise<void> {
  const publisher = new PublishServiceImpl(daos);
  let ok = 0;
  const chuaDu: { slug: string; ly_do: string[] }[] = [];

  for (const p of ds) {
    const kiem = await publisher.check({ entity: 'product', id: p.id });
    if (!kiem.ok) {
      chuaDu.push({ slug: p.slug, ly_do: kiem.blockers.map((b) => `${b.field}: ${b.message}`) });
      dem.boQua += 1;
      continue;
    }
    await publisher.publish({ entity: 'product', id: p.id });
    ok += 1;
  }

  log(`  xuat ban            ${ok}/${ds.length}`);
  if (chuaDu.length > 0) {
    log('');
    log('  CHUA XUAT BAN DUOC (giu o trang thai nhap):');
    for (const c of chuaDu) {
      log(`    - ${c.slug}`);
      for (const r of c.ly_do) log(`        ${r}`);
    }
  }
}

// ─────────────────────────── main ───────────────────────────
async function main(): Promise<void> {
  const cfg = loadConfig();
  const runtime = await createDaoRuntime(cfg);
  const daos = runtime.manager;

  const du = JSON.parse(await readFile(FILE_DU_LIEU, 'utf-8')) as DuLieu;
  log(`NAP DU LIEU SAN PHAM THAT — ${du.products.length} dong may`);
  log('');

  try {
    await xoaDemo(daos);

    const hang = await napHang(daos, du);
    const danhMuc = await napDanhMuc(daos, du);
    const chuan = await napTieuChuan(daos, du);

    const ungDung = new Map<string, string>();
    for (const a of (await daos.applications.list({}, { page: 1, pageSize: 100 })).data) {
      ungDung.set(a.slug, a.id);
    }
    const nganh = new Map<string, string>();
    for (const n of (await daos.industries.list({}, { page: 1, pageSize: 100 })).data) {
      nganh.set(n.slug, n.id);
    }

    const ds = await napSanPham(daos, cfg, du, hang, danhMuc, chuan, ungDung, nganh);
    await xuatBan(daos, ds);

    log('');
    log(`Tao moi ${dem.moi} · da co ${dem.daCo} · chua xuat ban ${dem.boQua}`);
  } finally {
    await runtime.close();
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
