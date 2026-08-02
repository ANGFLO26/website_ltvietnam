import type { Selectable } from 'kysely';
import type { ProjectsTable, ProjectTranslationsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Locale } from '../translation.support.js';
import type {
  CustomerVisibility,
  Project,
  ProjectTranslation,
  ProjectType,
} from './object.js';

export function toProject(row: Selectable<ProjectsTable>): Project {
  return {
    id: row.id,
    customerId: row.customer_id,
    projectType: row.project_type as ProjectType,
    customerVisibility: row.customer_visibility as CustomerVisibility,
    locationText: row.location_text,
    countryCode: row.country_code,
    // DATE ve nguyen dang chuoi `YYYY-MM-DD` (trinh phan tich dat o
    // `dao/connection.ts`) — khong boc lai thanh `Date`.
    startedAt: row.started_at,
    completedAt: row.completed_at,
    featuredImageId: row.featured_image_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
  };
}

export function toProjectTranslation(
  row: Selectable<ProjectTranslationsTable>,
): ProjectTranslation {
  return {
    id: row.id,
    projectId: row.project_id,
    locale: row.locale as Locale,
    title: row.title,
    slug: row.slug,
    shortDescription: row.short_description,
    scopeOfWork: toBlocks(row.scope_of_work),
    implementation: toBlocks(row.implementation),
    result: toBlocks(row.result),
    customerDisplayName: row.customer_display_name,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as 'draft' | 'published' | 'hidden',
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
