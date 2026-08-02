import type { EntityStatus } from '../brands/object.js';

/**
 * Tieu chuan thu nghiem — PHANG, khong phai cay.
 *
 * Du lieu that tu trang OptiDist:
 *   ASTM D86 · EN ISO 3405 · IP 123 · DIN 51 751 · JIS K2254 · NF M07-002
 *
 * Cap (organization, code) la dinh danh nghiep vu, va la thu nguoi mua go vao
 * o tim kiem. Chi muc duy nhat tren `(UPPER(organization), UPPER(code))` chan
 * viec cung mot tieu chuan bi nhap hai lan duoi hai cach viet hoa.
 *
 * `name` NULLABLE co chu dich: nhieu tieu chuan chi duoc biet den qua ma so.
 * Ep phai co ten day du se dan den nhap bua cho du.
 */
export interface Standard {
  readonly id: string;
  readonly organization: string;
  readonly code: string;
  readonly name: string | null;
  readonly slug: string;
  readonly description: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreateStandardInput {
  readonly organization: string;
  readonly code: string;
  readonly slug: string;
  readonly name?: string | null;
  readonly description?: string | null;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export type UpdateStandardInput = Partial<Omit<CreateStandardInput, 'organization' | 'code'>> & {
  readonly organization?: string;
  readonly code?: string;
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface StandardFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly organization?: string;
  /** Tim theo ma hoac ten — dung chi muc trigram. */
  readonly search?: string;
  readonly includeDeleted?: boolean;
}
