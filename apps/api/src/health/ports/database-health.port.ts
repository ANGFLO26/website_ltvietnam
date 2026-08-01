/**
 * Cong ra ma tang ung dung phu thuoc.
 *
 * `HealthService` khong duoc biet gi ve `pg`, ve chuoi ket noi hay ve SQL.
 * Doi driver hoac doi cach kiem tra chi sua adapter, khong sua service.
 */
export const DATABASE_HEALTH_PORT = Symbol('DATABASE_HEALTH_PORT');

export interface DatabaseHealthPort {
  /** True neu chay duoc mot truy van toi thieu va schema tuong thich. */
  canServeMinimalQuery(): Promise<boolean>;
}
