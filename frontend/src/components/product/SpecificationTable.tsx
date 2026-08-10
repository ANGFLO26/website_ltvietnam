import type { ProductSpecView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';

export function SpecificationTable({
  specifications,
  dictionary,
}: {
  specifications: readonly ProductSpecView[];
  dictionary: Dictionary;
}) {
  if (specifications.length === 0) return null;

  return (
    <section aria-labelledby="product-specifications">
      <h2 id="product-specifications" className="text-2xl font-bold text-slate-950">
        {dictionary.products.specificationsTitle}
      </h2>
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[42rem] w-full border-collapse text-left">
          <thead className="bg-slate-100 text-sm text-slate-700">
            <tr>
              <th className="px-4 py-3">{dictionary.products.specificationGroup}</th>
              <th className="px-4 py-3">{dictionary.products.specificationParameter}</th>
              <th className="px-4 py-3">{dictionary.products.specificationValue}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {specifications.map((specification, index) => (
              <tr key={`${specification.group_key}:${specification.label}:${index}`}>
                <td className="px-4 py-3 text-sm font-medium text-slate-600">
                  {specification.group_key}
                </td>
                <th scope="row" className="px-4 py-3 font-semibold text-slate-900">
                  {specification.label}
                </th>
                <td className="px-4 py-3 text-slate-700">
                  {[specification.value, specification.unit].filter(Boolean).join(' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
