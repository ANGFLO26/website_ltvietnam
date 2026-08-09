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
// NOI DUNG CO BAN DICH (F3)
// ══════════════════════════════════════════════════════════════
/**
 * Vi sao seed nay phai co: mot NHOM RONG lam endpoint khong duoc kiem THAT.
 *
 * Sau F3, `GET /services`, `/projects`, `/posts`, `/documents` deu tra mang rong
 * tren HTTP that vi seed khong co du lieu nao cho chung. Bo test tich hop co du
 * lieu rieng nen no xanh, nhung `smoke-api.mjs` — thu chay tren may chu that —
 * khong kiem duoc gi. Do la cung mot lo hong voi `featured_standards` rong o F2:
 * mot duong khong bao gio duoc thu.
 *
 * Bo du lieu duoi day co y chua CA BON to hop trang thai cua ADR-004, de phep
 * thu tren HTTP that co the chung minh ban nhap KHONG lo ra:
 *
 *   cha publish + dich publish  ->  hien
 *   cha publish + dich nhap     ->  vang
 *   cha nhap    + dich publish  ->  vang
 *   mot bai co CA HAI locale    ->  hreflang co hai muc
 */
const DICH_VU: readonly {
  slug: string; name: string; type: string; children?: readonly { slug: string; name: string }[];
}[] = [
  {
    slug: 'installation-commissioning',
    name: 'Installation & Commissioning',
    type: 'installation',
    children: [
      { slug: 'site-preparation', name: 'Site Preparation' },
      { slug: 'startup-training', name: 'Start-up & Training' },
    ],
  },
  { slug: 'preventive-maintenance', name: 'Preventive Maintenance', type: 'maintenance' },
  { slug: 'calibration-service', name: 'Calibration Service', type: 'calibration' },
];

async function seedDichVu(
  daos: DaoManager,
  nganh: Map<string, string>,
): Promise<Map<string, string>> {
  const ra = new Map<string, string>();

  const themMot = async (
    slug: string, name: string, type: string | null, parentId: string | null,
  ): Promise<string> => {
    /**
     * Tim theo (locale, slug) cua BAN DICH — khong theo bang cha.
     *
     * Bang `services` khong co slug; slug nam tren hang dich. Nen phep kiem
     * idempotent phai di qua `findBySlug(locale, slug)`, khong phai `findBySlug(slug)`.
     */
    const co = await daos.services.findBySlug('en', slug);
    if (co) {
      dem.daCo += 1;
      return co.service.id;
    }
    const sv = await daos.services.insert({
      ...(parentId !== null ? { parentId } : {}),
      ...(type !== null ? { serviceType: type } : {}),
    });
    for (const [locale, ten] of [['en', name], ['vi', name]] as const) {
      await daos.services.upsertTranslation(sv.id, {
        locale,
        name: ten,
        slug: locale === 'en' ? slug : `${slug}-vi`,
        shortDescription: `${ten} — ${VAN_BAN_THAY_THE}`,
        overview: [tieuDe('Overview'), doan(VAN_BAN_THAY_THE)],
        scopeOfWork: [gachDau(['Van ban demo 1', 'Van ban demo 2'])],
      });
      await daos.services.publishTranslation(sv.id, locale, new Date());
    }
    await daos.services.publish(sv.id, new Date());
    dem.moi += 1;
    return sv.id;
  };

  for (const d of DICH_VU) {
    const id = await themMot(d.slug, d.name, d.type, null);
    ra.set(d.slug, id);
    for (const c of d.children ?? []) {
      ra.set(c.slug, await themMot(c.slug, c.name, null, id));
    }
  }

  // Gan nganh de `/industries/:slug/services` co du lieu that.
  const dau = ra.get('installation-commissioning');
  const ng = nganh.get('oil-and-gas');
  if (dau && ng) await daos.services.replaceLinks(dau, { industryIds: [ng] });

  log(`  dich vu         ${ra.size}`);
  return ra;
}

const DU_AN = [
  { slug: 'refinery-lab-upgrade', title: 'Refinery Laboratory Upgrade', type: 'installation',
    location: 'Dung Quat', country: 'VN', hienTen: true },
  { slug: 'qc-lab-commissioning', title: 'QC Lab Commissioning', type: 'commissioning',
    location: 'Hai Phong', country: 'VN', hienTen: false },
] as const;

