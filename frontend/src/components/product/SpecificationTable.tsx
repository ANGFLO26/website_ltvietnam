import { Fragment } from 'react';
import type { ProductSpecView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';

/**
 * Bang thong so ky thuat, GOM NHOM theo `group_key`.
 *
 * Truoc day `group_key` chi la mot cot: doc bang 40 dong voi cot dau lap di lap
 * lai "Operation, Operation, Operation..." rat kho quet mat. Du lieu that cua
 * 70Xe Series co 43 dong trai tren nhieu nhom (moi model con mot nhom), nen
 * nhom bang DONG TIEU DE thay cho mot cot lam bang ngan va de doc hon han.
 *
 * KHONG tu bao muc/tieu de: `CollapsibleSection` o trang chi tiet lo viec do.
 */
export function SpecificationTable({
  specifications,
  dictionary,
}: {
  specifications: readonly ProductSpecView[];
  dictionary: Dictionary;
}) {
  if (specifications.length === 0) return null;

  // Gom theo thu tu xuat hien — `display_order` da duoc backend sap xep san.
  const nhom: { key: string | null; rows: ProductSpecView[] }[] = [];
  for (const spec of specifications) {
    const key = spec.group_key === '' ? null : spec.group_key;
    const cuoi = nhom.at(-1);
    if (cuoi !== undefined && cuoi.key === key) cuoi.rows.push(spec);
    else nhom.push({ key, rows: [spec] });
  }
  const coNhom = nhom.some((g) => g.key !== null);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-[42rem] w-full border-collapse text-left">
        <thead className="bg-slate-100 text-sm text-slate-700">
          <tr>
            <th className="px-4 py-3">{dictionary.products.specificationParameter}</th>
            <th className="px-4 py-3">{dictionary.products.specificationValue}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {nhom.map((g, gi) => (
            <Fragment key={`${g.key ?? 'khong-nhom'}:${gi}`}>
              {g.key === null || !coNhom ? null : (
                <tr className="bg-slate-50">
                  <th
                    scope="colgroup"
                    colSpan={2}
                    className="px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-700"
                  >
                    {g.key}
                  </th>
                </tr>
              )}
              {g.rows.map((specification, index) => (
                <tr key={`${g.key}:${specification.label}:${index}`}>
                  <th scope="row" className="px-4 py-3 font-semibold text-slate-900">
                    {specification.label}
                  </th>
                  <td className="px-4 py-3 text-slate-700">
                    {[specification.value, specification.unit].filter(Boolean).join(' ')}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
