import type { EntityStatus } from '../brands/object.js';

export type OfficeType =
  | 'head_office' | 'branch' | 'representative_office' | 'service_center' | 'workshop';

/**
 * VAN PHONG / CHI NHANH — trang lien he.
 *
 * `latitude`/`longitude` la NUMERIC(10,7) trong so do, khong phai FLOAT.
 * NUMERIC ve tu `pg` duoi dang CHUOI de khong mat do chinh xac, va mapper
 * doi sang `number` o day. Bay chu so thap phan la khoang 1 cm — thua cho
 * mot cai ghim tren ban do, va du chinh xac de khong bi lech sang toa nha
 * ben canh.
 */
export interface Office {
  readonly id: string;
  readonly officeType: OfficeType;
  readonly name: string;
  readonly address: string;
  readonly workingHours: string | null;
  readonly description: string | null;
  readonly phone: string | null;
  readonly fax: string | null;
  readonly email: string | null;
  readonly mapUrl: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly featuredImageId: string | null;
  readonly status: EntityStatus;
  readonly displayOrder: number;
}

export interface CreateOfficeInput {
  readonly officeType: OfficeType;
  readonly name: string;
  readonly address: string;
  readonly workingHours?: string | null;
  readonly description?: string | null;
  readonly phone?: string | null;
  readonly fax?: string | null;
  readonly email?: string | null;
  readonly mapUrl?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly featuredImageId?: string | null;
}

export type UpdateOfficeInput = Partial<CreateOfficeInput> & {
  readonly displayOrder?: number;
};

export interface OfficeFilter {
  readonly status?: EntityStatus;
  readonly officeType?: OfficeType;
}