async function seedDuAn(daos: DaoManager): Promise<number> {
  let n = 0;
  for (const d of DU_AN) {
    if (await daos.projects.findBySlug('en', d.slug)) {
      dem.daCo += 1;
      n += 1;
      continue;
    }
    const pr = await daos.projects.insert({
      projectType: d.type,
      locationText: d.location,
      countryCode: d.country,
      /**
       * `confidential` cho du an thu hai — de phep thu chung minh duoc rang ten
       * khach hang KHONG lo ra. Neu ca hai deu `public` thi nhanh che ten khong
       * bao gio duoc chay.
       */
      customerVisibility: d.hienTen ? 'public' : 'confidential',
      completedAt: '2026-03-15',
    });
    for (const locale of ['en', 'vi'] as const) {
      await daos.projects.upsertTranslation(pr.id, {
        locale,
        title: d.title,
        slug: locale === 'en' ? d.slug : `${d.slug}-vi`,
        shortDescription: `${d.title} — ${VAN_BAN_THAY_THE}`,
        scopeOfWork: [doan(VAN_BAN_THAY_THE)],
        implementation: [doan(VAN_BAN_THAY_THE)],
        result: [doan(VAN_BAN_THAY_THE)],
      });
      await daos.projects.publishTranslation(pr.id, locale, new Date());
    }
    await daos.projects.publish(pr.id, new Date());
    dem.moi += 1;
    n += 1;
  }
  log(`  du an           ${n}`);
  return n;
}

const DANH_MUC_TIN = [
  { slug: 'news', name: 'Company News' },
  { slug: 'technical-articles', name: 'Technical Articles' },
] as const;

/**
 * BON to hop trang thai — de phep thu tren HTTP that kiem duoc ADR-004.
 *
 * `chi-cha` va `chi-dich` PHAI vo hinh o duong cong khai. Neu seed chi co bai
 * "ca hai publish" thi `smoke-api.mjs` khong the chung minh dieu gi: mot cai dat
 * bo het dieu kien trang thai van cho ra dung ket qua do.
 */
const BAI_VIET = [
  { slug: 'new-optidist-launch', title: 'New OptiDist Launch', dm: 'news',
    chaPub: true, dichPub: true, haiNgu: true },
  { slug: 'astm-d86-explained', title: 'ASTM D86 Explained', dm: 'technical-articles',
    chaPub: true, dichPub: true, haiNgu: false },
  { slug: 'draft-translation-only', title: 'Draft Translation Only', dm: 'news',
    chaPub: true, dichPub: false, haiNgu: false },
  { slug: 'draft-parent-only', title: 'Draft Parent Only', dm: 'news',
    chaPub: false, dichPub: true, haiNgu: false },
] as const;

async function seedTin(daos: DaoManager): Promise<void> {
  const dm = new Map<string, string>();
  for (const c of DANH_MUC_TIN) {
    const co = await daos.postCategories.findBySlug(c.slug);
    if (co) {
      dm.set(c.slug, co.id);
      dem.daCo += 1;
      continue;
    }
    const x = await daos.postCategories.insert({ name: c.name, slug: c.slug });
    await daos.postCategories.publish(x.id, new Date());
    dm.set(c.slug, x.id);
    dem.moi += 1;
  }
  log(`  danh muc tin    ${dm.size}`);

  let n = 0;
  for (const b of BAI_VIET) {
    if (await daos.posts.findBySlug('en', b.slug)) {
      dem.daCo += 1;
      n += 1;
      continue;
    }
    const p = await daos.posts.insert({ categoryId: dm.get(b.dm)! });
    const locales = b.haiNgu ? (['en', 'vi'] as const) : (['en'] as const);
    for (const locale of locales) {
      await daos.posts.upsertTranslation(p.id, {
        locale,
        title: b.title,
        slug: locale === 'en' ? b.slug : `${b.slug}-vi`,
        excerpt: `${b.title} — ${VAN_BAN_THAY_THE}`,
        content: [tieuDe(b.title), doan(VAN_BAN_THAY_THE)],
      });
      if (b.dichPub) await daos.posts.publishTranslation(p.id, locale, new Date());
    }
    if (b.chaPub) await daos.posts.publish(p.id, new Date());
    dem.moi += 1;
    n += 1;
  }
  log(`  bai viet        ${n} (2 hien, 1 dich nhap, 1 cha nhap)`);
}

const TAI_LIEU = [
  { slug: 'optidist-datasheet', title: 'OptiDist Datasheet', type: 'datasheet' },
  { slug: 'ltv-company-profile', title: 'LT Vietnam Company Profile', type: 'company_profile' },
  { slug: 'herzog-catalogue-2026', title: 'Herzog Catalogue 2026', type: 'catalogue' },
] as const;

