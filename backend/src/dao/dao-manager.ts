import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@ltv/db';
import type { KyselyExecutor } from './connection.js';
import type { UserDao } from './users/dao.interface.js';
import { KyselyUserDao } from './users/dao.js';
import type { SettingDao } from './settings/dao.interface.js';
import { KyselySettingDao } from './settings/dao.js';
import type { BrandDao } from './brands/dao.interface.js';
import { KyselyBrandDao } from './brands/dao.js';
import type { MediaDao } from './media/dao.interface.js';
import { KyselyMediaDao } from './media/dao.js';
import type { RedirectDao } from './redirects/dao.interface.js';
import { KyselyRedirectDao } from './redirects/dao.js';
import type { ProductCategoryDao } from './product-categories/dao.interface.js';
import { KyselyProductCategoryDao } from './product-categories/dao.js';
import type { StandardDao } from './standards/dao.interface.js';
import { KyselyStandardDao } from './standards/dao.js';
import type { ApplicationDao } from './applications/dao.interface.js';
import { KyselyApplicationDao } from './applications/dao.js';
import type { IndustryDao } from './industries/dao.interface.js';
import { KyselyIndustryDao } from './industries/dao.js';
import type { ProductDao } from './products/dao.interface.js';
import { KyselyProductDao } from './products/dao.js';
import type { ServiceDao } from './services/dao.interface.js';
import { KyselyServiceDao } from './services/dao.js';
import type { PageDao } from './pages/dao.interface.js';
import { KyselyPageDao } from './pages/dao.js';
import type { PostCategoryDao } from './post-categories/dao.interface.js';
import { KyselyPostCategoryDao } from './post-categories/dao.js';
import type { PostDao } from './posts/dao.interface.js';
import { KyselyPostDao } from './posts/dao.js';
import type { ProjectDao } from './projects/dao.interface.js';
import { KyselyProjectDao } from './projects/dao.js';
import type { DocumentDao } from './documents/dao.interface.js';
import { KyselyDocumentDao } from './documents/dao.js';
import type { CustomerDao } from './customers/dao.interface.js';
import { KyselyCustomerDao } from './customers/dao.js';

/**
 * Tap hop moi DAO. Them bang moi = them mot dong o day va mot dong o `buildDaos`.
 */
export interface AllDaos {
  readonly users: UserDao;
  readonly settings: SettingDao;
  readonly brands: BrandDao;
  readonly media: MediaDao;
  readonly redirects: RedirectDao;
  readonly productCategories: ProductCategoryDao;
  readonly standards: StandardDao;
  readonly applications: ApplicationDao;
  readonly industries: IndustryDao;
  readonly products: ProductDao;
  readonly services: ServiceDao;
  readonly pages: PageDao;
  readonly postCategories: PostCategoryDao;
  readonly posts: PostDao;
  readonly projects: ProjectDao;
  readonly documents: DocumentDao;
  readonly customers: CustomerDao;
}

/** Kiem tra ket noi — dung cho `/health/ready`, khong thuoc bang nao. */
export interface DaoPing {
  ping(): Promise<boolean>;
}

/**
 * DAO MANAGER — cong vao duy nhat cua tang truy cap du lieu.
 *
 * Vi sao `transaction` nam o day thay vi truyen `executor` qua tung loi goi:
 *
 *   await daos.transaction(async (tx) => {
 *     await tx.users.updatePassword(id, hash, now);
 *     await tx.settings.upsert({ ... });
 *   });
 *
 * `tx` CHINH LA tap DAO da gan transaction. Khong co tham so nao de quen.
 * Muon chay ngoai transaction thi phai CO Y go `this.daos.users` thay vi
 * `tx.users` — sai lam phai co y moi xay ra duoc, thay vi xay ra do so y.
 */
export type DaoManager = AllDaos &
  DaoPing & {
    transaction<T>(fn: (tx: AllDaos) => Promise<T>): Promise<T>;
  };

function buildDaos(db: KyselyExecutor): AllDaos {
  return {
    users: new KyselyUserDao(db),
    settings: new KyselySettingDao(db),
    brands: new KyselyBrandDao(db),
    media: new KyselyMediaDao(db),
    redirects: new KyselyRedirectDao(db),
    productCategories: new KyselyProductCategoryDao(db),
    standards: new KyselyStandardDao(db),
    applications: new KyselyApplicationDao(db),
    industries: new KyselyIndustryDao(db),
    products: new KyselyProductDao(db),
    services: new KyselyServiceDao(db),
    pages: new KyselyPageDao(db),
    postCategories: new KyselyPostCategoryDao(db),
    posts: new KyselyPostDao(db),
    projects: new KyselyProjectDao(db),
    documents: new KyselyDocumentDao(db),
    customers: new KyselyCustomerDao(db),
  };
}

export function createDaoManager(db: Kysely<Database>): DaoManager {
  return {
    ...buildDaos(db),
    async ping(): Promise<boolean> {
      try {
        const r = await sql<{ ok: number }>`SELECT 1 AS ok`.execute(db);
        return r.rows[0]?.ok === 1;
      } catch {
        return false;
      }
    },
    transaction<T>(fn: (tx: AllDaos) => Promise<T>): Promise<T> {
      // Kysely tu quan ly BEGIN/COMMIT/ROLLBACK. Khong long transaction:
      // service SO HUU use case moi duoc goi ham nay.
      return db.transaction().execute((trx) => fn(buildDaos(trx)));
    },
  };
}
