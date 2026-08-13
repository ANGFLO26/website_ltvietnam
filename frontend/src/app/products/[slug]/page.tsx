import type { ContentBlock, ProductDetailView, ProductTaxonView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { InquiryLauncher } from '@/components/inquiry/InquiryLauncher';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { DiscontinuedNotice } from '@/components/product/DiscontinuedNotice';
import { ProductGallery } from '@/components/product/ProductGallery';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { SpecificationTable } from '@/components/product/SpecificationTable';
import { StandardList } from '@/components/product/StandardList';
import { StructuredData } from '@/components/seo/StructuredData';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { getPublicCaptchaConfig } from '@/config';
import { isApiNotFound } from '@/lib/api/errors';
import { getProduct } from '@/lib/api/products';
import { getDictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';
import { buildBreadcrumbStructuredData, buildProductStructuredData } from '@/lib/structured-data';

const dictionary = getDictionary('en');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    const featured = product.media.find((item) => item.media_id === product.featured_image_id);
    return buildMetadata('products.detail', {
      title: product.seo_title ?? product.name,
      description: product.seo_description ?? product.short_description,
      params: { slug },
      canonical: product.canonical,
      indexable: product.robots === 'index,follow',
      ...(featured === undefined ? {} : { featuredImage: featured.public_url }),
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    return <ProductDetail product={await getProduct(slug)} />;
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

function ProductDetail({ product }: { product: ProductDetailView }) {
  const quoteLabel = dictionary.products.requestQuoteFor.replace('{product}', product.name);
  const visibleShortDescription = isDemoCopy(product.short_description)
    ? null
    : product.short_description;
  const captcha = getPublicCaptchaConfig();
  const source = {
    kind: 'product' as const,
    slug: product.slug,
    label: product.name,
    sourceUrl: routePath('products.detail', { params: { slug: product.slug } }),
  };
  const origin = new URL(product.canonical).origin;
  const breadcrumbItems = [
    { label: dictionary.products.home, href: routePath('home') },
    { label: dictionary.products.products, href: routePath('products.landing') },
    { label: product.name },
  ];
  const breadcrumbData = buildBreadcrumbStructuredData([
    { name: dictionary.products.home, url: new URL(routePath('home'), origin).toString() },
    {
      name: dictionary.products.products,
      url: new URL(routePath('products.landing'), origin).toString(),
    },
    { name: product.name, url: product.canonical },
  ]);

  return (
    <div className="pb-24 lg:pb-0">
      <StructuredData values={[buildProductStructuredData(product), breadcrumbData]} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Breadcrumb items={breadcrumbItems} label={dictionary.products.breadcrumb} />
      </div>

      <article className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,.95fr)]">
          <ProductGallery
            productName={product.name}
            featuredImageId={product.featured_image_id}
            media={product.media}
            dictionary={dictionary}
          />

          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-800">
              {dictionary.products.detailLabel}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              {product.name}
            </h1>
            {product.model === null ? null : (
              <p className="mt-3 text-lg font-semibold text-slate-700">
                {dictionary.products.modelLabel}: {product.model}
              </p>
            )}
            <p className="mt-3 text-sm text-slate-600">
              {dictionary.products.brandLabel}:{' '}
              <Link
                className="font-semibold underline underline-offset-2"
                href={routePath('products.all', { query: { brand: product.brand.slug } })}
              >
                {product.brand.name}
              </Link>
            </p>
            {product.standards.length === 0 ? null : (
              <div
                className="mt-5 flex flex-wrap gap-2"
                aria-label={dictionary.products.standardsTitle}
              >
                {product.standards.slice(0, 4).map((standard) => (
                  <Link
                    key={standard.slug}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-900 no-underline"
                    href={routePath('products.standard', { params: { slug: standard.slug } })}
                  >
                    {standard.organization} {standard.code}
                  </Link>
                ))}
              </div>
            )}
            {visibleShortDescription === null ? null : (
              <p className="mt-6 text-lg leading-8 text-slate-700">{visibleShortDescription}</p>
            )}
            {product.discontinued ? (
              <div className="mt-6">
                <DiscontinuedNotice related={product.related} dictionary={dictionary} />
              </div>
            ) : null}

            <div className="mt-7 hidden flex-wrap items-center gap-3 lg:flex">
              <InquiryLauncher
                className="inline-flex rounded-lg bg-blue-800 px-6 py-3 font-bold text-white no-underline hover:bg-blue-900"
                locale="en"
                dictionary={dictionary}
                captcha={captcha}
                label={dictionary.products.requestQuote}
                ariaLabel={quoteLabel}
                source={source}
              />
              <Link
                className="inline-flex rounded-lg border border-slate-300 bg-white px-6 py-3 font-bold text-slate-800 no-underline transition hover:border-blue-300 hover:bg-blue-50"
                href={routePath('contact')}
              >
                {dictionary.home.contactAction}
              </Link>
            </div>
          </div>
        </div>

        <ProductSectionNavigation product={product} />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
          <div className="min-w-0 space-y-12">
            <ProductContentSection
              id="overview"
              title={dictionary.products.overviewTitle}
              blocks={product.overview}
              media={product.media}
            />
            <ProductContentSection
              id="features"
              title={dictionary.products.featuresTitle}
              blocks={product.features}
              media={product.media}
            />
            <ProductContentSection
              id="applications"
              title={dictionary.products.applicationsTitle}
              blocks={product.applications_text}
              media={product.media}
            />
            <ProductContentSection
              id="principle"
              title={dictionary.products.principleTitle}
              blocks={product.principle}
              media={product.media}
            />
            <ProductContentSection
              id="sample-types"
              title={dictionary.products.sampleTypesTitle}
              blocks={product.sample_types}
              media={product.media}
            />
            <ProductContentSection
              id="operating-conditions"
              title={dictionary.products.operatingConditionsTitle}
              blocks={product.operating_conditions}
              media={product.media}
            />
            <ProductContentSection
              id="accessories"
              title={dictionary.products.accessoriesOptionsTitle}
              blocks={product.accessories_options}
              media={product.media}
            />
            {/*
              Hai muc nay THU GON MAC DINH — xem `CollapsibleSection`.
              Chung la phan "tra cuu sau": mot may that co the co 40+ dong thong
              so va 25+ tieu chuan, do het ra thi phan gioi thieu va tinh nang o
              tren bi day qua xa tam mat.
            */}
            {product.specifications.length === 0 ? null : (
              <CollapsibleSection
                id="specifications"
                title={dictionary.products.specificationsTitle}
                hint={dictionary.products.specificationsHint.replace(
                  '{count}',
                  String(product.specifications.length),
                )}
              >
                <SpecificationTable
                  specifications={product.specifications}
                  dictionary={dictionary}
                />
              </CollapsibleSection>
            )}
            {product.standards.length === 0 ? null : (
              <CollapsibleSection
                id="standards"
                title={dictionary.products.standardsTitle}
                hint={dictionary.products.standardsHint.replace(
                  '{count}',
                  String(product.standards.length),
                )}
              >
                <StandardList standards={product.standards} dictionary={dictionary} />
              </CollapsibleSection>
            )}
          </div>

          <aside className="space-y-8 lg:border-l lg:border-slate-200 lg:pl-8">
            <section className="rounded-2xl bg-slate-950 p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">
                {dictionary.home.servicesTitle}
              </p>
              <h2 className="mt-3 text-xl font-bold">{dictionary.home.contactTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {dictionary.home.contactDescription}
              </p>
              <Link
                className="mt-5 inline-flex font-bold text-cyan-300 no-underline"
                href={routePath('contact')}
              >
                {dictionary.home.contactAction}{' '}
                <span className="ml-2" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </section>
            <TaxonList
              title={dictionary.products.categoriesTitle}
              items={product.categories}
              href={(item) => routePath('products.category', { params: { slug: item.slug } })}
            />
            <TaxonList
              title={dictionary.products.applicationsTitle}
              items={product.applications}
              href={(item) => routePath('products.application', { params: { slug: item.slug } })}
            />
            <TaxonList
              title={dictionary.products.industriesTitle}
              items={product.industries}
              href={(item) => routePath('products.all', { query: { industry: item.slug } })}
            />
          </aside>
        </div>

        <div className="mt-14">
          <RelatedProducts related={product.related} dictionary={dictionary} />
        </div>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3 shadow-2xl lg:hidden">
        <Link
          className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-sm font-bold text-slate-800 no-underline"
          href={routePath('contact')}
        >
          {dictionary.home.contactAction}
        </Link>
        <InquiryLauncher
          className="block rounded-lg bg-blue-800 px-3 py-3 text-center text-sm font-bold text-white no-underline"
          locale="en"
          dictionary={dictionary}
          captcha={captcha}
          label={dictionary.products.requestQuote}
          ariaLabel={quoteLabel}
          source={source}
        />
      </div>
    </div>
  );
}

function ProductContentSection({
  id,
  title,
  blocks,
  media,
}: {
  id: string;
  title: string;
  blocks: readonly ContentBlock[];
  media: ProductDetailView['media'];
}) {
  const content = (blocks[0]?.type === 'heading' ? blocks.slice(1) : blocks).filter(
    (block) => !blockContainsDemoCopy(block),
  );
  if (content.length === 0) return null;
  return (
    <section id={id} className="scroll-mt-32">
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <div className="mt-5">
        <ContentBlocks blocks={content} media={media} />
      </div>
    </section>
  );
}

function ProductSectionNavigation({ product }: { product: ProductDetailView }) {
  const sections = [
    {
      id: 'overview',
      label: dictionary.products.overviewTitle,
      visible: hasVisibleProductContent(product.overview),
    },
    {
      id: 'features',
      label: dictionary.products.featuresTitle,
      visible: hasVisibleProductContent(product.features),
    },
    {
      id: 'applications',
      label: dictionary.products.applicationsTitle,
      visible: hasVisibleProductContent(product.applications_text),
    },
    {
      id: 'specifications',
      label: dictionary.products.specificationsTitle,
      visible: product.specifications.length > 0,
    },
    {
      id: 'standards',
      label: dictionary.products.standardsTitle,
      visible: product.standards.length > 0,
    },
  ].filter((section) => section.visible);

  if (sections.length < 2) return null;
  return (
    <nav
      className="sticky top-18 z-20 mt-12 overflow-x-auto border-y border-slate-200 bg-white/95 py-3 backdrop-blur"
      aria-label={dictionary.products.detailLabel}
    >
      <ul className="flex min-w-max items-center gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              className="inline-flex rounded-full px-4 py-2 text-sm font-bold text-slate-700 no-underline transition hover:bg-blue-50 hover:text-blue-900"
              href={`#${section.id}`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TaxonList({
  title,
  items,
  href,
}: {
  title: string;
  items: readonly ProductTaxonView[];
  href: (item: ProductTaxonView) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              className="inline-block rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium no-underline"
              href={href(item)}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function isDemoCopy(value: string | null): boolean {
  return value !== null && /\bdemo\b|khong dung|van ban demo/i.test(value);
}

function hasVisibleProductContent(blocks: readonly ContentBlock[]): boolean {
  const content = blocks[0]?.type === 'heading' ? blocks.slice(1) : blocks;
  return content.some((block) => !blockContainsDemoCopy(block));
}

function blockContainsDemoCopy(block: ContentBlock): boolean {
  switch (block.type) {
    case 'heading':
      return isDemoCopy(block.text);
    case 'paragraph':
      return block.spans.some((span) => isDemoCopy(span.text));
    case 'list':
      return block.items.some((item) => item.spans.some((span) => isDemoCopy(span.text)));
    case 'image':
      return isDemoCopy(block.caption ?? null) || isDemoCopy(block.alt ?? null);
    case 'gallery':
      return block.items.some((item) => isDemoCopy(item.caption ?? null));
    case 'table':
      return [...block.headers, ...block.rows.flat()].some((value) => isDemoCopy(value));
    case 'external_video':
      return isDemoCopy(block.title) || isDemoCopy(block.caption ?? null);
    case 'file':
      return isDemoCopy(block.label ?? null);
    case 'callout':
      return isDemoCopy(block.title ?? null) || block.spans.some((span) => isDemoCopy(span.text));
    case 'divider':
      return false;
  }
}
