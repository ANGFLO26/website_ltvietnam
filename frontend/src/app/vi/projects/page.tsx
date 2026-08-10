import { projectsListMetadata, renderProjectsList } from '@/lib/w4/projects';

export const metadata = projectsListMetadata('vi');

export default function VietnameseProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  return renderProjectsList('vi', searchParams);
}