async function seedTaiLieu(daos: DaoManager): Promise<void> {
  /**
   * `documents.file_id` la NOT NULL tro toi `media` — nen phai co mot hang media.
   *
   * Media THAT la viec cua F7 (luu tru tep, bien the anh, duong phuc vu). O day
   * chi can MOT hang de khoa ngoai hop le; tep khong ton tai va do la co y —
   * `is_public` van doc duoc, con tai tep se 404 cho den F7.
   */
  const co = await daos.media.findByChecksum?.('demo-placeholder').catch(() => null);
  let fileId = co?.id;
  if (!fileId) {
    const m = await daos.media.insert({
      fileName: 'demo-placeholder.pdf',
      originalName: 'demo-placeholder.pdf',
      storageClass: 'protected',
      storagePath: 'protected-documents/demo-placeholder.pdf',
      mimeType: 'application/pdf',
      fileExtension: 'pdf',
      fileSize: 1024,
      checksum: 'demo-placeholder',
      title: 'Tep thay the cho tai lieu demo',
    });
    fileId = m.id;
    dem.moi += 1;
  }

  let n = 0;
  for (const t of TAI_LIEU) {
    if (await daos.documents.findBySlug(t.slug)) {
      dem.daCo += 1;
      n += 1;
      continue;
    }
    const d = await daos.documents.insert({
      documentType: t.type,
      fileId,
      title: t.title,
      slug: t.slug,
      description: `${t.title} — ${VAN_BAN_THAY_THE}`,
      language: 'en',
      visibility: 'public',
    });
    await daos.documents.publish(d.id, new Date());
    dem.moi += 1;
    n += 1;
  }
  log(`  tai lieu        ${n}`);
}

const TRANG = [
  { type: 'about', slug: 'about-us', title: 'About LT Vietnam' },
  { type: 'contact', slug: 'contact-us', title: 'Contact Us' },
] as const;

async function seedTrang(daos: DaoManager): Promise<void> {
  let n = 0;
  for (const t of TRANG) {
    /**
     * `page_type` la UNIQUE — tra cuu theo LOAI, khong theo slug.
     *
     * `findByType` la phep kiem idempotent dung o day: chay lai seed khong duoc
     * dinh `duplicate key value violates unique constraint pages_page_type_key`.
     */
    if (await daos.pages.findByType(t.type)) {
      dem.daCo += 1;
      n += 1;
      continue;
    }
    const p = await daos.pages.insert({ pageType: t.type, isSystemPage: true });
    for (const locale of ['en', 'vi'] as const) {
      await daos.pages.upsertTranslation(p.id, {
        locale,
        title: t.title,
        slug: locale === 'en' ? t.slug : `${t.slug}-vi`,
        summary: `${t.title} — ${VAN_BAN_THAY_THE}`,
        content: [tieuDe(t.title), doan(VAN_BAN_THAY_THE)],
      });
      await daos.pages.publishTranslation(p.id, locale, new Date());
    }
    await daos.pages.publish(p.id, new Date());
    dem.moi += 1;
    n += 1;
  }
  log(`  trang tinh      ${n}`);
}


// ══════════════════════════════════════════════════════════════
//  F4 — KHUNG SITE: anh, banner, khach hang, van phong, menu
// ══════════════════════════════════════════════════════════════

/**
 * MOT hang `media` kieu anh, dung chung cho banner va logo khach hang.
 *
 * `banners.image_id` la NOT NULL va `customers.logo_id` di qua `innerJoin`, nen
 * khong co hang media thi khong the seed hai nhom kia. Tep KHONG ton tai va do la
 * co y: luu tru that la viec cua F7. Duong `/media/...` se 404 cho den luc do, con
 * moi phep kiem cua F4 (banner con hieu luc, logo duoc phep hien) khong phu thuoc
 * vao tep.
 */
async function seedAnh(daos: DaoManager): Promise<string> {
  const co = await daos.media.findByChecksum?.('demo-image').catch(() => null);
  if (co) {
    dem.daCo += 1;
    return co.id;
  }
  const m = await daos.media.insert({
    fileName: 'demo-image.jpg',
    originalName: 'demo-image.jpg',
    storageClass: 'public',
    storagePath: 'public/demo-image.jpg',
    publicUrl: '/media/public/demo-image.jpg',
    mimeType: 'image/jpeg',
    fileExtension: 'jpg',
    fileSize: 2048,
    width: 1920,
    height: 720,
    checksum: 'demo-image',
    title: 'Anh thay the cho banner va logo demo',
    altText: 'Anh thay the',
  });
  dem.moi += 1;
  return m.id;
}

