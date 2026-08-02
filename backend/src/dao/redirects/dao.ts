import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { RedirectDao } from './dao.interface.js';
import {
  RedirectLoopError,
  type CreateRedirectInput,
  type Redirect,
  type RedirectFilter,
  type UpdateRedirectInput,
} from './object.js';
import { toRedirect } from './mapper.js';

export class KyselyRedirectDao extends BaseDao implements RedirectDao {
  async findActiveBySource(sourcePath: string): Promise<Redirect | null> {
    const row = await this.db
      .selectFrom('redirects').selectAll()
      .where('source_path', '=', sourcePath)
      .where('status', '=', 'active')
      .executeTakeFirst();
    return row ? toRedirect(row) : null;
  }

  async findById(id: string): Promise<Redirect | null> {
    const row = await this.db
      .selectFrom('redirects').selectAll().where('id', '=', id).executeTakeFirst();
    return row ? toRedirect(row) : null;
  }

  async list(filter: RedirectFilter, page?: Partial<Page>): Promise<Paged<Redirect>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('redirects').selectAll();
    let cq = this.db.selectFrom('redirects').select(({ fn }) => fn.countAll<string>().as('n'));

    if (filter.status) {
      q = q.where('status', '=', filter.status);
      cq = cq.where('status', '=', filter.status);
    }
    if (filter.neverHit) {
      q = q.where('hit_count', '=', '0');
      cq = cq.where('hit_count', '=', '0');
    }
    if (filter.search) {
      const needle = `%${escapeLike(filter.search)}%`;
      q = q.where((eb) =>
        eb.or([eb('source_path', 'ilike', needle), eb('target_path', 'ilike', needle)]),
      );
      cq = cq.where((eb) =>
        eb.or([eb('source_path', 'ilike', needle), eb('target_path', 'ilike', needle)]),
      );
    }

    const rows = await q
      .orderBy('hit_count', 'desc').orderBy('source_path')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toRedirect), total, p);
  }

  /**
   * GOP CHUOI. Ba buoc, phai nam trong cung mot transaction —
   * nguoi goi lay DAO nay tu `tx` nen dieu do duoc bao dam boi cach goi.
   */
  async createCollapsingChain(input: CreateRedirectInput): Promise<Redirect> {
    const { sourcePath, targetPath } = input;
    if (sourcePath === targetPath) throw new RedirectLoopError(sourcePath, targetPath);

    // 1. `targetPath` co dang la source cua mot chuyen huong khac khong?
    //    Neu co thi di theo den dich cuoi — tranh tao chuoi ngay tu dau.
    const finalTarget = await this.followChain(targetPath);
    if (finalTarget === sourcePath) throw new RedirectLoopError(sourcePath, targetPath);

    // 2. Moi ban ghi dang tro toi `sourcePath` phai duoc keo thang sang dich.
    await this.db
      .updateTable('redirects')
      .set({ target_path: finalTarget })
      .where('target_path', '=', sourcePath)
      .execute();

    // 3. Ghi ban ghi moi.
    return this.upsert({ ...input, targetPath: finalTarget });
  }

  async upsert(input: CreateRedirectInput): Promise<Redirect> {
    if (input.sourcePath === input.targetPath) {
      throw new RedirectLoopError(input.sourcePath, input.targetPath);
    }
    const row = await this.db
      .insertInto('redirects')
      .values({
        source_path: input.sourcePath,
        target_path: input.targetPath,
        redirect_type: input.redirectType ?? 301,
      })
      .onConflict((oc) =>
        oc.column('source_path').doUpdateSet({
          target_path: input.targetPath,
          redirect_type: input.redirectType ?? 301,
          status: 'active',
        }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return toRedirect(row);
  }

  async update(id: string, input: UpdateRedirectInput): Promise<Redirect> {
    const row = await this.db
      .updateTable('redirects')
      .set({
        ...(input.targetPath !== undefined && { target_path: input.targetPath }),
        ...(input.redirectType !== undefined && { redirect_type: input.redirectType }),
        ...(input.status !== undefined && { status: input.status }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toRedirect(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('redirects').where('id', '=', id).execute();
  }

  async recordHit(id: string, at: Date): Promise<void> {
    // Tang tai cho, khong doc-roi-ghi: hai yeu cau cung luc khong lam mat dem.
    await sql`
      UPDATE ltv.redirects
      SET hit_count = hit_count + 1, last_hit_at = ${at}
      WHERE id = ${id}
    `.execute(this.db);
  }

  async bulkInsert(rows: readonly CreateRedirectInput[]): Promise<number> {
    const clean = rows.filter((r) => r.sourcePath !== r.targetPath);
    if (clean.length === 0) return 0;
    const res = await this.db
      .insertInto('redirects')
      .values(
        clean.map((r) => ({
          source_path: r.sourcePath,
          target_path: r.targetPath,
          redirect_type: r.redirectType ?? 301,
        })),
      )
      // Nhap lai lan hai khong duoc lam hong cai da co.
      .onConflict((oc) => oc.column('source_path').doNothing())
      .executeTakeFirst();
    return Number(res.numInsertedOrUpdatedRows ?? 0);
  }

  async findLoops(): Promise<string[]> {
    // Duyet do thi bang WITH RECURSIVE, chan do sau 10 chang.
    // Vong lap lo dien khi mot duong di quay lai dung diem xuat phat.
    const r = await sql<{ source_path: string }>`
      WITH RECURSIVE walk(start_path, current_path, hops) AS (
        SELECT source_path, target_path, 1 FROM ltv.redirects WHERE status = 'active'
        UNION ALL
        SELECT w.start_path, r.target_path, w.hops + 1
        FROM walk w
        JOIN ltv.redirects r ON r.source_path = w.current_path AND r.status = 'active'
        WHERE w.hops < 10 AND w.current_path <> w.start_path
      )
      SELECT DISTINCT start_path AS source_path
      FROM walk WHERE current_path = start_path
      ORDER BY 1
    `.execute(this.db);
    return r.rows.map((x) => x.source_path);
  }

  /**
   * Di theo chuoi toi dich cuoi, toi da 10 chang.
   * Gap vong lap thi dung lai va tra ve chang hien tai — nguoi goi so sanh
   * voi `sourcePath` de phat hien.
   */
  private async followChain(from: string): Promise<string> {
    let current = from;
    const seen = new Set<string>([from]);
    for (let i = 0; i < 10; i++) {
      const next = await this.db
        .selectFrom('redirects').select('target_path')
        .where('source_path', '=', current).where('status', '=', 'active')
        .executeTakeFirst();
      if (!next) return current;
      if (seen.has(next.target_path)) return current;
      seen.add(next.target_path);
      current = next.target_path;
    }
    return current;
  }
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
