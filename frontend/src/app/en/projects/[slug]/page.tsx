import type { Metadata } from 'next';
import { projectDetailMetadata, renderProjectDetail } from '@/page-views/projects';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return projectDetailMetadata('en', params);
}

export default function EnglishProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderProjectDetail('en', params);
}
