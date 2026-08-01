import type { KyselyExecutor } from './connection.js';

/**
 * Lop nen cho moi DAO.
 *
 * Moi DAO nhan mot `KyselyExecutor` luc khoi tao. Khi lay tu `tx` cua
 * DaoManager thi executor do DA GAN transaction — nen phuong thuc cua DAO
 * KHONG can tham so executor, va khong the quen truyen.
 */
export abstract class BaseDao {
  constructor(protected readonly db: KyselyExecutor) {}
}
