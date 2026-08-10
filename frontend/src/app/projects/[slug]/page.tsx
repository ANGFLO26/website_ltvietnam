import type { Metadata } from 'next';
import { projectDetailMetadata, renderProjectDetail } from '@/lib/w4/projects';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return projectDetailMetadata('en', params);
}

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderProjectDetail('en', params);
}
