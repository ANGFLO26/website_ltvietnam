import type { AdminContentDetailKind, AdminContentResource } from '@ltv/contracts';

export type ContentResource = AdminContentResource | 'post-categories';
export interface ContentResourceConfig {
  readonly resource: ContentResource;
  readonly kind: AdminContentDetailKind | 'post_category';
  readonly label: string;
  readonly singular: string;
  readonly description: string;
}

export const CONTENT_RESOURCES: readonly ContentResourceConfig[] = [
  {
    resource: 'pages',
    kind: 'page',
    label: 'Trang',
    singular: 'trang',
    description: 'Trang giới thiệu và trang hệ thống',
  },
  {
    resource: 'services',
    kind: 'service',
    label: 'Dịch vụ',
    singular: 'dịch vụ',
    description: 'Năng lực và quy trình dịch vụ',
  },
  {
    resource: 'projects',
    kind: 'project',
    label: 'Dự án',
    singular: 'dự án',
    description: 'Hồ sơ triển khai và kết quả',
  },
  {
    resource: 'posts',
    kind: 'post',
    label: 'Bài viết',
    singular: 'bài viết',
    description: 'Tin tức và kiến thức chuyên môn',
  },
  {
    resource: 'post-categories',
    kind: 'post_category',
    label: 'Danh mục bài viết',
    singular: 'danh mục',
    description: 'Cấu trúc phân loại bài viết',
  },
];

export function contentConfig(resource: string): ContentResourceConfig | null {
  return CONTENT_RESOURCES.find((item) => item.resource === resource) ?? null;
}
