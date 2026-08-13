import type { AdminTaxonomyKind } from '@ltv/contracts';

export interface TaxonomyConfig {
  readonly label: string;
  readonly plural: string;
  readonly tree: boolean;
}

export const TAXONOMY_CONFIG: Record<AdminTaxonomyKind, TaxonomyConfig> = {
  brand: { label: 'Hãng', plural: 'Hãng', tree: true },
  product_category: { label: 'Danh mục', plural: 'Danh mục sản phẩm', tree: true },
  standard: { label: 'Tiêu chuẩn', plural: 'Tiêu chuẩn', tree: false },
  application: { label: 'Ứng dụng', plural: 'Ứng dụng', tree: false },
  industry: { label: 'Ngành', plural: 'Ngành', tree: false },
};

export const TAXONOMY_KINDS = Object.keys(TAXONOMY_CONFIG) as AdminTaxonomyKind[];

export function isTaxonomyKind(value: string | undefined): value is AdminTaxonomyKind {
  return value !== undefined && value in TAXONOMY_CONFIG;
}
