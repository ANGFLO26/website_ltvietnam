/**
 * BO KHOA CHUA DAT — mot ban sao, khong phai ba.
 *
 * `exactOptionalPropertyTypes: true` phan biet "khong co khoa" voi "khoa co gia
 * tri `undefined`". Do la mot phan biet DUNG: mot bo loc `{ status: undefined }`
 * va mot bo loc `{}` cho ra hai cau SQL khac nhau o vai cho trong kho ma nay.
 *
 * Cai gia phai tra la moi noi dung bo loc tuy chon deu can mot ham nay. Truoc F4
 * `taxonomy/service.ts` va `products/service.ts` moi cai co mot ban rieng, va
 * `content/service.ts` la ban thu ba toi dinh viet. Ba ban sao cua cung mot ham
 * ba dong la ba cho de chung lech nhau — nen no ve day.
 *
 * Vi sao khong dung `JSON.parse(JSON.stringify(...))`: no cung bo `undefined`,
 * nhung dong thoi doi `Date` thanh chuoi va lam mat `null`. Mot cach viet ngan
 * hon nhung sai o dung nhung cho quan trong.
 */
export type BoUndefined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

export function chiCo<T extends Record<string, unknown>>(o: T): BoUndefined<T> {
  return Object.fromEntries(Object.entries(o).filter((e) => e[1] !== undefined)) as BoUndefined<T>;
}
