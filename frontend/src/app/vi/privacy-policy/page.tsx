import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/page-views/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('privacy-policy', 'vi');
}

export default function VietnamesePrivacyPolicyPage() {
  return renderPolicyPage('privacy-policy', 'vi');
}
