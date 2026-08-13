import type { Metadata } from 'next';
import { renderRequestSuccess, requestSuccessMetadata } from '@/page-views/request-success';

export const metadata: Metadata = requestSuccessMetadata('en');

export default function RequestSuccessPage() {
  return renderRequestSuccess('en');
}
