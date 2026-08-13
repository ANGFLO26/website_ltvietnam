import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { getDocument } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import { documentDownloadPath } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('vi');

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const document = await getDocument(slug);
    return buildMetadata('resources.detail', {
      title: document.title,
      description: document.description,
      params: { slug },
      canonical: document.canonical,
      indexable: document.robots === 'index,follow',
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const document = await getDocument(slug);
    return (
      <div>
        <ContentPageHeader
          title={document.title}
          description={document.description}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.resourcesTitle,
              href: routePath('resources.list'),
            },
            { label: document.title },
          ]}
          locale="vi"
          dictionary={dictionary}
        />
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <dl className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-slate-600">
                {dictionary.content.documentType}
              </dt>
              <dd className="mt-1 text-slate-950">{document.document_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-slate-600">
                {dictionary.content.publicDocument}
              </dt>
              <dd className="mt-1 text-slate-950">
                {document.is_public
                  ? dictionary.content.publicDocument
                  : dictionary.content.restrictedDocument}
              </dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-4">
            {document.is_public ? (
              <a
                className="inline-block rounded-lg bg-blue-800 px-5 py-3 font-bold text-white no-underline"
                href={documentDownloadPath(document.slug)}
              >
                {dictionary.content.downloadDocument}
              </a>
            ) : null}
            <Link className="self-center font-semibold" href={routePath('resources.list')}>
              {dictionary.content.backToList}
            </Link>
          </div>
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}
