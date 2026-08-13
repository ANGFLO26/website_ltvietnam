import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { HomeSectionView, HomeView, OfficeView } from '@ltv/contracts';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductSearchForm } from '@/components/product/ProductSearchForm';
import { Card } from '@/components/ui/Card';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function HomeSections({
  home,
  offices,
  dictionary,
}: {
  home: HomeView;
  offices: readonly OfficeView[];
  dictionary: Dictionary;
}) {
  return (
    <>
      {home.sections.map((section) => (
        <HomeSection
          key={`${section.section_type}:${section.display_order}`}
          section={section}
          home={home}
          offices={offices}
          dictionary={dictionary}
        />
      ))}
    </>
  );
}

function HomeSection({
  section,
  home,
  offices,
  dictionary,
}: {
  section: HomeSectionView;
  home: HomeView;
  offices: readonly OfficeView[];
  dictionary: Dictionary;
}) {
  const limit = sectionLimit(section);
  const common = {
    'data-section': section.section_type,
    'data-order': section.display_order,
  };

  switch (section.section_type) {
    case 'hero':
      return <HeroSection {...common} home={home} dictionary={dictionary} />;

    case 'company_intro':
      return (
        <section {...common} className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-18">
            <div>
              <p className="section-kicker">{dictionary.home.companyIntroTitle}</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {dictionary.home.companyIntroDescription}
              </h2>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6">
              <p className="text-base leading-7 text-slate-700">{dictionary.home.description}</p>
              <Link
                className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--color-primary)] no-underline"
                href={routePath('about', { locale: home.locale })}
              >
                {dictionary.content.aboutTitle} <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      );

    case 'business_areas':
      return <BusinessAreasSection {...common} home={home} dictionary={dictionary} limit={limit} />;

    case 'featured_categories':
      return (
        <CardSection
          {...common}
          muted
          eyebrow={dictionary.products.categoryFilter}
          title={dictionary.home.categoriesTitle}
          action={<Link href={routePath('products.all')}>{dictionary.layout.allProducts}</Link>}
        >
          {home.featured_categories.slice(0, Math.min(limit, 6)).map((category) => (
            <Card
              key={category.slug}
              title={category.name}
              description={cleanCopy(category.short_description)}
              href={routePath('products.category', { params: { slug: category.slug } })}
            />
          ))}
        </CardSection>
      );

    case 'featured_products':
      return (
        <section {...common} className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              eyebrow={dictionary.products.featuredProducts}
              title={dictionary.home.productsTitle}
              description={dictionary.products.catalogueDescription}
              action={<Link href={routePath('products.all')}>{dictionary.common.viewAll}</Link>}
            />
            <div className="mt-8">
              <ProductGrid
                products={home.featured_products.slice(0, Math.min(limit, 6))}
                dictionary={dictionary}
                headingLevel={3}
              />
            </div>
          </div>
        </section>
      );

    case 'featured_brands':
      return (
        <section {...common} className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <SectionHeading
              eyebrow={dictionary.products.brandFilter}
              title={dictionary.home.brandsTitle}
              description={dictionary.content.brandsDescription}
              action={<Link href={routePath('brands.list')}>{dictionary.common.viewAll}</Link>}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {home.featured_brands.slice(0, Math.min(limit, 6)).map((brand) => (
                <Link
                  key={brand.slug}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                  href={routePath('brands.detail', { params: { slug: brand.slug } })}
                >
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-950 text-base font-black tracking-wider text-white">
                    {initials(brand.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      {brand.country_code ?? dictionary.products.brandFilter}
                    </span>
                    <span className="mt-1 block text-lg font-bold">{brand.name}</span>
                  </span>
                  <span
                    className="text-xl text-blue-800 transition group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      );

    case 'services':
      return (
        <CardSection
          {...common}
          eyebrow={dictionary.content.servicesTitle}
          title={dictionary.home.servicesTitle}
          description={dictionary.content.servicesDescription}
          action={
            <Link href={routePath('services.list', { locale: home.locale })}>
              {dictionary.common.viewAll}
            </Link>
          }
        >
          {home.featured_services.slice(0, Math.min(limit, 6)).map((service, index) => (
            <Card
              key={service.slug}
              title={service.title}
              eyebrow={`0${index + 1}`}
              description={cleanCopy(service.short_description)}
              href={routePath('services.detail', {
                locale: home.locale,
                params: { slug: service.slug },
              })}
            />
          ))}
        </CardSection>
      );

    case 'capabilities':
      return (
        <section {...common} className="relative overflow-hidden bg-slate-950 text-white">
          <div className="technical-grid absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-20">
            <div>
              <p className="section-kicker text-cyan-300">{dictionary.home.capabilitiesTitle}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {dictionary.home.heroFallbackDescription}
              </h2>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                dictionary.home.capabilityOne,
                dictionary.home.capabilityTwo,
                dictionary.home.capabilityThree,
              ].map((capability, index) => (
                <li
                  key={capability}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur"
                >
                  <span className="text-sm font-black text-cyan-300">0{index + 1}</span>
                  <p className="mt-8 font-semibold leading-6 text-slate-100">{capability}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      );

    case 'projects':
      return (
        <CardSection
          {...common}
          muted
          eyebrow={dictionary.content.projectsTitle}
          title={dictionary.home.projectsTitle}
          description={dictionary.content.projectsDescription}
          action={
            <Link href={routePath('projects.list', { locale: home.locale })}>
              {dictionary.common.viewAll}
            </Link>
          }
        >
          {home.featured_projects.slice(0, Math.min(limit, 3)).map((project) => (
            <Card
              key={project.slug}
              title={project.title}
              eyebrow={project.project_type}
              description={cleanCopy(project.short_description)}
              href={routePath('projects.detail', {
                locale: home.locale,
                params: { slug: project.slug },
              })}
            >
              <p className="mt-4 text-sm font-medium text-slate-600">
                {project.customer_name ?? dictionary.home.confidentialCustomer}
              </p>
            </Card>
          ))}
        </CardSection>
      );

    case 'posts':
      return (
        <CardSection
          {...common}
          eyebrow={dictionary.content.newsTitle}
          title={dictionary.home.postsTitle}
          action={
            <Link href={routePath('news.list', { locale: home.locale })}>
              {dictionary.common.viewAll}
            </Link>
          }
        >
          {home.latest_posts.slice(0, Math.min(limit, 3)).map((post) => (
            <Card
              key={post.slug}
              title={post.title}
              eyebrow={post.category?.name}
              description={cleanCopy(post.excerpt)}
              href={routePath('news.detail', {
                locale: home.locale,
                params: { slug: post.slug },
              })}
            />
          ))}
        </CardSection>
      );

    case 'customers': {
      const customers = home.customers.filter((customer) => cleanCopy(customer.name) !== undefined);
      if (customers.length === 0) return <section {...common} hidden />;
      return (
        <section {...common} className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="section-kicker">{dictionary.home.customersTitle}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {dictionary.home.customersHeadline}
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {dictionary.home.customersDescription}
              </p>
            </div>
            <div className="mt-8 grid items-center justify-center gap-5">
              {customers.slice(0, Math.min(limit, 8)).map((customer) => (
                <figure
                  key={customer.name}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                  title={cleanCopy(customer.short_description)}
                >
                  <Image
                    src={customer.logo_url}
                    alt={customer.name}
                    width={1045}
                    height={241}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 1280px) 92vw, 1180px"
                  />
                  {cleanCopy(customer.short_description) === undefined ? null : (
                    <figcaption className="mt-4 text-center text-sm text-slate-600">
                      {customer.short_description}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case 'contact_call_to_action':
      return (
        <section {...common} className="bg-blue-900 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:py-16">
            <div>
              <p className="section-kicker text-cyan-300">{dictionary.home.contactAction}</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
                {dictionary.home.contactTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-blue-100">
                {dictionary.home.contactDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-xl bg-white px-5 py-3 font-bold text-blue-900 no-underline"
                href={routePath('contact', { locale: home.locale })}
              >
                {dictionary.home.contactAction}
              </Link>
              <Link
                className="rounded-xl border border-white/40 px-5 py-3 font-bold text-white no-underline"
                href={routePath('products.all')}
              >
                {dictionary.layout.allProducts}
              </Link>
            </div>
          </div>
        </section>
      );

    case 'offices': {
      const visibleOffices = offices.filter(
        (office) => cleanCopy(office.name) !== undefined && cleanCopy(office.address) !== undefined,
      );
      if (visibleOffices.length === 0) return <section {...common} hidden />;
      return (
        <CardSection
          {...common}
          muted
          eyebrow={dictionary.home.officesTitle}
          title={dictionary.home.officesTitle}
        >
          {visibleOffices.map((office) => (
            <Card
              key={`${office.office_type}:${office.name}`}
              title={office.name}
              eyebrow={office.office_type}
              description={office.address}
            >
              <OfficeContacts office={office} dictionary={dictionary} />
            </Card>
          ))}
        </CardSection>
      );
    }

    default:
      return null;
  }
}

function HeroSection({
  home,
  dictionary,
  ...attributes
}: {
  home: HomeView;
  dictionary: Dictionary;
  'data-section': string;
  'data-order': number;
}) {
  const quickLinks = businessAreas(home, dictionary);
  const banner = home.banners[0];
  const heroTitle = cleanCopy(banner?.title) ?? dictionary.home.heroFallbackTitle;
  const heroDescription = cleanCopy(banner?.subtitle) ?? dictionary.home.heroFallbackDescription;
  const desktopImage = banner?.image_url ?? null;
  const mobileImage = banner?.mobile_image_url ?? desktopImage;

  return (
    <section {...attributes} className="relative overflow-hidden bg-slate-950 text-white">
      {desktopImage === null ? null : (
        <Image
          className={
            mobileImage === desktopImage
              ? 'object-cover opacity-35'
              : 'hidden object-cover opacity-35 sm:block'
          }
          src={desktopImage}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      )}
      {mobileImage === null || mobileImage === desktopImage ? null : (
        <Image
          className="object-cover opacity-35 sm:hidden"
          src={mobileImage}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/45"
        aria-hidden="true"
      />
      <div className="technical-grid absolute inset-0 opacity-25" aria-hidden="true" />
      <div className="hero-glow absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-24">
        <div>
          <p className="section-kicker text-cyan-300">{dictionary.layout.companyDescriptor}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.035em] sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            {heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            {heroDescription}
          </p>
          {banner?.button_label === null ||
          banner?.button_label === undefined ||
          banner.url === null ? null : (
            <HeroBannerAction
              label={banner.button_label}
              url={banner.url}
              openNewTab={banner.open_new_tab}
            />
          )}
          <ProductSearchForm dictionary={dictionary} dark className="mt-8 max-w-2xl" />
        </div>

        <div className="relative rounded-3xl border border-white/15 bg-white/[.07] p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                {dictionary.home.chooseAreaTitle}
              </p>
              <p className="mt-2 text-xl font-bold">{dictionary.home.businessAreasTitle}</p>
            </div>
            <span className="grid size-14 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 font-black text-cyan-200">
              {dictionary.layout.brandShort.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <ol className="space-y-3">
            {quickLinks.map((item, index) => (
              <li key={item.href} className="rounded-2xl border border-white/10 bg-slate-950/50">
                <Link
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 p-4 text-white no-underline"
                  href={item.href}
                >
                  <span className="text-sm font-black text-cyan-300">0{index + 1}</span>
                  <span>
                    <strong className="block text-slate-100">{item.label}</strong>
                    <span className="mt-1 block text-sm leading-5 text-slate-400">
                      {item.description}
                    </span>
                  </span>
                  <span className="text-cyan-300" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Link
              className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 no-underline"
              href={routePath('products.landing')}
            >
              {dictionary.layout.productOverview}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BusinessAreasSection({
  home,
  dictionary,
  limit,
  ...attributes
}: {
  home: HomeView;
  dictionary: Dictionary;
  limit: number;
  'data-section': string;
  'data-order': number;
}) {
  const areas = businessAreas(home, dictionary).slice(0, Math.min(limit, 2));
  return (
    <section {...attributes} className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow={dictionary.home.chooseAreaTitle}
          title={dictionary.home.businessAreasTitle}
          description={dictionary.home.businessAreasDescription}
          action={
            <Link href={routePath('products.landing')}>{dictionary.layout.productOverview}</Link>
          }
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {areas.map((area, index) => (
            <Link
              key={area.href}
              href={area.href}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-7 text-white no-underline shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl sm:p-9"
            >
              <div className="technical-grid absolute inset-0 opacity-20" aria-hidden="true" />
              <div className="relative">
                <span className="text-sm font-black text-cyan-300">0{index + 1}</span>
                <h3 className="mt-8 text-2xl font-bold sm:text-3xl">{area.label}</h3>
                <p className="mt-3 max-w-xl leading-7 text-slate-300">{area.description}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-bold text-cyan-300">
                  {dictionary.common.viewDetails}
                  <span className="transition group-hover:translate-x-1" aria-hidden="true">
                    &rarr;
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function businessAreas(home: HomeView, dictionary: Dictionary) {
  const categories = new Map(home.featured_categories.map((item) => [item.slug, item]));
  return [
    {
      label: categories.get('laboratory-analysis')?.name ?? dictionary.home.laboratoryTitle,
      description: dictionary.home.laboratoryDescription,
      href: routePath('products.category', { params: { slug: 'laboratory-analysis' } }),
    },
    {
      label: categories.get('valves-flow-control')?.name ?? dictionary.home.valvesTitle,
      description: dictionary.home.valvesDescription,
      href: routePath('products.category', { params: { slug: 'valves-flow-control' } }),
    },
  ];
}

function HeroBannerAction({
  label,
  url,
  openNewTab,
}: {
  label: string;
  url: string;
  openNewTab: boolean;
}) {
  const className =
    'mt-7 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 no-underline shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-200';
  if (openNewTab || /^https?:\/\//i.test(url)) {
    return (
      <a
        className={className}
        href={url}
        {...(openNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {label}
      </a>
    );
  }
  return (
    <Link className={className} href={url}>
      {label}
    </Link>
  );
}

function CardSection({
  eyebrow,
  title,
  description,
  action,
  muted = false,
  children,
  ...attributes
}: {
  eyebrow: string;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  muted?: boolean;
  children: ReactNode;
  'data-section': string;
  'data-order': number;
}) {
  return (
    <section {...attributes} className={muted ? 'bg-slate-50' : 'bg-white'}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} action={action} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        {description === undefined ? null : (
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        )}
      </div>
      {action === undefined ? null : (
        <div className="shrink-0 font-bold text-[var(--color-primary)] [&_a]:no-underline">
          {action}
        </div>
      )}
    </div>
  );
}

function OfficeContacts({ office, dictionary }: { office: OfficeView; dictionary: Dictionary }) {
  return (
    <dl className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm">
      {office.phone === null ? null : (
        <div className="flex items-start justify-between gap-4">
          <dt className="font-semibold text-slate-500">{dictionary.home.officePhone}</dt>
          <dd className="text-right font-semibold">
            <a href={`tel:${office.phone}`}>{office.phone}</a>
          </dd>
        </div>
      )}
      {office.email === null ? null : (
        <div className="flex items-start justify-between gap-4">
          <dt className="font-semibold text-slate-500">{dictionary.home.officeEmail}</dt>
          <dd className="text-right font-semibold">
            <a href={`mailto:${office.email}`}>{office.email}</a>
          </dd>
        </div>
      )}
      {office.working_hours === null ? null : (
        <div className="flex items-start justify-between gap-4">
          <dt className="font-semibold text-slate-500">{dictionary.home.officeHours}</dt>
          <dd className="text-right">{office.working_hours}</dd>
        </div>
      )}
    </dl>
  );
}

function cleanCopy(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  return /\bdemo\b|khong dung|van ban demo/i.test(value) ? undefined : value;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function sectionLimit(section: HomeSectionView): number {
  const raw = section.settings.limit;
  return typeof raw === 'number' && Number.isInteger(raw) && raw > 0 ? Math.min(raw, 24) : 24;
}
