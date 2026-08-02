import type { Selectable } from 'kysely';
import type { PostsTable, PostTranslationsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Locale } from '../translation.support.js';
import type { Post, PostTranslation } from './object.js';

export function toPost(row: Selectable<PostsTable>): Post {
  return {
    id: row.id,
    categoryId: row.category_id,
    featuredImageId: row.featured_image_id,
    authorId: row.author_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
  };
}

export function toPostTranslation(row: Selectable<PostTranslationsTable>): PostTranslation {
  return {
    id: row.id,
    postId: row.post_id,
    locale: row.locale as Locale,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: toBlocks(row.content),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as 'draft' | 'published' | 'hidden',
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
