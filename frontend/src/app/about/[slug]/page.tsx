import type { Metadata } from 'next';
import { aboutDetailMetadata, renderAboutDetail } from '@/lib/w4/about';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return aboutDetailMetadata('en', params);
}

export default function AboutDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderAboutDetail('en', params);
}
