/**
 * DU LIEU DEMO — chay qua tang DAO, KHONG phai file SQL.
 *
 * Vi sao khong phai SQL nhu `seeds/001_bootstrap.sql`:
 *
 * `ancestor_ids` va `depth` cua nam bang cay KHONG do trigger duy tri — `TreeDao`
 * duy tri chung. Mot file SQL se phai tinh lai hai cot do bang tay, tuc la ban
 * sao thu hai cua mot thuat toan da co. Ban sao do se lech, va khi no lech thi
 * bo loc "mo rong nhanh con" (ADR-015) tra ve sai du lieu MA KHONG BAO LOI —
 * dung loai loi im lang ma du an nay da gap voi `createPool`.
 *
 * Di qua DAO thi con mot loi nua: duong GHI that duoc chay thu. Neu seed chay
 * duoc thi `insert` + `replaceCategories` + `publish` cung chay duoc.
 *
 * IDEMPOTENT: moi thuc the tra cuu theo slug truoc. Chay lai khong nhan doi.
 *
 * DU LIEU LA DEMO, va no phai NHAN DIEN DUOC nhu vay:
 *   - moi san pham co `internal_code` bat dau bang `DEMO-`
 *   - mot cau lenh xoa het:  DELETE FROM ltv.products WHERE internal_code LIKE 'DEMO-%'
 *
 * Ten hang, ten tieu chuan va ma may la SU THAT CONG KHAI (ASTM D86 la mot tieu
 * chuan that; PAC la mot hang that) — dung ten that lam bo loc co y nghia de
 * kiem. Con moi doan van mo ta deu la van ban thay the, khong phai thong so ky
 * thuat that. Khong duoc dung du lieu nay de bao gia.
 *
 * TEN MAY KHONG DICH — quy uoc xuyen du an. `OptiDist` la `OptiDist` o ca hai
 * ngon ngu; dich la lam nguoi doc khong tra cuu duoc thiet bi.
 */
import { randomUUID } from 'node:crypto';
import { loadConfig } from '@ltv/config';
import type { ContentBlock } from '@ltv/contracts';
import { createDaoRuntime } from '../src/dao/connection.js';
import type { DaoManager } from '../src/dao/dao-manager.js';

const log = (m: string): void => process.stdout.write(`${m}\n`);

/** Dem viec da lam de bao cao "moi" vs "da co" — chay lai phai ra 0 moi. */
const dem = { moi: 0, daCo: 0 };

const doan = (text: string): ContentBlock => ({
  id: randomUUID(),
  type: 'paragraph',
  spans: [{ text }],
});

const tieuDe = (text: string): ContentBlock => ({
  id: randomUUID(),
  type: 'heading',
  level: 2,
  text,
});

const gachDau = (items: string[]): ContentBlock => ({
  id: randomUUID(),
  type: 'list',
  style: 'bullet',
  items: items.map((t) => ({ spans: [{ text: t }] })),
});

const VAN_BAN_THAY_THE =
  'Day la van ban demo de kiem duong doc cua API. Noi dung ky thuat that se do ' +
  'bo phan ky thuat cung cap. KHONG dung doan nay de bao gia.';

// ══════════════════════════════════════════════════════════════
// HANG
// ══════════════════════════════════════════════════════════════
interface HangDemo {
  readonly slug: string;
  readonly name: string;
  readonly code: string;
  readonly country: string;
  readonly featured: boolean;
}

const HANG: readonly HangDemo[] = [
  { slug: 'pac', name: 'PAC', code: 'PAC', country: 'US', featured: true },
  { slug: 'herzog', name: 'Herzog', code: 'HZG', country: 'DE', featured: true },
  { slug: 'isl', name: 'ISL', code: 'ISL', country: 'FR', featured: false },
  { slug: 'anton-paar', name: 'Anton Paar', code: 'AP', country: 'AT', featured: true },
];

async function seedHang(daos: DaoManager): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  for (const h of HANG) {
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
      shortDescription: `${h.name} — ${VAN_BAN_THAY_THE}`,
    });
    await daos.brands.update(b.id, { isFeatured: h.featured });
    await daos.brands.publish(b.id, new Date());
    ra.set(h.slug, b.id);
    dem.moi += 1;
  }
  log(`  hang            ${ra.size}`);
  return ra;
}

