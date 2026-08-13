import { projectsListMetadata, renderProjectsList } from '@/page-views/projects';

export const metadata = projectsListMetadata('vi');

export default function VietnameseProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderProjectsList('vi', searchParams);
}
