import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function ProductSearchForm({
  dictionary,
  dark = false,
  className = '',
  defaultValue = '',
}: {
  dictionary: Dictionary;
  dark?: boolean;
  className?: string;
  defaultValue?: string;
}) {
  return (
    <form
      className={`rounded-2xl border p-2 shadow-xl ${
        dark
          ? 'border-white/15 bg-white/10 shadow-slate-950/20 backdrop-blur'
          : 'border-slate-200 bg-white shadow-slate-900/10'
      } ${className}`}
      action={routePath('products.all')}
      method="get"
      role="search"
    >
      <label className="sr-only" htmlFor="catalogue-search">
        {dictionary.products.searchLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <span className={dark ? 'text-cyan-300' : 'text-blue-800'} aria-hidden="true">
            <span className="search-icon" />
          </span>
          <input
            className={`min-h-12 min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-slate-400 ${
              dark ? 'text-white' : 'text-slate-950'
            }`}
            id="catalogue-search"
            name="q"
            defaultValue={defaultValue}
            placeholder={dictionary.products.searchPlaceholder}
          />
        </div>
        <button
          className={`min-h-12 rounded-xl px-6 font-bold transition hover:-translate-y-0.5 ${
            dark
              ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
              : 'bg-[var(--color-primary)] text-white hover:bg-blue-900'
          }`}
          type="submit"
        >
          {dictionary.products.searchAction}
        </button>
      </div>
    </form>
  );
}
