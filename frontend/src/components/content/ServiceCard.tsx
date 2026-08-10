import Link from 'next/link';
import type { Locale, ServiceCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function ServiceCard({
  service,
  locale,
  dictionary,
}: {
  service: ServiceCardView;
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{service.title}</h2>
      {service.short_description === null ? null : (
        <p className="mt-3 text-sm leading-6 text-slate-600">{service.short_description}</p>
      )}
      <Link
        className="mt-auto pt-5 font-semibold"
        href={routePath('services.detail', { locale, params: { slug: service.slug } })}
      >
        {dictionary.common.viewDetails}
      </Link>
    </article>
  );
}
