import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import type { BannerDao } from './dao.interface.js';
import type { Banner, BannerFilter, CreateBannerInput, UpdateBannerInput } from './object.js';
import { toBanner } from './mapper.js';

export class KyselyBannerDao extends BaseDao implements BannerDao {
  async findById(id: string): Promise<Banner | null> {
    const row = await this.db.selectFrom('banners').selectAll()
      .where('id', '=', id).executeTakeFirst();
    return row ? toBanner(row) : null;
  }

  async list(filter: BannerFilter): Promise<Banner[]> {
    let q = this.db.selectFrom('banners').selectAll();
    if (filter.status) q = q.where('status', '=', filter.status);
    const rows = await q.orderBy('display_order').orderBy('title').execute();
    return rows.map(toBanner);
  }

  async findActive(): Promise<Banner[]> {
    // Dung query builder de `toBanner` nhan dung kieu hang, khong phai ep.
    // Rieng hai dieu kien thoi gian viet bang `sql` vi chung phai dung
    // `NOW()` cua PostgreSQL — xem chu thich o `dao.interface.ts`.
    const rows = await this.db
      .selectFrom('banners')
      .innerJoin('media', 'media.id', 'banners.image_id')
      .selectAll('banners')
      .where('banners.status', '=', 'published')
      .where('media.deleted_at', 'is', null)
      // NGOAC LA BAT BUOC. Kysely noi cac `where` bang AND, nhung KHONG boc
      // ngoac doan SQL tho. Thieu ngoac thi `AND a OR b` bi PostgreSQL doc
      // thanh `(AND a) OR b` vi AND uu tien hon OR — va moi banner het han
      // deu lot qua. Bai kiem "banner da het han thi bien mat" bat duoc cho nay.
      .where(sql<boolean>`(banners.start_at IS NULL OR banners.start_at <= NOW())`)
      .where(sql<boolean>`(banners.end_at   IS NULL OR banners.end_at   >  NOW())`)
      .orderBy('banners.display_order')
      .orderBy('banners.title')
      .execute();
    return rows.map(toBanner);
  }

  async insert(input: CreateBannerInput): Promise<Banner> {
    const row = await this.db.insertInto('banners').values({
      image_id: input.imageId,
      mobile_image_id: input.mobileImageId ?? null,
      title: input.title,
      subtitle: input.subtitle ?? null,
      button_label: input.buttonLabel ?? null,
      image_alt: input.imageAlt ?? null,
      ...(input.linkType !== undefined && { link_type: input.linkType }),
      link_target_id: input.linkTargetId ?? null,
      custom_url: input.customUrl ?? null,
      ...(input.openNewTab !== undefined && { open_new_tab: input.openNewTab }),
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toBanner(row);
  }

  async update(id: string, input: UpdateBannerInput): Promise<Banner> {
    const row = await this.db.updateTable('banners').set({
      ...(input.imageId !== undefined && { image_id: input.imageId }),
      ...(input.mobileImageId !== undefined && { mobile_image_id: input.mobileImageId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
      ...(input.buttonLabel !== undefined && { button_label: input.buttonLabel }),
      ...(input.imageAlt !== undefined && { image_alt: input.imageAlt }),
      ...(input.linkType !== undefined && { link_type: input.linkType }),
      ...(input.linkTargetId !== undefined && { link_target_id: input.linkTargetId }),
      ...(input.customUrl !== undefined && { custom_url: input.customUrl }),
      ...(input.openNewTab !== undefined && { open_new_tab: input.openNewTab }),
      ...(input.startAt !== undefined && { start_at: input.startAt }),
      ...(input.endAt !== undefined && { end_at: input.endAt }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toBanner(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('banners').where('id', '=', id).execute();
  }

  async publish(id: string): Promise<Banner> {
    const row = await this.db.updateTable('banners').set({ status: 'published' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toBanner(row);
  }
  async unpublish(id: string): Promise<Banner> {
    const row = await this.db.updateTable('banners').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toBanner(row);
  }
}
