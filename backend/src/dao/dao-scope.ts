import type { AllDaos } from './dao-manager.js';

/**
 * Thu hep DAO manager theo module.
 *
 * DAO manager so huu ca 26 bang. Neu moi service nhan nguyen ca manager thi
 * service cua `posts` cham duoc thang bang `inquiries`, va luat "module khong
 * truy cap repository cua module khac" chet ngay khi co module thu hai.
 *
 * Moi service khai bao DUNG nhung bang minh duoc cham:
 *
 *   type UserDaos = DaoScope<'users'>;
 *
 *   class UserService {
 *     constructor(private readonly daos: UserDaos) {}
 *     // go this.daos.settings -> LOI BIEN DICH, khong phai gop y luc review
 *   }
 *
 * Muon cham bang cua module khac thi phai them ten vao kieu — va cho them do
 * chinh la noi nguoi review nhin thay ngay.
 */
export type DaoScope<K extends keyof AllDaos> = Pick<AllDaos, K> & {
  transaction<T>(fn: (tx: Pick<AllDaos, K>) => Promise<T>): Promise<T>;
};
