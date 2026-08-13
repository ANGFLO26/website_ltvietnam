import type { Locale, OfficeView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { ContactForm } from '@/components/inquiry/ContactForm';
import type { InquirySource } from '@/components/inquiry/InquiryForm';
import { getService } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getProduct } from '@/lib/api/products';
import { getOffices } from '@/lib/api/site';
import { getPublicCaptchaConfig } from '@/config';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { localizedRouteAlternates } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

type ContactSearchParams = Promise<{
  product?: string | readonly string[];
  service?: string | readonly string[];
}>;

export function contactMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('contact', {
    title: dictionary.inquiry.contactTitle,
    description: dictionary.inquiry.contactDescription,
    locale,
    hreflangAlternates: localizedRouteAlternates('contact'),
  });
}

export async function renderContactPage(locale: Locale, searchParams: ContactSearchParams) {
  const dictionary = getDictionary(locale);
  const query = await searchParams;
  const [offices, source] = await Promise.all([
    getOffices(),
    resolveSource(locale, single(query.product), single(query.service)),
  ]);
  const captcha = getPublicCaptchaConfig();

  return (
    <div>
      <ContentPageHeader
        title={dictionary.inquiry.contactTitle}
        description={dictionary.inquiry.contactDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.inquiry.contactTitle },
        ]}
        locale={locale}
        alternates={localizedRouteAlternates('contact')}
        dictionary={dictionary}
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-950">
            {source === undefined
              ? dictionary.inquiry.formTitle
              : source.kind === 'service'
                ? dictionary.inquiry.typeTechnicalSupport
                : dictionary.inquiry.quotationTitle}
          </h2>
          <div className="mt-6">
            <ContactForm
              locale={locale}
              dictionary={dictionary}
              captcha={captcha}
              source={source}
            />
          </div>
        </section>

        <aside>
          <h2 className="text-2xl font-bold text-slate-950">
            {dictionary.inquiry.contactInfoTitle}
          </h2>
          {offices.length === 0 ? (
            <p className="mt-4 text-slate-600">{dictionary.inquiry.noOffices}</p>
          ) : (
            <div className="mt-5 space-y-5">
              {offices.map((office) => (
                <OfficeCard
                  key={`${office.office_type}:${office.name}`}
                  office={office}
                  dictionary={dictionary}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

async function resolveSource(
  locale: Locale,
  productSlug: string | undefined,
  serviceSlug: string | undefined,
): Promise<InquirySource | undefined> {
  if (productSlug !== undefined) {
    try {
      const product = await getProduct(productSlug);
      return {
        kind: 'product',
        slug: product.slug,
        label: product.name,
        sourceUrl: routePath('products.detail', { params: { slug: product.slug } }),
      };
    } catch (error) {
      if (!isApiNotFound(error)) throw error;
    }
  }
  if (serviceSlug !== undefined) {
    try {
      const service = await getService(serviceSlug, locale);
      return {
        kind: 'service',
        slug: service.slug,
        label: service.title,
        sourceUrl: routePath('services.detail', {
          locale,
          params: { slug: service.slug },
        }),
      };
    } catch (error) {
      if (!isApiNotFound(error)) throw error;
    }
  }
  return undefined;
}

function OfficeCard({ office, dictionary }: { office: OfficeView; dictionary: Dictionary }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
        {office.office_type}
      </p>
      <h3 className="mt-1 text-lg font-bold text-slate-950">{office.name}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <OfficeDetail label={dictionary.inquiry.address} value={office.address} />
        <OfficeDetail label={dictionary.home.officePhone} value={office.phone} hrefPrefix="tel:" />
        <OfficeDetail
          label={dictionary.home.officeEmail}
          value={office.email}
          hrefPrefix="mailto:"
        />
        <OfficeDetail label={dictionary.inquiry.workingHours} value={office.working_hours} />
      </dl>
      {office.map_url === null ? null : (
        <a
          className="mt-4 inline-block font-semibold"
          href={office.map_url}
          target="_blank"
          rel="noreferrer"
        >
          {dictionary.inquiry.viewMap}
        </a>
      )}
    </article>
  );
}

function OfficeDetail({
  label,
  value,
  hrefPrefix,
}: {
  label: string;
  value: string | null;
  hrefPrefix?: 'tel:' | 'mailto:';
}) {
  if (value === null) return null;
  return (
    <div>
      <dt className="font-semibold text-slate-700">{label}</dt>
      <dd className="mt-0.5 text-slate-600">
        {hrefPrefix === undefined ? value : <a href={`${hrefPrefix}${value}`}>{value}</a>}
      </dd>
    </div>
  );
}

function single(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}
