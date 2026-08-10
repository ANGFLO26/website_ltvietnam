import type { Locale, PostCategoryView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { PostCard } from '@/components/content/PostCard';
import { StructuredData } from '@/components/seo/StructuredData';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { getPost, getPostCategories, getPosts, getPostsByCategory } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import {
  detailLanguageFallbacks,
  detailPaginationHref,
  localizedRouteAlternates,
  pageNumber,
  paginationHref,
} from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';
import { buildArticleStructuredData, buildBreadcrumbStructuredData } from '@/lib/structured-data';

export function newsListMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('news.list', {
    title: dictionary.content.newsTitle,
    description: dictionary.content.newsDescription,
    locale,
    hreflangAlternates: localizedRouteAlternates('news.list'),
  });
}

export async function renderNewsList(
  locale: Locale,
  searchParams: Promise<{ page?: string | readonly string[] }>,
) {
  const dictionary = getDictionary(locale);
  const page = pageNumber((await searchParams).page);
  const [posts, categories] = await Promise.all([
    getPosts(locale, { page, page_size: 12 }),
    getPostCategories({ page_size: 100 }),
  ]);
  return (
    <div>
      <ContentPageHeader
        title={dictionary.content.newsTitle}
        description={dictionary.content.newsDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.content.newsTitle },
        ]}
        locale={locale}
        alternates={localizedRouteAlternates('news.list')}
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <CategoryNavigation categories={categories.data} locale={locale} />
        <div className="mt-8">
          {posts.data.length === 0 ? (
            <EmptyState
              title={dictionary.content.emptyTitle}
              message={dictionary.content.emptyMessage}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.data.map((post) => (
                <PostCard key={post.slug} post={post} locale={locale} dictionary={dictionary} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-8">
          <Pagination
            page={posts.meta.page}
            totalPages={posts.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(next) => paginationHref('news.list', locale, next)}
          />
        </div>
      </div>
    </div>
  );
}

export async function newsCategoryMetadata(
  locale: Locale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (category === null) notFound();
  return buildMetadata('news.category', {
    title: category.name,
    locale,
    params: { slug },
    hreflangAlternates: localizedRouteAlternates('news.category', { slug }),
  });
}

export async function renderNewsCategory(
  locale: Locale,
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ page?: string | readonly string[] }>,
) {
  const { slug } = await params;
  const dictionary = getDictionary(locale);
  const page = pageNumber((await searchParams).page);
  try {
    const [category, posts] = await Promise.all([
      findCategory(slug),
      getPostsByCategory(slug, locale, { page, page_size: 12 }),
    ]);
    if (category === null) notFound();
    return (
      <div>
        <ContentPageHeader
          title={category.name}
          description={dictionary.content.newsDescription}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.newsTitle,
              href: routePath('news.list', { locale }),
            },
            { label: category.name },
          ]}
          locale={locale}
          alternates={localizedRouteAlternates('news.category', { slug })}
          dictionary={dictionary}
        />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          {posts.data.length === 0 ? (
            <EmptyState
              title={dictionary.content.emptyTitle}
              message={dictionary.content.emptyMessage}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.data.map((post) => (
                <PostCard key={post.slug} post={post} locale={locale} dictionary={dictionary} />
              ))}
            </div>
          )}
          <div className="mt-8">
            <Pagination
              page={posts.meta.page}
              totalPages={posts.meta.total_pages}
              previousLabel={dictionary.common.previousPage}
              nextLabel={dictionary.common.nextPage}
              pageLabel={dictionary.common.paginationLabel}
              hrefForPage={(next) => detailPaginationHref('news.category', locale, slug, next)}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function postDetailMetadata(
  locale: Locale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPost(slug, locale);
    return buildMetadata('news.detail', {
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? post.excerpt,
      locale,
      params: { slug },
      canonical: post.canonical,
      indexable: post.robots === 'index,follow',
      hreflangAlternates: post.hreflang_alternates,
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderPostDetail(locale: Locale, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const dictionary = getDictionary(locale);
  try {
    const post = await getPost(slug, locale);
    const blocks = post.content[0]?.type === 'heading' ? post.content.slice(1) : post.content;
    const origin = new URL(post.canonical).origin;
    const breadcrumbData = buildBreadcrumbStructuredData([
      { name: dictionary.content.home, url: new URL(routePath('home'), origin).toString() },
      {
        name: dictionary.content.newsTitle,
        url: new URL(routePath('news.list', { locale }), origin).toString(),
      },
      { name: post.title, url: post.canonical },
    ]);
    return (
      <div>
        <StructuredData values={[buildArticleStructuredData(post), breadcrumbData]} />
        <ContentPageHeader
          title={post.title}
          description={post.excerpt}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.newsTitle,
              href: routePath('news.list', { locale }),
            },
            { label: post.title },
          ]}
          locale={locale}
          alternates={post.hreflang_alternates}
          fallbacks={detailLanguageFallbacks('news.list', locale)}
          dictionary={dictionary}
        />
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {post.category === null ? null : (
              <Link
                href={routePath('news.category', {
                  locale,
                  params: { slug: post.category.slug },
                })}
              >
                {post.category.name}
              </Link>
            )}
            {post.published_at === null ? null : (
              <span>
                {dictionary.content.publishedDate}: {formatDate(post.published_at, locale)}
              </span>
            )}
          </div>
          {blocks.length === 0 ? null : (
            <div className="mt-8">
              <ContentBlocks blocks={blocks} />
            </div>
          )}
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

function CategoryNavigation({
  categories,
  locale,
}: {
  categories: readonly PostCategoryView[];
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);
  if (categories.length === 0) return null;
  return (
    <nav aria-label={dictionary.content.newsCategories}>
      <ul className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              className="inline-block rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold no-underline"
              href={routePath('news.category', {
                locale,
                params: { slug: category.slug },
              })}
            >
              {category.name} ({category.post_count})
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

async function findCategory(slug: string): Promise<PostCategoryView | null> {
  const categories = await getPostCategories({ page_size: 100 });
  return categories.data.find((category) => category.slug === slug) ?? null;
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}
