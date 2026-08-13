import type { Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentDetailSection } from '@/components/content/ContentDetailSection';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { ProjectCard } from '@/components/content/ProjectCard';
import { StructuredData } from '@/components/seo/StructuredData';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { getProject, getProjects } from '@/lib/api/content';
import { isApiNotFound } from '@/lib/api/errors';
import { getDictionary } from '@/lib/i18n';
import {
  detailLanguageFallbacks,
  localizedRouteAlternates,
  pageNumber,
  paginationHref,
} from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';
import { buildBreadcrumbStructuredData } from '@/lib/structured-data';

export function projectsListMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('projects.list', {
    title: dictionary.content.projectsTitle,
    description: dictionary.content.projectsDescription,
    locale,
    hreflangAlternates: localizedRouteAlternates('projects.list'),
  });
}

export async function renderProjectsList(
  locale: Locale,
  searchParams: Promise<{ page?: string | readonly string[] }>,
) {
  const dictionary = getDictionary(locale);
  const page = pageNumber((await searchParams).page);
  const projects = await getProjects(locale, { page, page_size: 24 });
  return (
    <div>
      <ContentPageHeader
        title={dictionary.content.projectsTitle}
        description={dictionary.content.projectsDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.content.projectsTitle },
        ]}
        locale={locale}
        alternates={localizedRouteAlternates('projects.list')}
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {projects.data.length === 0 ? (
          <EmptyState
            title={dictionary.content.emptyTitle}
            message={dictionary.content.emptyMessage}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.data.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                locale={locale}
                dictionary={dictionary}
              />
            ))}
          </div>
        )}
        <div className="mt-8">
          <Pagination
            page={projects.meta.page}
            totalPages={projects.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(next) => paginationHref('projects.list', locale, next)}
          />
        </div>
      </div>
    </div>
  );
}

export async function projectDetailMetadata(
  locale: Locale,
  params: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const project = await getProject(slug, locale);
    return buildMetadata('projects.detail', {
      title: project.seo_title ?? project.title,
      description: project.seo_description ?? project.short_description,
      locale,
      params: { slug },
      canonical: project.canonical,
      indexable: project.robots === 'index,follow',
      hreflangAlternates: project.hreflang_alternates,
    });
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

export async function renderProjectDetail(locale: Locale, params: Promise<{ slug: string }>) {
  const { slug } = await params;
  const dictionary = getDictionary(locale);
  try {
    const project = await getProject(slug, locale);
    const origin = new URL(project.canonical).origin;
    const breadcrumbData = buildBreadcrumbStructuredData([
      { name: dictionary.content.home, url: new URL(routePath('home'), origin).toString() },
      {
        name: dictionary.content.projectsTitle,
        url: new URL(routePath('projects.list', { locale }), origin).toString(),
      },
      { name: project.title, url: project.canonical },
    ]);
    return (
      <div>
        <StructuredData values={[breadcrumbData]} />
        <ContentPageHeader
          title={project.title}
          description={project.short_description}
          breadcrumbs={[
            { label: dictionary.content.home, href: routePath('home') },
            {
              label: dictionary.content.projectsTitle,
              href: routePath('projects.list', { locale }),
            },
            { label: project.title },
          ]}
          locale={locale}
          alternates={project.hreflang_alternates}
          fallbacks={detailLanguageFallbacks('projects.list', locale)}
          dictionary={dictionary}
        />
        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <dl className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
            <ProjectFact label={dictionary.content.projectType} value={project.project_type} />
            <ProjectFact
              label={dictionary.content.location}
              value={project.location_text ?? project.country_code}
            />
            <ProjectFact
              label={dictionary.content.completedDate}
              value={formatDate(project.completed_at, locale)}
            />
            <ProjectFact
              label={dictionary.content.customer}
              value={project.customer_name ?? dictionary.content.confidentialCustomer}
            />
          </dl>
          <div className="mt-12 space-y-12">
            <ContentDetailSection
              title={dictionary.content.scopeOfWork}
              blocks={project.scope_of_work}
            />
            <ContentDetailSection
              title={dictionary.content.implementation}
              blocks={project.implementation}
            />
            <ContentDetailSection title={dictionary.content.result} blocks={project.result} />
          </div>
        </article>
      </div>
    );
  } catch (error) {
    if (isApiNotFound(error)) notFound();
    throw error;
  }
}

function ProjectFact({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="mt-1 text-slate-950">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null, locale: Locale): string | null {
  if (value === null) return null;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}
