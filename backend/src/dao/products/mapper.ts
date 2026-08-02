import type { Selectable } from 'kysely';
import type { ProductsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { PriceVisibility, Product, ProductType, SaleMode } from './object.js';

export function toProduct(row: Selectable<ProductsTable>): Product {
  return {
    id: row.id,
    brandId: row.brand_id,
    featuredImageId: row.featured_image_id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,

    overview: toBlocks(row.overview),
    features: toBlocks(row.features),
    applicationsText: toBlocks(row.applications_text),
    principle: toBlocks(row.principle),
    sampleTypes: toBlocks(row.sample_types),
    operatingConditions: toBlocks(row.operating_conditions),
    accessoriesOptions: toBlocks(row.accessories_options),

    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    model: row.model,
    internalCode: row.internal_code,
    sku: row.sku,
    productType: row.product_type as ProductType,
    priceVisibility: row.price_visibility as PriceVisibility,
    saleMode: row.sale_mode as SaleMode,
    requiresConfiguration: row.requires_configuration,
    warrantyMonths: row.warranty_months,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
    discontinuedAt: row.discontinued_at,
  };
}
