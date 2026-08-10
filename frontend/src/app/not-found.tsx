import Link from 'next/link';
import { SearchForm } from '@/components/search/SearchForm';
import { getDictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export default function NotFoundPage() {
  const dictionary = getDictionary('en');
  return (
    <section className="mx-auto max-w-3xl px-6 py-20" aria-labelledby="not-found-title">
      <h1 id="not-found-title" className="text-3xl font-bold">
        {dictionary.errors.notFoundTitle}
      </h1>
      <p className="mt-4 text-slate-700">{dictionary.errors.notFoundMessage}</p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <SearchForm locale="en" dictionary={dictionary} />
      </div>
      <div className="mt-8 flex flex-wrap gap-5">
        <Link className="font-semibold" href={routePath('home')}>
          {dictionary.common.backHome}
        </Link>
        <Link className="font-semibold" href={routePath('products.landing')}>
          {dictionary.search.browseProducts}
        </Link>
      </div>
    </section>
  );
}
