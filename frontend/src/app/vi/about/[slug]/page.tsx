import type { Metadata } from 'next';
import { aboutDetailMetadata, renderAboutDetail } from '@/page-views/about';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return aboutDetailMetadata('vi', params);
}

export default function VietnameseAboutDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return renderAboutDetail('vi', params);
}