// ══════════════════════════════════════════════════════════════
// DANH MUC SAN PHAM — BA CAP, de kiem viec mo rong nhanh con
// ══════════════════════════════════════════════════════════════
/**
 * Ba cap la CO Y, khong phai cho phong phu.
 *
 * `ADR-015` noi bo loc theo danh muc phai mo rong CA NHANH CON. Voi cay mot cap
 * thi "mo rong nhanh con" va "khop dung mot node" cho ket qua GIONG NHAU, nen
 * mot bai kiem tren cay mot cap se xanh du cai dat sai. Phai co it nhat ba cap
 * de phan biet duoc.
 */
interface NodeDemo {
  readonly slug: string;
  readonly name: string;
  readonly children?: readonly NodeDemo[];
  readonly featured?: boolean;
}

const DANH_MUC: readonly NodeDemo[] = [
  {
    slug: 'petroleum-testing',
    name: 'Petroleum Testing',
    featured: true,
    children: [
      {
        slug: 'distillation',
        name: 'Distillation',
        featured: true,
        children: [
          { slug: 'atmospheric-distillation', name: 'Atmospheric Distillation' },
          { slug: 'vacuum-distillation', name: 'Vacuum Distillation' },
        ],
      },
      {
        slug: 'flash-point',
        name: 'Flash Point',
        children: [
          { slug: 'closed-cup', name: 'Closed Cup' },
          { slug: 'open-cup', name: 'Open Cup' },
        ],
      },
      { slug: 'vapor-pressure', name: 'Vapor Pressure' },
    ],
  },
  {
    slug: 'physical-properties',
    name: 'Physical Properties',
    featured: true,
    children: [
      { slug: 'density-meters', name: 'Density Meters' },
      { slug: 'viscometers', name: 'Viscometers' },
    ],
  },
  { slug: 'sample-preparation', name: 'Sample Preparation' },
];

async function seedCay(
  daos: DaoManager,
  nhom: 'productCategories' | 'applications',
  nodes: readonly NodeDemo[],
  parentId: string | null = null,
  ra = new Map<string, string>(),
): Promise<Map<string, string>> {
  const dao = daos[nhom];
  for (const n of nodes) {
    const co = await dao.findBySlug(n.slug);
    let id: string;
    if (co) {
      id = co.id;
      dem.daCo += 1;
    } else {
      const t = await dao.insert({ parentId, name: n.name, slug: n.slug });
      if (n.featured) await dao.update(t.id, { isFeatured: true });
      await dao.publish(t.id, new Date());
      id = t.id;
      dem.moi += 1;
    }
    ra.set(n.slug, id);
    if (n.children) await seedCay(daos, nhom, n.children, id, ra);
  }
  return ra;
}

// ══════════════════════════════════════════════════════════════
// TIEU CHUAN — ten that, vi bo loc phai co nghia
// ══════════════════════════════════════════════════════════════
/**
 * `featured` co mat o day vi mot nhom RONG lam endpoint khong duoc kiem that.
 *
 * `GET /products/landing` tra ve nam nhom noi bat. Ban dau seed khong danh dau
 * tieu chuan nao, nen `featured_standards` luon la mang rong — nhanh do cua
 * `landing` chay ma khong co du lieu nao di qua, va no se "xanh" du chuyen doi
 * sai. Do la mot lo hong CUA DU LIEU DEMO, khong phai cua ma nguon, nhung hau
 * qua giong nhau: mot duong khong bao gio duoc thu.
 */
const TIEU_CHUAN = [
  { org: 'ASTM', code: 'D86', slug: 'astm-d86', name: 'Distillation of Petroleum Products', featured: true },
  { org: 'ASTM', code: 'D5191', slug: 'astm-d5191', name: 'Vapor Pressure (Mini Method)', featured: false },
  { org: 'ASTM', code: 'D93', slug: 'astm-d93', name: 'Flash Point by Pensky-Martens', featured: true },
  { org: 'ASTM', code: 'D4052', slug: 'astm-d4052', name: 'Density by Digital Density Meter', featured: false },
  { org: 'ISO', code: '3405', slug: 'iso-3405', name: 'Distillation Characteristics', featured: true },
  { org: 'ISO', code: '2719', slug: 'iso-2719', name: 'Flash Point — Pensky-Martens', featured: false },
  { org: 'IP', code: '123', slug: 'ip-123', name: 'Distillation of Petroleum Products', featured: false },
] as const;

