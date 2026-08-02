import { sql } from 'kysely';
import { BaseDao } from './base.dao.js';

/**
 * LOP CHA cho nam bang co cau truc cay (ADR-015):
 *   brands · product_categories · applications · services · post_categories
 *
 * Tat ca deu co bo ba cot giong nhau:
 *   parent_id UUID | ancestor_ids UUID[] (goc -> cha truc tiep) | depth INTEGER
 *
 * Vi sao dang lam lop cha: logic doi cha phai tinh lai `ancestor_ids` va
 * `depth` cho ca NHANH CON trong cung mot transaction. Viet nam lan la nam co
 * hoi sai khac nhau. Day la yeu cau bat buoc cua ADR-015.
 */
export interface TreeNode {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
}

export class TreeCycleError extends Error {
  constructor(readonly nodeId: string, readonly targetParentId: string) {
    super(`Khong the chuyen ${nodeId} vao duoi ${targetParentId}: se tao vong lap`);
    this.name = 'TreeCycleError';
  }
}

export abstract class TreeDao extends BaseDao {
  /** Ten bang trong schema `ltv`. Chi nhan gia tri tu danh sach da biet. */
  protected abstract readonly table: TreeTableName;

  /**
   * Toan bo id trong nhanh cua `rootId`, KE CA chinh no.
   *
   * Dung index GIN tren `ancestor_ids`. Khong de quy, khong N+1.
   * Day la truy van ma bo loc theo hang me / danh muc cha dua vao —
   * thieu no thi loc "PAC" tra ve 0 san pham (loi cua v1.2.1).
   */
  async findSubtreeIds(rootId: string): Promise<string[]> {
    const r = await sql<{ id: string }>`
      SELECT id FROM ${sql.table(this.table)}
      WHERE id = ${rootId} OR ancestor_ids @> ARRAY[${rootId}]::uuid[]
    `.execute(this.db);
    return r.rows.map((x) => x.id);
  }

  /** Nhieu goc cung luc — dung cho bo loc nhieu gia tri cung mot chieu (OR). */
  async findSubtreeIdsOfMany(rootIds: readonly string[]): Promise<string[]> {
    if (rootIds.length === 0) return [];
    const arr = sql`ARRAY[${sql.join(rootIds.map((v) => sql`${v}`))}]::uuid[]`;
    const r = await sql<{ id: string }>`
      SELECT id FROM ${sql.table(this.table)}
      WHERE id = ANY(${arr}) OR ancestor_ids && ${arr}
    `.execute(this.db);
    return r.rows.map((x) => x.id);
  }

  /**
   * Chuoi to tien tu goc xuong, dung thu tu — dung cho breadcrumb.
   * MOT truy van, khong lap theo tung cap.
   *
   * Luu y ve cu phap: PHAI `unnest` truoc khi so sanh. Viet
   * `id = ANY((SELECT ancestor_ids ...))` trong nhu dung nhung sai — PostgreSQL
   * hieu subquery la MOT TAP CAC HANG kieu uuid[], nen no di so sanh
   * `uuid = uuid[]` va bao loi. `unnest` bien mang thanh cac hang uuid.
   */
  async findAncestors(id: string): Promise<TreeNode[]> {
    const r = await sql<TreeRow>`
      SELECT id, parent_id, ancestor_ids, depth
      FROM ${sql.table(this.table)}
      WHERE id IN (
        SELECT unnest(ancestor_ids) FROM ${sql.table(this.table)} WHERE id = ${id}
      )
      ORDER BY depth
    `.execute(this.db);
    return r.rows.map(toTreeNode);
  }

  async findChildren(parentId: string | null): Promise<TreeNode[]> {
    const r = await sql<TreeRow>`
      SELECT id, parent_id, ancestor_ids, depth
      FROM ${sql.table(this.table)}
      WHERE parent_id IS NOT DISTINCT FROM ${parentId}
      ORDER BY display_order, id
    `.execute(this.db);
    return r.rows.map(toTreeNode);
  }

  async findNode(id: string): Promise<TreeNode | null> {
    const r = await sql<TreeRow>`
      SELECT id, parent_id, ancestor_ids, depth
      FROM ${sql.table(this.table)} WHERE id = ${id}
    `.execute(this.db);
    const row = r.rows[0];
    return row ? toTreeNode(row) : null;
  }

