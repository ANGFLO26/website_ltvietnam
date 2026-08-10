import Link from 'next/link';
import type { ProductStandardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function StandardList({
  standards,
  dictionary,
}: {
  standards: readonly ProductStandardView[];
  dictionary: Dictionary;
}) {
  if (standards.length === 0) return null;
  return (
    <section aria-labelledby="product-standards">
      <h2 id="product-standards" className="text-2xl font-bold text-slate-950">
        {dictionary.products.standardsTitle}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {standards.map((standard) => (
          <li className="rounded-lg border border-slate-200 bg-white p-4" key={standard.slug}>
            <Link
              className="font-bold no-underline"
              href={routePath('products.standard', { params: { slug: standard.slug } })}
            >
              {standard.organization} {standard.code}
            </Link>
            {standard.name === null ? null : (
              <p className="mt-1 text-sm text-slate-600">{standard.name}</p>
            )}
            {standard.note === null ? null : (
              <p className="mt-2 text-sm text-slate-700">{standard.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
