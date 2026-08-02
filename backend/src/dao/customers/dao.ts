import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { CustomerDao } from './dao.interface.js';
import type {
  CreateCustomerInput,
  Customer,
  CustomerFilter,
  PublicCustomer,
  UpdateCustomerInput,
} from './object.js';
import { toCustomer } from './mapper.js';

export class KyselyCustomerDao extends BaseDao implements CustomerDao {
  async findById(id: string): Promise<Customer | null> {
    const row = await this.db.selectFrom('customers').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toCustomer(row) : null;
  }

  async list(filter: CustomerFilter, page?: Partial<Page>): Promise<Paged<Customer>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('customers').selectAll();
    let cq = this.db.selectFrom('customers').select(({ fn }) => fn.countAll<string>().as('n'));
    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.isPublic !== undefined) { q = q.where('is_public', '=', filter.isPublic); cq = cq.where('is_public', '=', filter.isPublic); }
    if (filter.isFeatured !== undefined) { q = q.where('is_featured', '=', filter.isFeatured); cq = cq.where('is_featured', '=', filter.isFeatured); }
    if (filter.industryId) { q = q.where('industry_id', '=', filter.industryId); cq = cq.where('industry_id', '=', filter.industryId); }

    const rows = await q.orderBy('display_order').orderBy('name')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toCustomer), total, p);
  }

  async findPublicWithLogo(limit: number): Promise<PublicCustomer[]> {
    const rows = await this.db
      .selectFrom('customers')
      .innerJoin('media', 'media.id', 'customers.logo_id')
      .selectAll('customers')
      .where('customers.deleted_at', 'is', null)
      .where('customers.status', '=', 'published')
      .where('customers.is_public', '=', true)
      .where('media.deleted_at', 'is', null)
      .orderBy('customers.display_order').orderBy('customers.name')
      .limit(Math.max(1, Math.trunc(limit)))
      .execute();
    // `innerJoin` tren `logo_id` da loai het hang khong co logo, nen
    // `logoId: string` (khong nullable) la ket luan cua truy van.
    return rows.map(toCustomer) as PublicCustomer[];
  }

  async insert(input: CreateCustomerInput): Promise<Customer> {
    const row = await this.db.insertInto('customers').values({
      name: input.name,
      short_description: input.shortDescription ?? null,
      logo_id: input.logoId ?? null,
      industry_id: input.industryId ?? null,
      website_url: input.websiteUrl ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toCustomer(row);
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const row = await this.db.updateTable('customers').set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.shortDescription !== undefined && { short_description: input.shortDescription }),
      ...(input.logoId !== undefined && { logo_id: input.logoId }),
      ...(input.industryId !== undefined && { industry_id: input.industryId }),
      ...(input.websiteUrl !== undefined && { website_url: input.websiteUrl }),
      ...(input.isPublic !== undefined && { is_public: input.isPublic }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toCustomer(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('customers').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('customers').set({ deleted_at: null }).where('id', '=', id).execute();
  }

  /**
   * Duyet noi dung KHONG dong nghia voi duoc phep dung logo.
   * `is_public` khong doi o day — no can mot hanh dong rieng, co y thuc.
   */
  async publish(id: string, at: Date): Promise<Customer> {
    const row = await this.db.updateTable('customers')
      .set({ status: 'published', updated_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toCustomer(row);
  }

  async countProjects(id: string): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ltv.projects WHERE customer_id = ${id} AND deleted_at IS NULL
    `.execute(this.db);
    return Number(r.rows[0]?.n ?? 0);
  }
}