  /**
   * Gan cha khi TAO nut moi. Tinh san `ancestor_ids` va `depth`.
   * Tra ve gia tri de DAO con dua thang vao lenh INSERT.
   */
  async computePlacement(parentId: string | null): Promise<{ ancestorIds: string[]; depth: number }> {
    if (parentId === null) return { ancestorIds: [], depth: 0 };
    const parent = await this.findNode(parentId);
    if (!parent) throw new Error(`Khong tim thay nut cha: ${parentId}`);
    return { ancestorIds: [...parent.ancestorIds, parent.id], depth: parent.depth + 1 };
  }

  /**
   * DOI CHA — tinh lai `ancestor_ids` va `depth` cho nut VA TOAN BO nhanh con.
   *
   * Bat buoc goi trong transaction (ADR-015 muc 5). DAO nay lay tu `tx` cua
   * DaoManager nen dieu do duoc bao dam boi cach goi.
   *
   * Chan vong lap: khong cho chuyen mot nut vao duoi chinh nhanh cua no.
   */
  async moveNode(id: string, newParentId: string | null): Promise<void> {
    if (id === newParentId) throw new TreeCycleError(id, newParentId);

    const node = await this.findNode(id);
    if (!node) throw new Error(`Khong tim thay nut: ${id}`);

    if (newParentId !== null) {
      const subtree = await this.findSubtreeIds(id);
      if (subtree.includes(newParentId)) throw new TreeCycleError(id, newParentId);
    }

    const placement = await this.computePlacement(newParentId);
    const oldPrefixLen = node.ancestorIds.length + 1;   // to tien cu + chinh no
    const newPrefix = [...placement.ancestorIds, id];

    const newPrefixArr =
      newPrefix.length === 0
        ? sql`ARRAY[]::uuid[]`
        : sql`ARRAY[${sql.join(newPrefix.map((v) => sql`${v}`))}]::uuid[]`;
    const nodeAncestors =
      placement.ancestorIds.length === 0
        ? sql`ARRAY[]::uuid[]`
        : sql`ARRAY[${sql.join(placement.ancestorIds.map((v) => sql`${v}`))}]::uuid[]`;

    // 1. Chinh nut do
    await sql`
      UPDATE ${sql.table(this.table)}
      SET parent_id = ${newParentId}, ancestor_ids = ${nodeAncestors}, depth = ${placement.depth}
      WHERE id = ${id}
    `.execute(this.db);

    // 2. Toan bo nhanh con: thay tien to cu bang tien to moi, giu phan duoi.
    await sql`
      UPDATE ${sql.table(this.table)}
      SET ancestor_ids = ${newPrefixArr} || ancestor_ids[${oldPrefixLen + 1}:],
          depth        = ${newPrefix.length} + (depth - ${oldPrefixLen})
      WHERE ancestor_ids @> ARRAY[${id}]::uuid[]
    `.execute(this.db);
  }

  /**
   * Kiem tra toan ven cay — dung trong test va trong lenh kiem tra dinh ky.
   * Tra ve danh sach id sai; rong nghia la cay dung.
   */
  async findInconsistentNodes(): Promise<string[]> {
    const r = await sql<{ id: string }>`
      SELECT c.id
      FROM ${sql.table(this.table)} c
      LEFT JOIN ${sql.table(this.table)} p ON p.id = c.parent_id
      WHERE
        (c.parent_id IS NULL     AND (c.depth <> 0 OR array_length(c.ancestor_ids, 1) IS NOT NULL))
        OR (c.parent_id IS NOT NULL AND (
              p.id IS NULL
              OR c.depth <> p.depth + 1
              OR c.ancestor_ids <> p.ancestor_ids || ARRAY[p.id]::uuid[]))
        OR c.id = ANY(c.ancestor_ids)
    `.execute(this.db);
    return r.rows.map((x) => x.id);
  }
}

export type TreeTableName =
  | 'brands'
  | 'product_categories'
  | 'applications'
  | 'services'
  | 'post_categories';

interface TreeRow {
  id: string;
  parent_id: string | null;
  ancestor_ids: string[];
  depth: number;
}

function toTreeNode(row: TreeRow): TreeNode {
  return {
    id: row.id,
    parentId: row.parent_id,
    ancestorIds: row.ancestor_ids ?? [],
    depth: row.depth,
  };
}