async function seedTieuChuan(daos: DaoManager): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  for (const t of TIEU_CHUAN) {
    const co = await daos.standards.findBySlug(t.slug);
    if (co) {
      ra.set(t.slug, co.id);
      dem.daCo += 1;
      continue;
    }
    const s = await daos.standards.insert({
      organization: t.org,
      code: t.code,
      slug: t.slug,
      name: t.name,
    });
    if (t.featured) await daos.standards.update(s.id, { isFeatured: true });
    await daos.standards.publish(s.id, new Date());
    ra.set(t.slug, s.id);
    dem.moi += 1;
  }
  log(`  tieu chuan      ${ra.size}`);
  return ra;
}

// ══════════════════════════════════════════════════════════════
// UNG DUNG (cay) + NGANH (phang)
// ══════════════════════════════════════════════════════════════
const UNG_DUNG: readonly NodeDemo[] = [
  {
    slug: 'fuel-analysis',
    name: 'Fuel Analysis',
    featured: true,
    children: [
      { slug: 'gasoline', name: 'Gasoline' },
      { slug: 'diesel', name: 'Diesel' },
      { slug: 'jet-fuel', name: 'Jet Fuel' },
    ],
  },
  { slug: 'lubricant-analysis', name: 'Lubricant Analysis', featured: true },
  { slug: 'crude-oil-assay', name: 'Crude Oil Assay' },
];

const NGANH = [
  { slug: 'oil-and-gas', name: 'Oil & Gas', featured: true },
  { slug: 'petrochemical', name: 'Petrochemical', featured: true },
  { slug: 'quality-control-lab', name: 'Quality Control Laboratory', featured: false },
  { slug: 'research-and-education', name: 'Research & Education', featured: false },
] as const;

async function seedNganh(daos: DaoManager): Promise<Map<string, string>> {
  const ra = new Map<string, string>();
  for (const n of NGANH) {
    const co = await daos.industries.findBySlug(n.slug);
    if (co) {
      ra.set(n.slug, co.id);
      dem.daCo += 1;
      continue;
    }
    const i = await daos.industries.insert({ name: n.name, slug: n.slug });
    if (n.featured) await daos.industries.update(i.id, { isFeatured: true });
    await daos.industries.publish(i.id, new Date());
    ra.set(n.slug, i.id);
    dem.moi += 1;
  }
  log(`  nganh           ${ra.size}`);
  return ra;
}

// ══════════════════════════════════════════════════════════════
// SAN PHAM
// ══════════════════════════════════════════════════════════════
interface SanPhamDemo {
  readonly slug: string;
  readonly name: string;
  readonly model: string;
  readonly brand: string;
  /** Danh muc — PHAN TU DAU LA CHINH (ADR-010). */
  readonly categories: readonly string[];
  readonly standards: readonly string[];
  readonly applications: readonly string[];
  readonly industries: readonly string[];
  readonly featured?: boolean;
  readonly discontinued?: boolean;
}

/**
 * Tap san pham chon de BO LOC CO THE KIEM DUOC, khong phai de nhieu.
 *
 * Co du:
 *   - hai hang khac nhau cung mot tieu chuan (ASTM D86) -> kiem OR trong cung
 *     mot dimension
 *   - san pham thuoc nhanh con sau ba cap -> kiem mo rong nhanh con
 *   - mot san pham NGUNG KINH DOANH -> kiem ADR-011 (van tra ve, van index)
 *   - san pham khong co tieu chuan nao -> kiem bo loc khong lam mat hang
 */