/**
 * BON banner, va ba trong so do ton tai de CHUNG MINH mot dieu kien loc.
 *
 *   `san pham`        published, khong cua so thoi gian, tro toi mot san pham THAT
 *                     -> phai co mat, kem `url` da giai
 *   `lien ket chet`   published, tro toi mot UUID khong ton tai -> phai co mat
 *                     NHUNG `url` la `null` (giu anh, bo lien ket)
 *   `da het han`      published, `end_at` o qua khu -> phai KHONG co mat
 *   `ban nhap`        chua publish -> phai KHONG co mat
 *
 * Hai cai cuoi la phep kiem NGUOC. Khong co chung thi "banner het han bien mat"
 * khong co gi de do — va mot phep kiem khong co gi de do thi luon xanh.
 */
async function seedBanner(daos: DaoManager, anhId: string, sanPhamId: string): Promise<void> {
  const co = await daos.banners.list({});
  if (co.some((b) => b.title.startsWith('DEMO'))) {
    dem.daCo += 1;
    log('  banner          4 (da co)');
    return;
  }

  const qua = new Date(Date.now() - 7 * 86_400_000);
  const b1 = await daos.banners.insert({
    imageId: anhId,
    // Ten KHONG nhac ten may cu the: banner nay tro toi san pham DA PUBLISH dau
    // tien, va cai do doi theo thu tu seed. Mot ten nhu "DEMO Hero — OptiDist" se
    // thanh mot loi noi sai ngay khi thu tu doi.
    title: 'DEMO Hero — san pham',
    subtitle: VAN_BAN_THAY_THE,
    buttonLabel: 'Xem san pham',
    imageAlt: 'Anh thay the',
    linkType: 'product',
    linkTargetId: sanPhamId,
  });
  await daos.banners.publish(b1.id);

  const b2 = await daos.banners.insert({
    imageId: anhId,
    title: 'DEMO Hero — lien ket chet',
    // UUID hop le nhung khong tro toi hang nao. `link_target_id` KHONG co khoa
    // ngoai (lien ket da hinh), nen database chap nhan gia tri nay — va do dung la
    // cai gia phai tra ma `dao/banners/object.ts` da ghi.
    linkType: 'product',
    linkTargetId: randomUUID(),
  });
  await daos.banners.publish(b2.id);

  const b3 = await daos.banners.insert({
    imageId: anhId,
    title: 'DEMO Hero — da het han',
    linkType: 'none',
    startAt: new Date(qua.getTime() - 86_400_000),
    endAt: qua,
  });
  await daos.banners.publish(b3.id);

  await daos.banners.insert({
    imageId: anhId,
    title: 'DEMO Hero — ban nhap',
    linkType: 'none',
  });

  dem.moi += 4;
  log('  banner          4 (1 song, 1 lien ket chet, 1 het han, 1 nhap)');
}

/**
 * BA khach hang, va hai trong so do KHONG duoc phep hien.
 *
 * `status` va `is_public` la HAI co che doc lap (xem `dao/customers/object.ts`):
 * mot khach co the da duyet noi dung nhung chua ky giay dong y dung logo. Dung
 * logo khi chua duoc phep la chuyen phap ly, khong phai loi giao dien — nen phai
 * co du lieu chung minh duong cong khai ap CA HAI dieu kien.
 */
async function seedKhachHang(daos: DaoManager, anhId: string): Promise<void> {
  const co = await daos.customers.list({});
  if (co.data.some((c) => c.name.startsWith('DEMO'))) {
    dem.daCo += 1;
    log('  khach hang      3 (da co)');
    return;
  }

  const k1 = await daos.customers.insert({
    name: 'DEMO Petro Lab JSC',
    shortDescription: VAN_BAN_THAY_THE,
    logoId: anhId,
    websiteUrl: 'https://example.com',
  });
  await daos.customers.update(k1.id, { isPublic: true });
  await daos.customers.publish(k1.id, new Date());

  // Da duyet noi dung NHUNG chua cho phep dung logo -> khong duoc hien.
  const k2 = await daos.customers.insert({ name: 'DEMO Quiet Refinery Ltd', logoId: anhId });
  await daos.customers.publish(k2.id, new Date());

  // Cho phep dung logo NHUNG khong co logo -> `innerJoin` loai ra.
  const k3 = await daos.customers.insert({ name: 'DEMO No Logo Co' });
  await daos.customers.update(k3.id, { isPublic: true });
  await daos.customers.publish(k3.id, new Date());

  dem.moi += 3;
  log('  khach hang      3 (1 hien duoc, 1 chua cho phep, 1 khong co logo)');
}

