/**
 * Du lieu Valve lay tu catalogue cong khai cu cua LT Vietnam.
 *
 * Nguon va gioi han du lieu duoc ghi tai `doc/data/valve-products/README.md`.
 * Script idempotent: tai su dung media theo checksum va cap nhat san pham theo slug.
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

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IMAGE_ROOT = join(ROOT, 'doc', 'data', 'valve-products', 'images');
const log = (message: string): void => process.stdout.write(`${message}\n`);

type ProductType = 'equipment' | 'accessory' | 'other';
interface ValveProductSeed {
  readonly brand: 'masoneilan' | 'consolidated';
  readonly category: string;
  readonly name: string;
  readonly model: string;
  readonly slug: string;
  readonly image: string;
  readonly productType?: ProductType;
  readonly featured?: boolean;
  readonly description?: string;
  readonly features?: readonly string[];
}

const PRODUCTS: readonly ValveProductSeed[] = [
  {
    brand: 'masoneilan',
    category: 'process-instrumentation',
    name: '12400 Series Level Transmitter / Controller',
    model: '12400 Series',
    slug: 'masoneilan-12400-series-level-transmitter-controller',
    image: 'masoneilan-12400.jpg',
  },
  {
    brand: 'masoneilan',
    category: 'valve-positioners-controls',
    name: 'SVI II AP Advanced Performance Digital Valve Positioner',
    model: 'SVI II AP',
    slug: 'masoneilan-svi-ii-ap-digital-valve-positioner',
    image: 'masoneilan-svi-ii-ap.png',
    featured: true,
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '33000 Series Triple Offset Butterfly Valve',
    model: '33000 Series',
    slug: 'masoneilan-33000-series-triple-offset-butterfly-valve',
    image: 'masoneilan-33000.png',
  },
  {
    brand: 'masoneilan',
    category: 'valve-actuators',
    name: '87/88 Series Spring Diaphragm Actuators',
    model: '87/88 Series',
    slug: 'masoneilan-87-88-series-spring-diaphragm-actuators',
    image: 'masoneilan-87-88.png',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '21000 Series High-Performance Control Valves',
    model: '21000 Series',
    slug: 'masoneilan-21000-series-high-performance-control-valves',
    image: 'masoneilan-21000.jpg',
    featured: true,
    description:
      'Heavy top-guided globe control valve family for automated process-control applications, with trim options for demanding flow, noise and shutoff requirements.',
    features: [
      'Top-guided globe-valve construction',
      'Trim options for low flow, noise reduction and anti-cavitation duties',
      'Options for cryogenic service, tight shutoff and multiple end connections',
    ],
  },
  {
    brand: 'masoneilan',
    category: 'pneumatic-accessories',
    name: 'BR200 / BR400 High-Capacity Volume Booster Relays',
    model: 'BR200 / BR400',
    slug: 'masoneilan-br200-br400-volume-booster-relays',
    image: 'masoneilan-br200-br400.png',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '35002 Camflex II Rotary Globe Control Valve',
    model: '35002 Camflex II',
    slug: 'masoneilan-35002-camflex-ii-rotary-globe-control-valve',
    image: 'masoneilan-camflex-35002.png',
    featured: true,
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '84000 Series SteamForm Valve',
    model: '84000 Series',
    slug: 'masoneilan-84000-series-steamform-valve',
    image: 'masoneilan-84000.png',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '41005 Series Cage-Guided Balanced Globe Valve',
    model: '41005 Series',
    slug: 'masoneilan-41005-series-cage-guided-balanced-globe-valve',
    image: 'masoneilan-41005.png',
  },
  {
    brand: 'masoneilan',
    category: 'valve-positioners-controls',
    name: 'Limit Switch',
    model: 'Limit Switch',
    slug: 'masoneilan-limit-switch',
    image: 'masoneilan-limit-switch.jpg',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'pneumatic-accessories',
    name: 'Model 78 Air Filter Regulator',
    model: 'Model 78',
    slug: 'masoneilan-model-78-air-filter-regulator',
    image: 'masoneilan-model-78.png',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '10000 Series Double-Ported Globe Valve',
    model: '10000 Series',
    slug: 'masoneilan-10000-series-double-ported-globe-valve',
    image: 'masoneilan-10000.jpg',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '31000 Series Eccentric Rotary Control Valve',
    model: '31000 Series',
    slug: 'masoneilan-31000-series-eccentric-rotary-control-valve',
    image: 'masoneilan-31000.png',
  },
  {
    brand: 'masoneilan',
    category: 'valve-positioners-controls',
    name: 'SVI II ESD Emergency Shutdown Device',
    model: 'SVI II ESD',
    slug: 'masoneilan-svi-ii-esd-emergency-shutdown-device',
    image: 'masoneilan-svi-ii-esd.jpg',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'pneumatic-accessories',
    name: 'Pressure Regulators Models 525/526',
    model: '525/526',
    slug: 'masoneilan-pressure-regulators-525-526',
    image: 'masoneilan-525-526.png',
    productType: 'accessory',
  },
  {
    brand: 'masoneilan',
    category: 'valve-engineering-software',
    name: 'ValSpeQ Sizing Software',
    model: 'ValSpeQ',
    slug: 'masoneilan-valspeq-sizing-software',
    image: 'masoneilan-valspeq.png',
    productType: 'other',
  },
  {
    brand: 'masoneilan',
    category: 'control-valves',
    name: '28000 Series VariPak Micro-Trim Globe Valve',
    model: '28000 Series VariPak',
    slug: 'masoneilan-28000-series-varipak-micro-trim-globe-valve',
    image: 'masoneilan-varipak-28000.jpg',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: 'EBV Electromatic Ball Valve 3500 Series',
    model: '3500 Series',
    slug: 'consolidated-3500-series-ebv-electromatic-ball-valve',
    image: 'consolidated-3500.png',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '2700 Series Safety Valve',
    model: '2700 Series',
    slug: 'consolidated-2700-series-safety-valve',
    image: 'consolidated-2700.png',
    featured: true,
    description:
      'Safety-valve family presented for steam and combined-cycle power applications, including the gas-turbine combined-cycle segment.',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '1541–1543 Series Safety Valves',
    model: '1541–1543 Series',
    slug: 'consolidated-1541-1543-series-safety-valves',
    image: 'consolidated-1541-1543.png',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '1811 Series Safety Valve',
    model: '1811 Series',
    slug: 'consolidated-1811-series-safety-valve',
    image: 'consolidated-1811.png',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '1700 Series Maxiflow Safety Valve',
    model: '1700 Series Maxiflow',
    slug: 'consolidated-1700-series-maxiflow-safety-valve',
    image: 'consolidated-1700.png',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '3900 MPV Pilot-Operated Safety Relief Valve',
    model: '3900 MPV',
    slug: 'consolidated-3900-mpv-pilot-operated-safety-relief-valve',
    image: 'consolidated-3900-mpv.png',
    featured: true,
  },
  {
    brand: 'consolidated',
    category: 'valve-test-equipment-software',
    name: 'SRVSpeQ Sizing Software',
    model: 'SRVSpeQ',
    slug: 'consolidated-srvspeq-sizing-software',
    image: 'consolidated-srvspeq.png',
    productType: 'other',
  },
  {
    brand: 'consolidated',
    category: 'valve-test-equipment-software',
    name: 'EVT-Pro Electronic Valve Tester',
    model: 'EVT-Pro',
    slug: 'consolidated-evt-pro-electronic-valve-tester',
    image: 'consolidated-evt-pro.png',
    productType: 'equipment',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '1900/P Series Safety Relief Valve',
    model: '1900/P Series',
    slug: 'consolidated-1900-p-series-safety-relief-valve',
    image: 'consolidated-1900p.png',
    featured: true,
    description:
      'Safety-relief valve family for a broad range of industrial duties, with conventional, balanced-bellows and exposed-spring configurations.',
    features: [
      'Configurations for varied industrial applications',
      'Conventional, balanced-bellows and exposed-spring variants',
      'Referenced for ASME Section I steam, flashing-water and organic-vapor duties',
    ],
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '13900 Series Pilot-Operated Safety Relief Valve',
    model: '13900 Series',
    slug: 'consolidated-13900-series-pilot-operated-safety-relief-valve',
    image: 'consolidated-13900.png',
  },
  {
    brand: 'consolidated',
    category: 'safety-relief-valves',
    name: '2900 MPV Pilot-Operated Safety Relief Valve',
    model: '2900 MPV',
    slug: 'consolidated-2900-mpv-pilot-operated-safety-relief-valve',
    image: 'consolidated-2900-mpv.png',
  },
];

const CATEGORIES = [
  [
    'valves-flow-control',
    'Valves & Flow Control',
    null,
    'Control valves, safety and relief valves, actuators, positioners and engineering tools.',
  ],
  [
    'control-valves',
    'Control Valves',
    'valves-flow-control',
    'Control-valve families for industrial process regulation and isolation.',
  ],
  [
    'safety-relief-valves',
    'Safety & Relief Valves',
    'valves-flow-control',
    'Pressure-protection valve families for industrial and power applications.',
  ],
  [
    'valve-actuators',
    'Valve Actuators',
    'valves-flow-control',
    'Actuation equipment for valve automation.',
  ],
  [
    'valve-positioners-controls',
    'Valve Positioners & Controls',
    'valves-flow-control',
    'Positioning, feedback and shutdown devices for automated valves.',
  ],
  [
    'pneumatic-accessories',
    'Pneumatic Accessories',
    'valves-flow-control',
    'Air preparation, regulation and booster accessories for valve assemblies.',
  ],
  [
    'process-instrumentation',
    'Process Instrumentation',
    'valves-flow-control',
    'Measurement and control instrumentation associated with process valves.',
  ],
  [
    'valve-engineering-software',
    'Valve Engineering Software',
    'valves-flow-control',
    'Engineering software used to select and size valve solutions.',
  ],
  [
    'valve-test-equipment-software',
    'Valve Test Equipment & Software',
    'valves-flow-control',
    'Tools for safety-valve sizing, verification and testing.',
  ],
] as const;

const paragraph = (text: string): ContentBlock => ({
  id: randomUUID(),
  type: 'paragraph',
  spans: [{ text }],
});
const bulletList = (items: readonly string[]): ContentBlock => ({
  id: randomUUID(),
  type: 'list',
  style: 'bullet',
  items: items.map((text) => ({ spans: [{ text }] })),
});

function defaultDescription(product: ValveProductSeed): string {
  if (product.category === 'safety-relief-valves')
    return `${product.name} is part of the Consolidated pressure-protection portfolio for industrial process and power applications.`;
  if (product.category === 'control-valves')
    return `${product.name} is part of the Masoneilan control-valve portfolio for industrial process-control applications.`;
  if (product.productType === 'other')
    return `${product.name} supports valve selection, sizing or engineering workflows.`;
  return `${product.name} supports valve automation, control, measurement or maintenance workflows.`;
}

async function loadMedia(
  daos: DaoManager,
  cfg: AppConfig,
  fileName: string,
  slug: string,
  alt: string,
): Promise<string> {
  const source = join(IMAGE_ROOT, fileName);
  const original = await readFile(source);
  const image = await sharp(original)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84 })
    .toBuffer();
  const checksum = createHash('sha256').update(image).digest('hex');
  const existing = await daos.media.findByChecksum(checksum);
  if (existing) return existing.id;
  const metadata = await sharp(image).metadata();
  const targetName = `${slug}.jpg`;
  const targetDir = mediaPaths(cfg).public;
  await mkdir(targetDir, { recursive: true });
  await sharp(image).toFile(join(targetDir, targetName));
  const media = await daos.media.insert({
    fileName: targetName,
    originalName: basename(source),
    storageClass: 'public',
    storagePath: `public/${targetName}`,
    publicUrl: `/media/public/${targetName}`,
    mimeType: 'image/jpeg',
    fileExtension: 'jpg',
    fileSize: image.byteLength,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    checksum,
    title: alt,
    altText: alt,
    credit: 'Legacy LT Vietnam public catalogue',
  });
  return media.id;
}

async function ensureBrand(daos: DaoManager, slug: 'masoneilan' | 'consolidated') {
  const existing = await daos.brands.findBySlug(slug);
  if (existing) return existing;
  const name = slug === 'masoneilan' ? 'Masoneilan' : 'Consolidated';
  const brand = await daos.brands.insert({
    brandType: 'manufacturer',
    name,
    slug,
    code: name.toUpperCase(),
    countryCode: 'US',
    shortDescription:
      slug === 'masoneilan'
        ? 'Industrial control valves, actuators, positioners and valve accessories.'
        : 'Safety and pressure-relief valve solutions for industrial and power applications.',
  });
  await daos.brands.publish(brand.id, new Date());
  await daos.brands.update(brand.id, { isFeatured: true });
  return brand;
}

async function ensureCategories(daos: DaoManager): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [slug, name, parentSlug, shortDescription] of CATEGORIES) {
    const existing = await daos.productCategories.findBySlug(slug);
    const category =
      existing ??
      (await daos.productCategories.insert({
        parentId: parentSlug === null ? null : ids.get(parentSlug),
        name,
        slug,
        shortDescription,
        description: [paragraph(shortDescription)],
        seoTitle: `${name} | LT Vietnam`,
        seoDescription: shortDescription,
      }));
    if (category.status !== 'published')
      await daos.productCategories.publish(category.id, new Date());
    await daos.productCategories.update(category.id, {
      isFeatured: slug === 'valves-flow-control',
      displayOrder: slug === 'valves-flow-control' ? 1 : 20,
    });
    ids.set(slug, category.id);
  }
  let lab = await daos.productCategories.findBySlug('laboratory-analysis');
  if (!lab) {
    lab = await daos.productCategories.insert({
      name: 'Laboratory & Analysis',
      slug: 'laboratory-analysis',
      shortDescription:
        'Analytical instruments, sample preparation and testing solutions for industrial laboratories.',
      description: [
        paragraph(
          'Analytical instruments, sample preparation and testing solutions for industrial laboratories.',
        ),
      ],
    });
    await daos.productCategories.publish(lab.id, new Date());
  }
  await daos.productCategories.update(lab.id, { isFeatured: true, displayOrder: 0 });
  ids.set('laboratory-analysis', lab.id);
  return ids;
}

async function connectLaboratoryRoot(daos: DaoManager, laboratoryId: string): Promise<number> {
  const page = await daos.products.list({ includeDeleted: false }, { page: 1, pageSize: 100 });
  let updated = 0;
  for (const product of page.data.filter((item) => item.internalCode?.startsWith('LAB-'))) {
    const detail = await daos.products.findDetailBySlug(product.slug);
    if (!detail || detail.categories.some((category) => category.id === laboratoryId)) continue;
    await daos.products.replaceCategories(product.id, [
      ...detail.categories.map((category) => ({
        categoryId: category.id,
        isPrimary: category.isPrimary,
      })),
      { categoryId: laboratoryId, isPrimary: false },
    ]);
    updated += 1;
  }
  return updated;
}

async function seedProducts(
  daos: DaoManager,
  cfg: AppConfig,
  brands: Map<string, string>,
  categories: Map<string, string>,
): Promise<void> {
  const publisher = new PublishServiceImpl(daos);
  for (const [index, seed] of PRODUCTS.entries()) {
    const description = seed.description ?? defaultDescription(seed);
    const mediaId = await loadMedia(
      daos,
      cfg,
      seed.image,
      seed.slug,
      `${seed.brand === 'masoneilan' ? 'Masoneilan' : 'Consolidated'} ${seed.model}`,
    );
    const brandId = brands.get(seed.brand)!;
    let product = await daos.products.findBySlug(seed.slug);
    const input = {
      brandId,
      name: seed.name,
      slug: seed.slug,
      model: seed.model,
      internalCode: `VALVE-${String(index + 1).padStart(3, '0')}`,
      shortDescription: description,
      productType: seed.productType ?? 'equipment',
      featuredImageId: mediaId,
      overview: [
        paragraph(description),
        paragraph(
          'LT Vietnam supports product selection, configuration review, spare parts and technical service. Confirm the final specification against the current manufacturer documentation before ordering.',
        ),
      ],
      features: [
        bulletList(
          seed.features ?? [
            'Part of the current LT Vietnam valve solution catalogue',
            'Configuration is selected against process and operating requirements',
            'Local consultation and technical-support workflow available',
          ],
        ),
      ],
      applicationsText: [
        bulletList([
          'Industrial process plants',
          'Oil, gas, petrochemical or power operations as applicable',
          'Valve automation, pressure protection or maintenance workflows',
        ]),
      ],
      seoTitle: `${seed.name} | LT Vietnam`,
      seoDescription: description,
    } as const;
    if (!product) product = await daos.products.insert(input);
    else product = await daos.products.update(product.id, input);
    await daos.products.update(product.id, {
      isFeatured: seed.featured ?? false,
      displayOrder: index + 20,
    });
    await daos.products.replaceCategories(product.id, [
      { categoryId: categories.get(seed.category)!, isPrimary: true },
      { categoryId: categories.get('valves-flow-control')!, isPrimary: false },
    ]);
    await daos.products.replaceMedia(product.id, [
      { mediaId, mediaRole: 'gallery', displayOrder: 0 },
    ]);
    const check = await publisher.check({ entity: 'product', id: product.id });
    if (!check.ok)
      throw new Error(
        `${seed.slug}: ${check.blockers.map((blocker) => blocker.message).join('; ')}`,
      );
    await publisher.publish({ entity: 'product', id: product.id });
  }
}

async function seedCustomerPortfolio(daos: DaoManager, cfg: AppConfig): Promise<void> {
  const logoId = await loadMedia(
    daos,
    cfg,
    'our-customers.jpg',
    'lt-vietnam-industrial-customers',
    'Selected industrial customers served by LT Vietnam',
  );
  const all = await daos.customers.list({ includeDeleted: false }, { page: 1, pageSize: 100 });
  let customer = all.data.find((item) => item.name === 'LT Vietnam industrial customer portfolio');
  if (!customer)
    customer = await daos.customers.insert({
      name: 'LT Vietnam industrial customer portfolio',
      logoId,
      shortDescription:
        'Selected customers across energy, oil and gas, fertilizer, engineering and industrial sectors.',
    });
  customer = await daos.customers.update(customer.id, {
    logoId,
    isPublic: true,
    isFeatured: true,
    displayOrder: 0,
    shortDescription:
      'Selected customers across energy, oil and gas, fertilizer, engineering and industrial sectors.',
  });
  if (customer.status !== 'published') await daos.customers.publish(customer.id, new Date());
}

async function configureHomepage(daos: DaoManager): Promise<void> {
  const order = [
    'hero',
    'business_areas',
    'featured_products',
    'services',
    'company_intro',
    'featured_brands',
    'customers',
    'projects',
    'posts',
    'contact_call_to_action',
    'featured_categories',
    'capabilities',
    'offices',
  ];
  await daos.transaction(async (tx) => {
    await tx.homepageSections.reorder(order);
    for (const type of order)
      await tx.homepageSections.setEnabled(
        type,
        !['featured_categories', 'capabilities', 'offices'].includes(type),
      );
  });
}

async function configureHeader(daos: DaoManager, categories: Map<string, string>): Promise<void> {
  const menu = await daos.menus.findByCode('header');
  if (!menu) return;
  const current = await daos.menus.listItems(menu.id);
  const rootLabels = current
    .filter((item) => item.parentId === null)
    .map((item) => item.label)
    .sort();
  const safeSets = [
    [
      'About Us',
      'Brands',
      'Contact',
      'Home',
      'News',
      'Products',
      'Projects',
      'Resources',
      'Services',
    ].sort(),
    ['Company', 'Knowledge', 'Products', 'Services', 'Solutions'].sort(),
  ];
  if (
    rootLabels.length > 0 &&
    !safeSets.some((set) => JSON.stringify(set) === JSON.stringify(rootLabels))
  ) {
    log('Header da duoc bien tap rieng: bo qua viec thay menu de bao toan du lieu nguoi dung.');
    return;
  }
  const solutions = randomUUID();
  const knowledge = randomUUID();
  const company = randomUUID();
  await daos.transaction((tx) =>
    tx.menus.replaceItems(menu.id, [
      {
        id: solutions,
        label: 'Solutions',
        labelI18nKey: 'nav.solutions',
        linkType: 'none',
        displayOrder: 0,
      },
      {
        label: 'Laboratory & Analysis',
        labelI18nKey: 'nav.laboratory',
        linkType: 'product_category',
        linkTargetId: categories.get('laboratory-analysis'),
        parentId: solutions,
        displayOrder: 0,
      },
      {
        label: 'Valves & Flow Control',
        labelI18nKey: 'nav.valves',
        linkType: 'product_category',
        linkTargetId: categories.get('valves-flow-control'),
        parentId: solutions,
        displayOrder: 1,
      },
      {
        label: 'Products',
        labelI18nKey: 'nav.products',
        linkType: 'custom_url',
        customUrl: '/products',
        displayOrder: 1,
      },
      {
        label: 'Services',
        labelI18nKey: 'nav.services',
        linkType: 'custom_url',
        customUrl: '/services',
        displayOrder: 2,
      },
      {
        id: knowledge,
        label: 'Knowledge',
        labelI18nKey: 'nav.knowledge',
        linkType: 'none',
        displayOrder: 3,
      },
      {
        label: 'News',
        labelI18nKey: 'nav.news',
        linkType: 'custom_url',
        customUrl: '/news',
        parentId: knowledge,
        displayOrder: 0,
      },
      {
        label: 'Resources',
        labelI18nKey: 'nav.resources',
        linkType: 'custom_url',
        customUrl: '/resources',
        parentId: knowledge,
        displayOrder: 1,
      },
      {
        id: company,
        label: 'Company',
        labelI18nKey: 'nav.company',
        linkType: 'none',
        displayOrder: 4,
      },
      {
        label: 'About Us',
        labelI18nKey: 'nav.about',
        linkType: 'custom_url',
        customUrl: '/about',
        parentId: company,
        displayOrder: 0,
      },
      {
        label: 'Brands',
        labelI18nKey: 'nav.brands',
        linkType: 'custom_url',
        customUrl: '/brands',
        parentId: company,
        displayOrder: 1,
      },
      {
        label: 'Projects',
        labelI18nKey: 'nav.projects',
        linkType: 'custom_url',
        customUrl: '/projects',
        parentId: company,
        displayOrder: 2,
      },
      {
        label: 'Contact',
        labelI18nKey: 'nav.contact',
        linkType: 'custom_url',
        customUrl: '/contact',
        parentId: company,
        displayOrder: 3,
      },
    ]),
  );
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const runtime = await createDaoRuntime(cfg);
  try {
    const daos = runtime.manager;
    log(`Nap ${PRODUCTS.length} san pham Valve tu catalogue cu...`);
    const [masoneilan, consolidated] = await Promise.all([
      ensureBrand(daos, 'masoneilan'),
      ensureBrand(daos, 'consolidated'),
    ]);
    const brands = new Map([
      ['masoneilan', masoneilan.id],
      ['consolidated', consolidated.id],
    ]);
    const categories = await ensureCategories(daos);
    const labs = await connectLaboratoryRoot(daos, categories.get('laboratory-analysis')!);
    await seedProducts(daos, cfg, brands, categories);
    await seedCustomerPortfolio(daos, cfg);
    await configureHomepage(daos);
    await configureHeader(daos, categories);
    log(`Hoan tat: ${PRODUCTS.length} san pham Valve; ${labs} san pham Lab duoc gan vao nhom goc.`);
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