const SAN_PHAM: readonly SanPhamDemo[] = [
  { slug: 'optidist-automatic-distillation-analyzer', name: 'OptiDist', model: 'OptiDist',
    brand: 'pac', categories: ['atmospheric-distillation', 'distillation'],
    standards: ['astm-d86', 'iso-3405', 'ip-123'], applications: ['gasoline', 'diesel'],
    industries: ['oil-and-gas', 'petrochemical'], featured: true },
  { slug: 'optipmd-vacuum-distillation-analyzer', name: 'OptiPMD', model: 'OptiPMD',
    brand: 'pac', categories: ['vacuum-distillation'], standards: ['astm-d5191'],
    applications: ['crude-oil-assay'], industries: ['oil-and-gas'] },
  { slug: 'herzog-hda-627-distillation-analyzer', name: 'HDA 627', model: 'HDA 627',
    brand: 'herzog', categories: ['atmospheric-distillation'],
    standards: ['astm-d86', 'iso-3405'], applications: ['diesel', 'jet-fuel'],
    industries: ['oil-and-gas'], featured: true },
  { slug: 'herzog-hfp-386-flash-point-tester', name: 'HFP 386', model: 'HFP 386',
    brand: 'herzog', categories: ['closed-cup', 'flash-point'],
    standards: ['astm-d93', 'iso-2719'], applications: ['diesel', 'lubricant-analysis'],
    industries: ['oil-and-gas', 'quality-control-lab'], featured: true },
  { slug: 'isl-fp-93-5g2-flash-point-tester', name: 'FP 93 5G2', model: 'FP 93 5G2',
    brand: 'isl', categories: ['closed-cup'], standards: ['astm-d93'],
    applications: ['diesel'], industries: ['quality-control-lab'] },
  { slug: 'isl-oc-open-cup-flash-point-tester', name: 'OC Series', model: 'OC',
    brand: 'isl', categories: ['open-cup'], standards: ['astm-d93'],
    applications: ['lubricant-analysis'], industries: ['quality-control-lab'] },
  { slug: 'anton-paar-dma-4500-m-density-meter', name: 'DMA 4500 M', model: 'DMA 4500 M',
    brand: 'anton-paar', categories: ['density-meters'], standards: ['astm-d4052'],
    applications: ['fuel-analysis'], industries: ['petrochemical', 'research-and-education'],
    featured: true },
  { slug: 'anton-paar-svm-3001-viscometer', name: 'SVM 3001', model: 'SVM 3001',
    brand: 'anton-paar', categories: ['viscometers'], standards: [],
    applications: ['lubricant-analysis'], industries: ['petrochemical'] },
  { slug: 'pac-mini-vap-vpsh-vapor-pressure-analyzer', name: 'MINIVAP VPSH', model: 'MINIVAP VPSH',
    brand: 'pac', categories: ['vapor-pressure'], standards: ['astm-d5191'],
    applications: ['gasoline'], industries: ['oil-and-gas'], featured: true },
  { slug: 'pac-alcor-jftot-thermal-stability', name: 'Alcor JFTOT', model: 'JFTOT 230 Mark IV',
    brand: 'pac', categories: ['petroleum-testing'], standards: [],
    applications: ['jet-fuel'], industries: ['oil-and-gas'] },
  { slug: 'herzog-sample-preparation-unit', name: 'HSP Unit', model: 'HSP 100',
    brand: 'herzog', categories: ['sample-preparation'], standards: [],
    applications: ['fuel-analysis'], industries: ['quality-control-lab'] },
  { slug: 'isl-legacy-distillation-analyzer', name: 'AD 86 5G', model: 'AD 86 5G',
    brand: 'isl', categories: ['atmospheric-distillation'], standards: ['astm-d86'],
    applications: ['diesel'], industries: ['oil-and-gas'], discontinued: true },
];

