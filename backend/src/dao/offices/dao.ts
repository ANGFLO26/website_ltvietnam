import { BaseDao } from '../base.dao.js';
import type { OfficeDao } from './dao.interface.js';
import type { CreateOfficeInput, Office, OfficeFilter, UpdateOfficeInput } from './object.js';
import { toOffice } from './mapper.js';

export class KyselyOfficeDao extends BaseDao implements OfficeDao {
  async findById(id: string): Promise<Office | null> {
    const row = await this.db
      .selectFrom('offices')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toOffice(row) : null;
  }

  async list(filter: OfficeFilter): Promise<Office[]> {
    let q = this.db.selectFrom('offices').selectAll();
    if (filter.status) q = q.where('status', '=', filter.status);
    if (filter.officeType) q = q.where('office_type', '=', filter.officeType);
    const rows = await q.orderBy('display_order').orderBy('name').execute();
    return rows.map(toOffice);
  }

  /**
   * Neu co nhieu hon mot tru so — du lieu sai — thi lay cai co
   * `display_order` nho nhat thay vi nem loi. Chan trang khong duoc gay chi
   * vi ai do nhap nham loai van phong.
   */
  async findHeadOffice(): Promise<Office | null> {
    const row = await this.db
      .selectFrom('offices')
      .selectAll()
      .where('office_type', '=', 'head_office')
      .where('status', '=', 'published')
      .orderBy('display_order')
      .executeTakeFirst();
    return row ? toOffice(row) : null;
  }

  async insert(input: CreateOfficeInput): Promise<Office> {
    const row = await this.db
      .insertInto('offices')
      .values({
        ...(input.initialStatus !== undefined && { status: input.initialStatus }),
        office_type: input.officeType,
        name: input.name,
        address: input.address,
        working_hours: input.workingHours ?? null,
        description: input.description ?? null,
        phone: input.phone ?? null,
        fax: input.fax ?? null,
        email: input.email ?? null,
        map_url: input.mapUrl ?? null,
        // NUMERIC: kieu ghi la `string` (giong BIGINT) de khong mat do chinh
        // xac khi di qua JavaScript. Ep o day, khong de lot len interface.
        latitude: toNumeric(input.latitude),
        longitude: toNumeric(input.longitude),
        featured_image_id: input.featuredImageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toOffice(row);
  }

  async update(id: string, input: UpdateOfficeInput): Promise<Office> {
    const row = await this.db
      .updateTable('offices')
      .set({
        ...(input.officeType !== undefined && { office_type: input.officeType }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.workingHours !== undefined && { working_hours: input.workingHours }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.fax !== undefined && { fax: input.fax }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.mapUrl !== undefined && { map_url: input.mapUrl }),
        ...(input.latitude !== undefined && { latitude: toNumeric(input.latitude) }),
        ...(input.longitude !== undefined && { longitude: toNumeric(input.longitude) }),
        ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
        ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toOffice(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('offices').where('id', '=', id).execute();
  }

  async publish(id: string): Promise<Office> {
    const row = await this.db
      .updateTable('offices')
      .set({ status: 'published' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toOffice(row);
  }
  async unpublish(id: string): Promise<Office> {
    const row = await this.db
      .updateTable('offices')
      .set({ status: 'hidden' })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toOffice(row);
  }
}

/** NUMERIC nhan chuoi. `null` giu nguyen `null`. */
function toNumeric(v: number | null | undefined): string | null {
  return v === null || v === undefined ? null : String(v);
}
