import type { Locale, PageDetailView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { getPage } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import { detailLanguageFallbacks } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const ABOUT_SLUG: Readonly<Record<Locale, string>> = {
  en: 'about-us',
  vi: 'about-us-vi',
};

export async function aboutMetadata(locale: Locale): Promise<Metadata> {
  try {
    const page = await getPage(ABOUT_SLUG[locale], locale);
    return pageMetadata('about', page, locale);
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderAbout(locale: Locale) {
  const dictionary = getDictionary(locale);
  try {
    const page = await getPage(ABOUT_SLUG[locale], locale);
    return (
      <TranslatedPage
        page={page}
        locale={locale}
        listTitle={dictionary.content.aboutTitle}
        listHref={routePath('about', { locale })}
        isLanding
      />
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function aboutDetailMetadata(
  locale: Locale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPage(slug, locale);
    if (isDedicatedSystemPage(page.page_type)) notFound();
    return pageMetadata('about.page', page, locale, slug);
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderAboutDetail(locale: Locale, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const dictionary = getDictionary(locale);
  try {
    const page = await getPage(slug, locale);
    if (isDedicatedSystemPage(page.page_type)) notFound();
    return (
      <TranslatedPage
        page={page}
        locale={locale}
        listTitle={dictionary.content.aboutTitle}
        listHref={routePath('about', { locale })}
      />
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

function TranslatedPage({
  page,
  locale,
  listTitle,
  listHref,
  isLanding = false,
}: {
  page: PageDetailView;
  locale: Locale;
  listTitle: string;
  listHref: string;
  isLanding?: boolean;
}) {
  const dictionary = getDictionary(locale);
  const blocks = page.content[0]?.type === 'heading' ? page.content.slice(1) : page.content;
  return (
    <div>
      <ContentPageHeader
        title={page.title}
        description={page.summary}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          ...(isLanding ? [] : [{ label: listTitle, href: listHref }]),
          { label: page.title },
        ]}
        locale={locale}
        alternates={page.hreflang_alternates}
        fallbacks={detailLanguageFallbacks('about', locale)}
        dictionary={dictionary}
      />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {blocks.length === 0 ? null : <ContentBlocks blocks={blocks} />}
      </article>
    </div>
  );
}

function pageMetadata(
  key: 'about' | 'about.page',
  page: PageDetailView,
  locale: Locale,
  slug?: string,
): Metadata {
  return buildMetadata(key, {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? page.summary,
    locale,
    ...(slug === undefined ? {} : { params: { slug } }),
    canonical: page.canonical,
    indexable: page.robots === 'index,follow',
    hreflangAlternates: page.hreflang_alternates,
  });
}

function isDedicatedSystemPage(pageType: string): boolean {
  return ['about', 'contact', 'privacy_policy', 'terms_of_use', 'cookie_policy'].includes(pageType);
}
