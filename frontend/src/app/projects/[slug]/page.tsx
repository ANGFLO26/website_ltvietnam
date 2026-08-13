import type { Metadata } from 'next';
import { projectDetailMetadata, renderProjectDetail } from '@/page-views/projects';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return projectDetailMetadata('vi', params);
}

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderProjectDetail('vi', params);
}
