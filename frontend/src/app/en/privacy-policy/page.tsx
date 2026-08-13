import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/page-views/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('privacy-policy', 'en');
}

export default function EnglishPrivacyPolicyPage() {
  return renderPolicyPage('privacy-policy', 'en');
}
