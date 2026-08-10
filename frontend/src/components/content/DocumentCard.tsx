import Link from 'next/link';
import type { DocumentCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function DocumentCard({
  document,
  dictionary,
}: {
  document: DocumentCardView;
  dictionary: Dictionary;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
        {document.document_type}
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">{document.title}</h2>
      <p className="mt-3 text-sm text-slate-600">
        {document.is_public
          ? dictionary.content.publicDocument
          : dictionary.content.restrictedDocument}
      </p>
      <Link
        className="mt-auto pt-5 font-semibold"
        href={routePath('resources.detail', { params: { slug: document.slug } })}
      >
        {dictionary.common.viewDetails}
      </Link>
    </article>
  );
}
