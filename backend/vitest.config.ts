import { defineConfig } from 'vitest/config';

/**
 * `fileParallelism: false` — cac tep test KHONG chay song song.
 *
 * Do duoc: chay bo test day du 5 lan thi 1 lan do, va bai kiem do KHAC NHAU moi
 * lan. Nguyen nhan khong phai ma nguon sai ma la cac tep test tich hop dung
 * CHUNG mot co so du lieu, trong khi vai bai kiem so sanh so lieu TOAN CUC:
 *
 *   const khong = await listPublicByLocale('vi', ...);
 *   const voiUndefined = await listPublicByLocale('vi', ..., { is_featured: undefined });
 *   expect(voiUndefined.total).toBe(khong.total);
 *
 * Hai truy vien do la hai anh chup tai hai thoi diem. Mot tep test khac xuat ban
 * them mot dich vu xen vao giua thi hai tong lech nhau, va bai kiem do — du
 * KHONG co gi hong.
 *
 * Chay tuan tu cham hon, nhung mot bo test do ngau nhien 20% thi te hon cham:
 * nguoi ta se quen chay lai cho den khi xanh, va luc do no khong con bao ve gi.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    fileParallelism: false,
  },
});
