import { projectsListMetadata, renderProjectsList } from '@/page-views/projects';

export const metadata = projectsListMetadata('en');

export default function EnglishProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderProjectsList('en', searchParams);
}