async function seedVanPhong(daos: DaoManager): Promise<void> {
  const co = await daos.offices.list({});
  if (co.some((o) => o.name.startsWith('DEMO'))) {
    dem.daCo += 1;
    log('  van phong       3 (da co)');
    return;
  }
  const o1 = await daos.offices.insert({
    officeType: 'head_office',
    name: 'DEMO LT Vietnam — Head Office',
    address: '123 Duong Thay The, Quan 1, TP. Ho Chi Minh',
    workingHours: 'Mon–Fri 08:00–17:00',
    phone: '+84 28 0000 0000',
    email: 'info@example.com',
    // NUMERIC(10,7) — mapper doi tu chuoi cua `pg` sang `number`.
    latitude: 10.7769,
    longitude: 106.7009,
  });
  await daos.offices.publish(o1.id);

  const o2 = await daos.offices.insert({
    officeType: 'branch',
    name: 'DEMO LT Vietnam — Ha Noi Branch',
    address: '456 Duong Thay The, Ba Dinh, Ha Noi',
  });
  await daos.offices.publish(o2.id);

  /**
   * `unpublish()` — KHONG phai "chi insert roi khong publish".
   *
   * `ltv.offices.status` co MAC DINH LA `'published'`. Toi viet ban dau la "chua
   * publish" roi do thay `/offices` tra ve ca ba hang, ke ca hang toi tuong la ban
   * nhap.
   *
   * NAM bang trong so do lam vay: `offices`, `standards`, `applications`,
   * `industries`, `post_categories` — nhom du lieu THAM CHIEU. ASTM D86 la mot su
   * that, khong phai mot bai viet can duyet; mot dia chi cong ty cung vay. Nen mac
   * dinh do la co y — nhung no co mot hau qua cho F8: man hinh quan tri cua nam
   * nhom nay tao ra ban ghi DA CONG KHAI ngay tu luc bam Luu. Ghi o `doc/13`.
   */
  const o3 = await daos.offices.insert({
    officeType: 'workshop',
    name: 'DEMO Workshop — an',
    address: '789 Duong Thay The',
  });
  await daos.offices.unpublish(o3.id);

  dem.moi += 3;
  log('  van phong       3 (2 hien, 1 an)');
}

/**
 * DANH DAU NOI BAT cho dich vu va du an.
 *
 * `is_featured` la NGUON DUY NHAT quyet dinh cai gi len trang chu (doc/06 PHAN
 * VIII). Seed cua F3 khong dat co nay — dung, vi F3 chi lo danh sach va trang chi
 * tiet. Nhung de nguyen thi `featured_services` va `featured_projects` cua `/home`
 * LUON RONG, va moi phep kiem chung se xanh MA KHONG DO GI CA.
 */
async function seedNoiBat(daos: DaoManager): Promise<void> {
  const dv = await daos.services.list({ status: 'published' }, { page: 1, pageSize: 100 });
  const da = await daos.projects.list({ status: 'published' }, { page: 1, pageSize: 100 });
  let n = 0;
  for (const x of dv.data.slice(0, 2)) {
    if (x.isFeatured) continue;
    await daos.services.update(x.id, { isFeatured: true });
    n += 1;
  }
  for (const x of da.data.slice(0, 1)) {
    if (x.isFeatured) continue;
    await daos.projects.update(x.id, { isFeatured: true });
    n += 1;
  }
  log(`  noi bat         2 dich vu, 1 du an (${n} moi)`);
}

/**
 * MUC MENU co LIEN KET THAT — va nam truong hop bien cua `/navigation`.
 *
 * Base seed dat chin muc `custom_url` cho menu `header`. Chung dung, nhung chung
 * khong kiem duoc gi: `custom_url` khong phai di qua tang giai lien ket. Cai can do
 * la duong `(link_type, link_target_id)`:
 *
 *   muc tro toi san pham/hang/danh muc THAT  -> `url` phai duoc giai dung
 *   muc tro toi UUID khong ton tai           -> phai BI BO khoi menu
 *   muc `link_type = 'none'`                 -> phai CO MAT voi `url = null`
 *   muc cha CHET nhung co con SONG           -> phai CO MAT nhu tieu de, khong keo
 *                                               ca nhanh con di theo
 *   `custom_url = 'javascript:...'`           -> phai BI BO
 *
 * Bon truong hop cuoi la ly do ham nay ton tai. Khong co chung thi `LinkResolver`
 * chi duoc do o duong sang.
 */
