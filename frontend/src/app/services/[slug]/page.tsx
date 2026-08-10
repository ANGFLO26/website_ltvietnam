import type { Metadata } from 'next';
import { renderServiceDetail, serviceDetailMetadata } from '@/lib/w4/services';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return serviceDetailMetadata('en', params);
}

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderServiceDetail('en', params);
}
