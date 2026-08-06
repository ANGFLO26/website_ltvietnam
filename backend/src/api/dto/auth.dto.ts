import { z } from 'zod';

/**
 * Kiem dau vao o BIEN — truoc khi cham toi tang service.
 *
 * `.max()` tren moi truong khong phai de bat nguoi dung go ngan; no chan
 * viec mot yeu cau 10 MB di sau vao he thong roi moi bi tu choi.
 */
export const loginSchema = z.object({
  email: z.string().trim().email('Email khong hop le').max(320),
  password: z.string().min(1, 'Thieu mat khau').max(200),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(320),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(4096),
  new_password: z.string().min(1).max(200),
});

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(200),
});

export type LoginDto = z.infer<typeof loginSchema>;
