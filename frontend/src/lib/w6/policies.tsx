import type { Locale, PageDetailView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { getPage } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import { localizedRouteAlternates } from '@/lib/localized-content';
import { routePath, type RouteKey } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

export type PolicyKind = 'privacy-policy' | 'terms-of-use' | 'cookie-policy';

const POLICIES: Readonly<
  Record<
    PolicyKind,
    {
      readonly route: RouteKey;
      readonly pageType: string;
      readonly slug: Readonly<Record<Locale, string>>;
    }
  >
> = {
  'privacy-policy': {
    route: 'privacy-policy',
    pageType: 'privacy_policy',
    slug: { en: 'privacy-policy', vi: 'privacy-policy-vi' },
  },
  'terms-of-use': {
    route: 'terms-of-use',
    pageType: 'terms_of_use',
    slug: { en: 'terms-of-use', vi: 'terms-of-use-vi' },
  },
  'cookie-policy': {
    route: 'cookie-policy',
    pageType: 'cookie_policy',
    slug: { en: 'cookie-policy', vi: 'cookie-policy-vi' },
  },
};

export async function policyMetadata(kind: PolicyKind, locale: Locale): Promise<Metadata> {
  const policy = POLICIES[kind];
  try {
    const page = await getPolicyPage(policy, locale);
    return buildMetadata(policy.route, {
      title: page.seo_title ?? page.title,
      description: page.seo_description ?? page.summary,
      locale,
      canonical: page.canonical,
      indexable: page.robots === 'index,follow',
      hreflangAlternates: page.hreflang_alternates,
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderPolicyPage(kind: PolicyKind, locale: Locale) {
  const policy = POLICIES[kind];
  const dictionary = getDictionary(locale);
  try {
    const page = await getPolicyPage(policy, locale);
    const blocks = page.content[0]?.type === 'heading' ? page.content.slice(1) : page.content;
    return (
      <div>
        <ContentPageHeader
          title={page.title}
          description={page.summary}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            { label: page.title },
          ]}
          locale={locale}
          alternates={page.hreflang_alternates}
          fallbacks={Object.fromEntries(
            localizedRouteAlternates(policy.route).map((alternate) => [
              alternate.locale,
              alternate.url,
            ]),
          )}
          dictionary={dictionary}
        />
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          {blocks.length === 0 ? null : <ContentBlocks blocks={blocks} />}
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

async function getPolicyPage(
  policy: (typeof POLICIES)[PolicyKind],
  locale: Locale,
): Promise<PageDetailView> {
  const page = await getPage(policy.slug[locale], locale);
  if (page.page_type !== policy.pageType) notFound();
  return page;
}