async function seedSanPham(
  daos: DaoManager,
  hang: Map<string, string>,
  danhMuc: Map<string, string>,
  tieuChuan: Map<string, string>,
  ungDung: Map<string, string>,
  nganh: Map<string, string>,
): Promise<void> {
  let n = 0;
  for (const [i, p] of SAN_PHAM.entries()) {
    if (await daos.products.findBySlug(p.slug)) {
      dem.daCo += 1;
      n += 1;
      continue;
    }
    const brandId = hang.get(p.brand);
    if (!brandId) throw new Error(`San pham ${p.slug}: khong thay hang ${p.brand}`);

    /**
     * MOT transaction cho san pham + moi quan he.
     *
     * `doc/06`: "Transaction bat buoc: tao/cap nhat/xuat ban san pham". Neu tach
     * ra thi mot san pham co the ton tai ma khong co danh muc chinh — trang thai
     * ma `PublishService` tu choi xuat ban, va khong ai hieu tai sao.
     */
    await daos.transaction(async (tx) => {
      const sp = await tx.products.insert({
        brandId,
        name: p.name,
        slug: p.slug,
        model: p.model,
        internalCode: `DEMO-${String(i + 1).padStart(3, '0')}`,
        shortDescription: `${p.name} (${p.model}) — ${VAN_BAN_THAY_THE}`,
        overview: [tieuDe('Overview'), doan(VAN_BAN_THAY_THE)],
        features: [
          tieuDe('Features'),
          gachDau([
            'Van ban demo — dac diem 1',
            'Van ban demo — dac diem 2',
            'Van ban demo — dac diem 3',
          ]),
        ],
        principle: [doan(VAN_BAN_THAY_THE)],
      });

      await tx.products.replaceCategories(
        sp.id,
        p.categories.map((slug, k) => {
          const categoryId = danhMuc.get(slug);
          if (!categoryId) throw new Error(`${p.slug}: khong thay danh muc ${slug}`);
          // Phan tu DAU tien la danh muc CHINH — ADR-010, dung mot cai.
          return { categoryId, isPrimary: k === 0 };
        }),
      );

      await tx.products.replaceStandards(
        sp.id,
        p.standards.map((slug, k) => {
          const standardId = tieuChuan.get(slug);
          if (!standardId) throw new Error(`${p.slug}: khong thay tieu chuan ${slug}`);
          return { standardId, complianceType: 'compliance' as const, displayOrder: k };
        }),
      );

      await tx.products.replaceApplications(
        sp.id,
        p.applications.map((slug, k) => {
          const applicationId = ungDung.get(slug);
          if (!applicationId) throw new Error(`${p.slug}: khong thay ung dung ${slug}`);
          return { applicationId, isPrimary: k === 0 };
        }),
      );

      await tx.products.replaceIndustries(
        sp.id,
        p.industries.map((slug) => {
          const industryId = nganh.get(slug);
          if (!industryId) throw new Error(`${p.slug}: khong thay nganh ${slug}`);
          return { industryId };
        }),
      );

      if (p.featured) await tx.products.update(sp.id, { isFeatured: true });
      await tx.products.publish(sp.id, new Date());

      /**
       * NGUNG KINH DOANH sau khi da publish — dung thu tu that.
       *
       * ADR-011: san pham ngung kinh doanh GIU nguyen URL va VAN duoc index.
       * Neu seed dat `discontinued` truoc khi publish thi khong kiem duoc dieu
       * do, vi mot san pham chua tung publish thi khong co URL nao ca.
       */
      if (p.discontinued) await tx.products.discontinue(sp.id, new Date());
    });
    dem.moi += 1;
    n += 1;
  }
  log(`  san pham        ${n}`);
}

// ══════════════════════════════════════════════════════════════
async function main(): Promise<void> {
  const cfg = loadConfig();
  const rt = await createDaoRuntime(cfg);
  const daos = rt.manager;

  try {
    log('\nDu lieu demo (idempotent — chay lai khong nhan doi)\n');
    const hang = await seedHang(daos);
    const danhMuc = await seedCay(daos, 'productCategories', DANH_MUC);
    log(`  danh muc        ${danhMuc.size} (3 cap)`);
    const tieuChuan = await seedTieuChuan(daos);
    const ungDung = await seedCay(daos, 'applications', UNG_DUNG);
    log(`  ung dung        ${ungDung.size}`);
    const nganh = await seedNganh(daos);
    await seedSanPham(daos, hang, danhMuc, tieuChuan, ungDung, nganh);

    /**
     * KIEM BAT BIEN CUA CAY ngay sau khi ghi.
     *
     * `findInconsistentNodes()` doi chieu `ancestor_ids`/`depth` voi `parent_id`
     * that. Neu seed lam lech hai cot do thi bo loc nhanh con tra ve sai du lieu
     * MA KHONG BAO LOI. Kiem o day de sai thi biet ngay, khong phai o F2 khi mot
     * bai kiem bo loc do vi mot ly do trong nhu khong lien quan.
     */
    for (const nhom of ['productCategories', 'applications'] as const) {
      const lech = await daos[nhom].findInconsistentNodes();
      if (lech.length > 0) {
        throw new Error(`Cay ${nhom} khong nhat quan sau khi seed: ${lech.join(', ')}`);
      }
    }
    log('\n  bat bien cay    OK (ancestor_ids + depth khop parent_id)');
    log(`\nXong — ${dem.moi} moi, ${dem.daCo} da co.\n`);
  } finally {
    await rt.close();
  }
}

main().catch((e: unknown) => {
  process.stderr.write(`Seed demo that bai: ${(e as Error).message}\n`);
  process.exit(1);
});
