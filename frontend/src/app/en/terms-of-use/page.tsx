import type { Metadata } from 'next';
import { policyMetadata, renderPolicyPage } from '@/page-views/policies';

export function generateMetadata(): Promise<Metadata> {
  return policyMetadata('terms-of-use', 'en');
}

export default function EnglishTermsOfUsePage() {
  return renderPolicyPage('terms-of-use', 'en');
}
