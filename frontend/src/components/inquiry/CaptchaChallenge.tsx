'use client';

import { useEffect, useId, useState } from 'react';
import type { PublicCaptchaConfig } from '@/config';
import type { Dictionary } from '@/lib/i18n';

interface CaptchaApi {
  render(
    container: HTMLElement,
    options: {
      readonly sitekey: string;
      readonly callback: (token: string) => void;
      readonly 'expired-callback': () => void;
      readonly 'error-callback': () => void;
    },
  ): string | number;
  reset?(widgetId: string | number): void;
  remove?(widgetId: string | number): void;
}

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    grecaptcha?: CaptchaApi;
  }
}

export function CaptchaChallenge({
  config,
  dictionary,
  onToken,
}: {
  config: PublicCaptchaConfig;
  dictionary: Dictionary;
  onToken: (token: string | null) => void;
}) {
  const containerId = `ltv-captcha-${useId().replaceAll(':', '')}`;
  const [status, setStatus] = useState<'loading' | 'ready' | 'development' | 'missing' | 'error'>(
    config.developmentBypass ? 'development' : config.provider === null ? 'missing' : 'loading',
  );

  useEffect(() => {
    if (config.developmentBypass) {
      onToken('dev-bypass');
      return;
    }
    if (config.provider === null || config.siteKey === null) {
      onToken(null);
      return;
    }

    let active = true;
    let widgetId: string | number | null = null;
    const provider = config.provider;
    const siteKey = config.siteKey;
    const apiName = provider === 'turnstile' ? 'turnstile' : 'grecaptcha';
    const scriptUrl =
      provider === 'turnstile'
        ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        : 'https://www.google.com/recaptcha/api.js?render=explicit';
    void loadScript(scriptUrl, `ltv-captcha-script-${provider}`)
      .then(() => {
        if (!active) return;
        const api = window[apiName];
        const container = document.getElementById(containerId);
        if (api === undefined || container === null) throw new Error('captcha_not_ready');
        widgetId = api.render(container, {
          sitekey: siteKey,
          callback: (token) => {
            if (!active) return;
            onToken(token);
            setStatus('ready');
          },
          'expired-callback': () => {
            if (!active) return;
            onToken(null);
            setStatus('error');
          },
          'error-callback': () => {
            if (!active) return;
            onToken(null);
            setStatus('error');
          },
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        onToken(null);
        setStatus('error');
      });

    return () => {
      active = false;
      if (widgetId === null) return;
      const api = window[apiName];
      if (provider === 'turnstile') api?.remove?.(widgetId);
      else api?.reset?.(widgetId);
    };
  }, [config.developmentBypass, config.provider, config.siteKey, containerId, onToken]);

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">
        {dictionary.inquiry.captchaLabel}
      </legend>
      {config.provider === null ? null : <div id={containerId} />}
      <p className="mt-2 text-sm text-slate-600" aria-live="polite">
        {status === 'development'
          ? dictionary.inquiry.captchaDevelopment
          : status === 'missing'
            ? dictionary.inquiry.captchaMissing
            : status === 'error'
              ? dictionary.inquiry.captchaError
              : status === 'loading'
                ? dictionary.inquiry.captchaLoading
                : null}
      </p>
    </fieldset>
  );
}

function loadScript(src: string, id: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const loaded = (): void => {
      script.dataset.loaded = 'true';
      resolve();
    };
    const failed = (): void => reject(new Error('captcha_script_failed'));
    script.addEventListener('load', loaded, { once: true });
    script.addEventListener('error', failed, { once: true });
    if (existing !== null) return;
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    document.head.append(script);
  });
}
