import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('terms-of-use', 'vi');
}

export default function VietnameseTermsOfUsePage() {
  return renderPolicyPage('terms-of-use', 'vi');
}
