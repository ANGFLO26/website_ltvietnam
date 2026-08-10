import Link from 'next/link';
import type { Locale, ProjectCardView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function ProjectCard({
  project,
  locale,
  dictionary,
}: {
  project: ProjectCardView;
  locale: Locale;
  dictionary: Dictionary;
}) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
        {project.project_type}
      </p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">{project.title}</h2>
      {project.short_description === null ? null : (
        <p className="mt-3 text-sm leading-6 text-slate-600">{project.short_description}</p>
      )}
      {project.location_text === null ? null : (
        <p className="mt-3 text-sm text-slate-700">
          {dictionary.content.location}: {project.location_text}
        </p>
      )}
      <Link
        className="mt-auto pt-5 font-semibold"
        href={routePath('projects.detail', { locale, params: { slug: project.slug } })}
      >
        {dictionary.common.viewDetails}
      </Link>
    </article>
  );
}
