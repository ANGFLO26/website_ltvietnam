import { projectsListMetadata, renderProjectsList } from '@/lib/w4/projects';

export const metadata = projectsListMetadata('en');

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderProjectsList('en', searchParams);
}
