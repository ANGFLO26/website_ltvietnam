import type { Locale } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function SearchForm({
  locale,
  dictionary,
  defaultQuery = '',
}: {
  locale: Locale;
  dictionary: Dictionary;
  defaultQuery?: string;
}) {
  return (
    <form
      action={routePath('search', { locale })}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      method="get"
      role="search"
    >
      <div className="min-w-0 flex-1">
        <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="site-search">
          {dictionary.search.label}
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-950"
          defaultValue={defaultQuery}
          id="site-search"
          maxLength={120}
          minLength={2}
          name="q"
          placeholder={dictionary.search.placeholder}
          type="search"
        />
      </div>
      <button
        className="min-h-11 rounded-lg bg-blue-800 px-6 py-2 font-semibold text-white hover:bg-blue-900"
        type="submit"
      >
        {dictionary.search.submit}
      </button>
    </form>
  );
}
