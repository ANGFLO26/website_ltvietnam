import type { CreateOfficeInput, Office, OfficeFilter, UpdateOfficeInput } from './object.js';

export interface OfficeDao {
  findById(id: string): Promise<Office | null>;
  /** Khong phan trang: so van phong la mot con so nho va co gioi han tu nhien. */
  list(filter: OfficeFilter): Promise<Office[]>;
  /** Tru so chinh — dung cho schema.org LocalBusiness va chan trang. */
  findHeadOffice(): Promise<Office | null>;

  insert(input: CreateOfficeInput): Promise<Office>;
  update(id: string, input: UpdateOfficeInput): Promise<Office>;
  delete(id: string): Promise<void>;
  publish(id: string): Promise<Office>;
  unpublish(id: string): Promise<Office>;
}