async function seedMenu(
  daos: DaoManager,
  sanPhamId: string,
  hangId: string,
  danhMucId: string,
): Promise<void> {
  const m = await daos.menus.findByCode('footer_products');
  if (!m) {
    log('  muc menu        0 (khong tim thay menu footer_products — bo qua)');
    return;
  }
  const dangCo = await daos.menus.listItems(m.id);
  if (dangCo.some((i) => i.label.startsWith('DEMO'))) {
    dem.daCo += 1;
    log('  muc menu        8 (da co)');
    return;
  }

  /**
   * `id` sinh o DAY, khong de database sinh.
   *
   * `replaceItems` ghi muc goc truoc roi muc con sau, va muc con phai mang
   * `parentId` la mot UUID CU THE. De database sinh id thi khong co cach nao tro
   * toi cha trong cung mot lan goi.
   */
  const chaChet = randomUUID();

  await daos.menus.replaceItems(m.id, [
    // Giu nguyen muc dang co: `replaceItems` THAY toan bo, nen khong ghi lai chung
    // la xoa chung.
    ...dangCo.map((i) => ({
      id: i.id,
      parentId: i.parentId,
      label: i.label,
      linkType: i.linkType,
      linkTargetId: i.linkTargetId,
      customUrl: i.customUrl,
      displayOrder: i.displayOrder,
    })),
    { label: 'DEMO Product link', linkType: 'product', linkTargetId: sanPhamId, displayOrder: 10 },
    { label: 'DEMO Brand link', linkType: 'brand', linkTargetId: hangId, displayOrder: 11 },
    {
      label: 'DEMO Category link',
      linkType: 'product_category',
      linkTargetId: danhMucId,
      displayOrder: 12,
    },
    { label: 'DEMO Dead link', linkType: 'product', linkTargetId: randomUUID(), displayOrder: 13 },
    { label: 'DEMO Heading', linkType: 'none', displayOrder: 14 },
    {
      label: 'DEMO Unsafe link',
      linkType: 'custom_url',
      customUrl: 'javascript:alert(1)',
      displayOrder: 15,
    },
    {
      id: chaChet,
      label: 'DEMO Dead parent',
      linkType: 'product',
      linkTargetId: randomUUID(),
      displayOrder: 16,
    },
    {
      parentId: chaChet,
      label: 'DEMO Live child',
      linkType: 'product',
      linkTargetId: sanPhamId,
      displayOrder: 0,
    },
  ]);
  dem.moi += 8;
  log('  muc menu        8 (3 song, 1 chet, 1 tieu de, 1 khong an toan, 1 cha chet + 1 con)');
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

    // ── F3: noi dung co ban dich ──
    await seedDichVu(daos, nganh);
    await seedDuAn(daos);
    await seedTin(daos);
    await seedTaiLieu(daos);
    await seedTrang(daos);

    // ── F4: khung site ──
    const anhId = await seedAnh(daos);
    const spDau = (await daos.products.list({ status: 'published' }, { page: 1, pageSize: 1 }))
      .data[0];
    const hangDau = hang.get('pac') ?? [...hang.values()][0];
    const dmDau = danhMuc.get('petroleum-testing') ?? [...danhMuc.values()][0];
    if (spDau === undefined || hangDau === undefined || dmDau === undefined) {
      throw new Error('Khong co san pham/hang/danh muc de gan lien ket menu va banner');
    }
    await seedBanner(daos, anhId, spDau.id);
    await seedKhachHang(daos, anhId);
    await seedVanPhong(daos);
    await seedNoiBat(daos);
    await seedMenu(daos, spDau.id, hangDau, dmDau);

    /**
     * KIEM BAT BIEN CUA CAY ngay sau khi ghi.
     *
     * `findInconsistentNodes()` doi chieu `ancestor_ids`/`depth` voi `parent_id`
     * that. Neu seed lam lech hai cot do thi bo loc nhanh con tra ve sai du lieu
     * MA KHONG BAO LOI. Kiem o day de sai thi biet ngay, khong phai o F2 khi mot
     * bai kiem bo loc do vi mot ly do trong nhu khong lien quan.
     */
    for (const nhom of ['productCategories', 'applications', 'services'] as const) {
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
