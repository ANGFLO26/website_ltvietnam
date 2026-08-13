import type { User } from '../../dao/users/object.js';
import type { AdminSessionView, AdminUserView } from '@ltv/contracts';

/**
 * Hinh dang cua `user` KHI DI RA NGOAI. Khong phai thuc the nghiep vu.
 *
 * Hai viec, va ca hai deu can mot kieu co TEN:
 *
 * 1. LOC. `User` co `passwordChangedAt` va `status` — hai truong noi bo. Chung
 *    khong bi mat, nhung chung ke cho ben ngoai ve co che ben trong: dau moi
 *    cua viec thu hoi phien, va viec tai khoan co the o trang thai `locked`.
 *    Khong ai can chung o `/auth/me`, va "khong ai can" la ly do du de khong
 *    gui. Day la van de so 9 cua `doc/13`, le ra o F-1e; Luat 10b keo no len
 *    day vi no bat buoc kieu tra ve phai co TEN, va dat ten thi phai chon
 *    truong.
 *
 * 2. TACH VOI DATABASE. Neu API tra thang thuc the thi doi ten mot truong
 *    trong `User` la doi hop dong cong khai — va khong co gi bao. Voi mot ham
 *    chuyen doi tuong minh, doi ten trong `User` lam ham nay KHONG bien dich.
 *
 * `snake_case` la CO Y va la mot chieu duy nhat cho toan bo API:
 * `doc/06` viet `meta{page, page_size, total_items, total_pages}`, vo loi da
 * dung `request_id`, va DTO dau vao da dung `current_password`. Tron hai kieu
 * viet trong cung mot phan hoi la thu frontend phai tra gia moi ngay. Luat 11
 * cua `architecture.test.ts` ep dieu do.
 *
 * Doi xung voi tang duoi: `dao/<bang>/mapper.ts` doi `snake_case` cua database
 * thanh `camelCase` cua nghiep vu; `api/dto/<x>.view.ts` doi nguoc lai o bien
 * ra. Nghiep vu o giua khong biet kieu viet nao ca.
 */
export type UserIdentityView = AdminSessionView;

/**
 * HAI kieu chu khong phai mot kieu co truong tuy chon.
 *
 * `AuthService.login` co y chi tra ve `id, name, email, role` — nghiep vu dang
 * nhap khong doc `lastLoginAt`. Ban dau toi de mot kieu duy nhat va cho
 * `login` dien `last_login_at: null`. Do la mot loi noi doi nho nhung that:
 * `null` trong hop dong nay nghia la "chua bao gio dang nhap", nen mot giao
 * dien doc gia tri do tu phan hoi dang nhap se hien SAI — va nguoi dung vua
 * dang nhap xong thi khong the "chua bao gio dang nhap".
 *
 * Cach con lai la `last_login_at?: string | null`, tuc la bat frontend hoi
 * "khong co truong" khac "co truong bang null" o moi cho dung. Hai kieu co
 * ten thi moi endpoint noi dung nhung gi no biet, va `UserView` la tap CHA
 * cua `UserIdentityView` nen ma dung chung van dung duoc ca hai.
 */
export type UserView = AdminUserView;

export function toUserView(u: User): UserView {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    last_login_at: u.lastLoginAt?.toISOString() ?? null,
  };
}

export function toUserIdentityView(u: UserIdentityView): UserIdentityView {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}
