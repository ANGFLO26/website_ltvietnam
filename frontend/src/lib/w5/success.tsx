import type { Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { localizedRouteAlternates } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

export function requestSuccessMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('request-success', {
    title: dictionary.inquiry.successTitle,
    description: dictionary.inquiry.successMessage,
    locale,
    hreflangAlternates: localizedRouteAlternates('request-success'),
  });
}

export function renderRequestSuccess(locale: Locale) {
  const dictionary = getDictionary(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <section className="rounded-xl border border-green-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-800">
          <span aria-hidden="true">✓</span>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950">
          {dictionary.inquiry.successTitle}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">{dictionary.inquiry.successMessage}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            className="rounded-lg bg-blue-800 px-5 py-3 font-bold text-white no-underline"
            href={routePath('home')}
          >
            {dictionary.inquiry.successBackHome}
          </Link>
          <Link
            className="rounded-lg border border-slate-300 px-5 py-3 font-bold no-underline"
            href={routePath('products.landing')}
          >
            {dictionary.inquiry.successProducts}
          </Link>
        </div>
      </section>
    </div>
  );
}
