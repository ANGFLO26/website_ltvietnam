import type {
  AdminBootstrapRequest,
  AdminChangePasswordRequest,
  AdminForgotPasswordRequest,
  AdminLoginRequest,
  AdminResetPasswordRequest,
  AdminSessionView,
  AdminUserView,
} from '@ltv/contracts';
import { adminBrowserRequest } from '@/lib/api/client.browser';

export const login = (input: AdminLoginRequest): Promise<AdminSessionView> =>
  adminBrowserRequest('/auth/login', {
    method: 'POST',
    body: input,
    csrf: false,
    redirectOnUnauthorized: false,
  });

export const bootstrapAdmin = (input: AdminBootstrapRequest): Promise<AdminUserView> =>
  adminBrowserRequest('/auth/bootstrap', {
    method: 'POST',
    body: input,
    csrf: false,
    redirectOnUnauthorized: false,
  });

export const forgotPassword = (input: AdminForgotPasswordRequest): Promise<void> =>
  adminBrowserRequest('/auth/forgot-password', {
    method: 'POST',
    body: input,
    csrf: false,
    redirectOnUnauthorized: false,
  });

export const resetPassword = (input: AdminResetPasswordRequest): Promise<void> =>
  adminBrowserRequest('/auth/reset-password', {
    method: 'POST',
    body: input,
    csrf: false,
    redirectOnUnauthorized: false,
  });

export const changePassword = (input: AdminChangePasswordRequest): Promise<void> =>
  adminBrowserRequest('/auth/change-password', { method: 'POST', body: input });
