import type { Metadata } from 'next';
import { projectDetailMetadata, renderProjectDetail } from '@/lib/w4/projects';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return projectDetailMetadata('vi', params);
}

export default function VietnameseProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderProjectDetail('vi', params);
}
