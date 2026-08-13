import type { Metadata } from 'next';
import { renderServiceDetail, serviceDetailMetadata } from '@/page-views/services';

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return serviceDetailMetadata('vi', params);
}

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return renderServiceDetail('vi', params);
}
