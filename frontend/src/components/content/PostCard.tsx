import Link from 'next/link';
import type { Locale, PostCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function PostCard({
  post,
  locale,
  dictionary,
}: {
  post: PostCardView;
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {post.category === null ? null : (
        <Link
          className="text-xs font-bold uppercase tracking-wide no-underline"
          href={routePath('news.category', {
            locale,
            params: { slug: post.category.slug },
          })}
        >
          {post.category.name}
        </Link>
      )}
      <h2 className="mt-2 text-xl font-bold text-slate-950">{post.title}</h2>
      {post.excerpt === null ? null : (
        <p className="mt-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
      )}
      {post.published_at === null ? null : (
        <p className="mt-3 text-xs text-slate-500">
          {dictionary.content.publishedDate}: {formatDate(post.published_at, locale)}
        </p>
      )}
      <Link
        className="mt-auto pt-5 font-semibold"
        href={routePath('news.detail', { locale, params: { slug: post.slug } })}
      >
        {dictionary.common.viewDetails}
      </Link>
    </article>
  );
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
