import type { AppConfig } from '@ltv/config';
import { DependencyUnavailableError } from '../../shared/errors.js';

export const CAPTCHA_VERIFIER = Symbol('CAPTCHA_VERIFIER');

export interface CaptchaResult {
  readonly success: boolean;
  readonly score?: number;
}

export interface CaptchaVerifier {
  verify(token: string, ip?: string | null): Promise<CaptchaResult>;
}

interface CaptchaResponse {
  readonly success?: boolean;
  readonly score?: number;
}

export class HttpCaptchaVerifier implements CaptchaVerifier {
  constructor(
    private readonly cfg: Pick<AppConfig, 'NODE_ENV' | 'CAPTCHA_PROVIDER' | 'CAPTCHA_SECRET'>,
  ) {}

  async verify(token: string, ip?: string | null): Promise<CaptchaResult> {
    if (!this.cfg.CAPTCHA_PROVIDER || !this.cfg.CAPTCHA_SECRET) {
      // Duong local co y va khong ton tai tren production (bootstrap da chan).
      return { success: this.cfg.NODE_ENV !== 'production' && token === 'dev-bypass' };
    }

    const endpoint =
      this.cfg.CAPTCHA_PROVIDER === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
        : 'https://www.google.com/recaptcha/api/siteverify';
    const body = new URLSearchParams({ secret: this.cfg.CAPTCHA_SECRET, response: token });
    if (ip) body.set('remoteip', ip);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`captcha_http_${response.status}`);
      const result = (await response.json()) as CaptchaResponse;
      return {
        success: result.success === true,
        ...(typeof result.score === 'number' && { score: result.score }),
      };
    } catch {
      throw new DependencyUnavailableError(
        'CAPTCHA_UNAVAILABLE',
        'Khong the xac minh CAPTCHA luc nay. Vui long thu lai.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
