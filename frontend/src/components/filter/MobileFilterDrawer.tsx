import type { FilterProps } from './FilterSidebar';
import { FilterSidebar } from './FilterSidebar';

export function MobileFilterDrawer(props: FilterProps) {
  return (
    <details className="mb-5 rounded-xl border border-slate-200 bg-white lg:hidden">
      <summary className="cursor-pointer px-5 py-4 font-semibold">
        {props.dictionary.products.openFilters}
      </summary>
      <div className="border-t border-slate-200 p-3">
        <FilterSidebar {...props} />
      </div>
    </details>
  );
}
