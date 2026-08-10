import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/lib/w6/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('privacy-policy', 'en');
}

export default function PrivacyPolicyPage() {
  return renderPolicyPage('privacy-policy', 'en');
}
