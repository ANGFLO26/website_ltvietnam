import Link from 'next/link';
import type { ReactNode } from 'react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductSearchForm } from '@/components/product/ProductSearchForm';
import { getProductLanding } from '@/lib/api/products';
import { getDictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export const metadata = buildMetadata('products.landing', {
  title: dictionary.products.catalogueTitle,
  description: dictionary.products.catalogueDescription,
});

export default async function ProductsLandingPage() {
  const landing = await getProductLanding();
  return (
    <div>
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div className="technical-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="hero-glow absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-20">
          <div>
            <p className="section-kicker text-cyan-300">{dictionary.products.catalogueTitle}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              {dictionary.products.finderTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              {dictionary.products.catalogueDescription}
            </p>
            <ProductSearchForm dictionary={dictionary} dark className="mt-8 max-w-2xl" />
          </div>

          <aside className="rounded-3xl border border-white/15 bg-white/[.07] p-6 backdrop-blur sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
              {dictionary.products.finderEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold">{dictionary.products.finderPathsTitle}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FinderLink
                number="01"
                label={dictionary.products.categoryFilter}
                href="#featured-categories"
              />
              <FinderLink
                number="02"
                label={dictionary.products.applicationFilter}
                href="#featured-applications"
              />
              <FinderLink
                number="03"
                label={dictionary.products.standardFilter}
                href="#featured-standards"
              />
              <FinderLink
                number="04"
                label={dictionary.products.brandFilter}
                href="#featured-brands"
              />
            </div>
            <Link
              className="mt-6 inline-flex items-center gap-2 font-bold text-cyan-300 no-underline"
              href={routePath('products.all')}
            >
              {dictionary.products.browseAll} <span aria-hidden="true">&rarr;</span>
            </Link>
          </aside>
        </div>
      </header>

      <LandingSection
        id="featured-categories"
        eyebrow={dictionary.products.categoryFilter}
        title={dictionary.products.featuredCategories}
        description={dictionary.products.categoriesDescription}
      >
        {landing.featured_categories.map((category, index) => (
          <DiscoveryCard
            key={category.slug}
            number={`0${index + 1}`}
            title={category.name}
            description={cleanCopy(category.short_description)}
            href={routePath('products.category', { params: { slug: category.slug } })}
          />
        ))}
      </LandingSection>

      <LandingSection
        id="featured-applications"
        eyebrow={dictionary.products.applicationFilter}
        title={dictionary.products.featuredApplications}
        description={dictionary.products.applicationsDescription}
        muted
      >
        {landing.featured_applications.map((application, index) => (
          <DiscoveryCard
            key={application.slug}
            number={`0${index + 1}`}
            title={application.name}
            href={routePath('products.application', { params: { slug: application.slug } })}
          />
        ))}
      </LandingSection>

      <LandingSection
        id="featured-standards"
        eyebrow={dictionary.products.standardFilter}
        title={dictionary.products.featuredStandards}
        description={dictionary.products.standardsDescription}
      >
        {landing.featured_standards.map((standard) => (
          <DiscoveryCard
            key={standard.slug}
            number={standard.organization}
            title={`${standard.organization} ${standard.code}`}
            description={standard.name}
            href={routePath('products.standard', { params: { slug: standard.slug } })}
          />
        ))}
      </LandingSection>

      <LandingSection
        id="featured-brands"
        eyebrow={dictionary.products.brandFilter}
        title={dictionary.products.featuredBrands}
        description={dictionary.products.brandsDescription}
        muted
      >
        {landing.featured_brands.map((brand) => (
          <DiscoveryCard
            key={brand.slug}
            number={brand.country_code ?? 'LT'}
            title={brand.name}
            href={routePath('brands.detail', { params: { slug: brand.slug } })}
          />
        ))}
      </LandingSection>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            eyebrow={dictionary.products.featuredProducts}
            title={dictionary.products.selectedEquipmentTitle}
            description={dictionary.products.selectedEquipmentDescription}
            action={<Link href={routePath('products.all')}>{dictionary.common.viewAll}</Link>}
          />
          <div className="mt-8">
            <ProductGrid products={landing.featured_products.slice(0, 6)} dictionary={dictionary} />
          </div>
        </div>
      </section>

      <section className="bg-blue-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="section-kicker text-cyan-300">
              {dictionary.products.consultationEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold">{dictionary.products.consultationTitle}</h2>
            <p className="mt-3 max-w-2xl text-blue-100">
              {dictionary.products.consultationDescription}
            </p>
          </div>
          <Link
            className="rounded-xl bg-white px-6 py-3.5 text-center font-bold text-blue-900 no-underline"
            href={routePath('contact')}
          >
            {dictionary.home.contactAction}
          </Link>
        </div>
      </section>
    </div>
  );
}

function FinderLink({ number, label, href }: { number: string; label: string; href: string }) {
  return (
    <Link
      className="group rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-white no-underline transition hover:border-cyan-300/50 hover:bg-slate-900"
      href={href}
    >
      <span className="text-xs font-black text-cyan-300">{number}</span>
      <span className="mt-5 flex items-center justify-between gap-3 font-bold">
        {label}
        <span className="transition group-hover:translate-x-1" aria-hidden="true">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

function DiscoveryCard({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description?: string | null;
  href: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,76,129,.12)]">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-800">{number}</span>
      <h3 className="mt-8 text-xl font-bold tracking-tight text-slate-950">{title}</h3>
      {description === undefined || description === null ? null : (
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{description}</p>
      )}
      <Link
        className="mt-6 flex items-center justify-between font-bold text-[var(--color-primary)] no-underline"
        href={href}
      >
        {dictionary.common.viewDetails}
        <span className="transition group-hover:translate-x-1" aria-hidden="true">
          &rarr;
        </span>
      </Link>
    </article>
  );
}

function LandingSection({
  id,
  eyebrow,
  title,
  description,
  muted = false,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-24 ${muted ? 'bg-slate-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
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
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{description}</p>
      </div>
      {action === undefined ? null : (
        <div className="shrink-0 font-bold text-[var(--color-primary)] [&_a]:no-underline">
          {action}
        </div>
      )}
    </div>
  );
}

function cleanCopy(value: string | null): string | null {
  return value !== null && /\bdemo\b|khong dung|van ban demo/i.test(value) ? null : value;
}
