import type { Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentDetailSection } from '@/components/content/ContentDetailSection';
import { FaqSection } from '@/components/content/FaqSection';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { ServiceCard } from '@/components/content/ServiceCard';
import { InquiryLauncher } from '@/components/inquiry/InquiryLauncher';
import { StructuredData } from '@/components/seo/StructuredData';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { getPublicCaptchaConfig } from '@/config';
import { getService, getServices } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import {
  detailLanguageFallbacks,
  localizedRouteAlternates,
  pageNumber,
  paginationHref,
} from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';
import { buildBreadcrumbStructuredData, buildFaqStructuredData } from '@/lib/structured-data';

export function servicesListMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('services.list', {
    title: dictionary.content.servicesTitle,
    description: dictionary.content.servicesDescription,
    locale,
    hreflangAlternates: localizedRouteAlternates('services.list'),
  });
}

export async function renderServicesList(
  locale: Locale,
  searchParams: Promise<{ page?: string | readonly string[] }>,
) {
  const dictionary = getDictionary(locale);
  const page = pageNumber((await searchParams).page);
  const services = await getServices(locale, { page, page_size: 24 });
  return (
    <div>
      <ContentPageHeader
        title={dictionary.content.servicesTitle}
        description={dictionary.content.servicesDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.content.servicesTitle },
        ]}
        locale={locale}
        alternates={localizedRouteAlternates('services.list')}
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {services.data.length === 0 ? (
          <EmptyState
            title={dictionary.content.emptyTitle}
            message={dictionary.content.emptyMessage}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.data.map((service) => (
              <ServiceCard
                key={service.slug}
                service={service}
                locale={locale}
                dictionary={dictionary}
              />
            ))}
          </div>
        )}
        <div className="mt-8">
          <Pagination
            page={services.meta.page}
            totalPages={services.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(next) => paginationHref('services.list', locale, next)}
          />
        </div>
      </div>
    </div>
  );
}

export async function serviceDetailMetadata(
  locale: Locale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const service = await getService(slug, locale);
    return buildMetadata('services.detail', {
      title: service.seo_title ?? service.title,
      description: service.seo_description ?? service.short_description,
      locale,
      params: { slug },
      canonical: service.canonical,
      indexable: service.robots === 'index,follow',
      hreflangAlternates: service.hreflang_alternates,
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderServiceDetail(locale: Locale, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const dictionary = getDictionary(locale);
  try {
    const service = await getService(slug, locale);
    const captcha = getPublicCaptchaConfig();
    const origin = new URL(service.canonical).origin;
    const breadcrumbData = buildBreadcrumbStructuredData([
      { name: dictionary.content.home, url: new URL(routePath('home'), origin).toString() },
      {
        name: dictionary.content.servicesTitle,
        url: new URL(routePath('services.list', { locale }), origin).toString(),
      },
      { name: service.title, url: service.canonical },
    ]);
    return (
      <div>
        <StructuredData
          values={[breadcrumbData, buildFaqStructuredData(service.faq, service.canonical)]}
        />
        <ContentPageHeader
          title={service.title}
          description={service.short_description}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.servicesTitle,
              href: routePath('services.list', { locale }),
            },
            { label: service.title },
          ]}
          locale={locale}
          alternates={service.hreflang_alternates}
          fallbacks={detailLanguageFallbacks('services.list', locale)}
          dictionary={dictionary}
        />
        <article className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6">
          <ContentDetailSection
            title={dictionary.content.serviceOverview}
            blocks={service.overview}
          />
          <ContentDetailSection
            title={dictionary.content.customerProblems}
            blocks={service.customer_problems}
          />
          <ContentDetailSection
            title={dictionary.content.scopeOfWork}
            blocks={service.scope_of_work}
          />
          <ContentDetailSection title={dictionary.content.process} blocks={service.process} />
          <ContentDetailSection title={dictionary.content.benefits} blocks={service.benefits} />
          <FaqSection title={dictionary.content.faq} faq={service.faq} />
          <div className="border-t border-slate-200 pt-8">
            <InquiryLauncher
              className="inline-block rounded-lg bg-blue-800 px-5 py-3 font-bold text-white no-underline"
              locale={locale}
              dictionary={dictionary}
              captcha={captcha}
              label={dictionary.layout.requestQuote}
              inquiryType="technical_support"
              source={{
                kind: 'service',
                slug: service.slug,
                label: service.title,
                sourceUrl: routePath('services.detail', {
                  locale,
                  params: { slug: service.slug },
                }),
              }}
            />
          </div>
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}
