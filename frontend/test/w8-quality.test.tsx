import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationView } from '@ltv/contracts';
import { InquiryLauncher } from '@/components/inquiry/InquiryLauncher';
import { MobileMenu } from '@/components/layout/MobileMenu';
import type { PublicCaptchaConfig } from '@/config';
import { getDictionary } from '@/lib/i18n';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const FRONTEND = resolve(import.meta.dirname, '..');
const dictionary = getDictionary('en');
const captcha: PublicCaptchaConfig = {
  provider: null,
  siteKey: null,
  developmentBypass: true,
};
const navigation: NavigationView = {
  location: 'mobile',
  menus: [
    {
      code: 'mobile',
      name: 'Mobile',
      location: 'mobile',
      items: [{ label: 'Products', url: '/products', open_new_tab: false, children: [] }],
    },
  ],
  product_mega_menu: null,
};

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('W8 measurable frontend quality', () => {
  it('closes the mobile menu with Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(<MobileMenu navigation={navigation} dictionary={dictionary} />);

    const trigger = screen.getByRole('button', { name: dictionary.layout.openMenu });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const productLink = screen.getByRole('link', { name: 'Products' });
    productLink.focus();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('link', { name: 'Products' })).toBeNull());
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('returns focus after the inquiry modal closes', async () => {
    const user = userEvent.setup();
    render(
      <InquiryLauncher
        locale="en"
        dictionary={dictionary}
        captcha={captcha}
        label={dictionary.layout.requestQuote}
      />,
    );

    const trigger = screen.getByRole('button', { name: dictionary.layout.requestQuote });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: dictionary.inquiry.quotationTitle });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await user.click(screen.getByRole('button', { name: dictionary.inquiry.close }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('traps Tab focus inside the inquiry modal', async () => {
    const user = userEvent.setup();
    render(
      <InquiryLauncher
        locale="en"
        dictionary={dictionary}
        captcha={captcha}
        label={dictionary.layout.requestQuote}
      />,
    );
    await user.click(screen.getByRole('button', { name: dictionary.layout.requestQuote }));
    const dialog = screen.getByRole('dialog', { name: dictionary.inquiry.quotationTitle });
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      ),
    ];
    const first = focusable[0]!;
    const last = focusable.at(-1)!;

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(first).toHaveFocus();
    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('keeps focus contrast and reduced-motion safeguards', () => {
    const css = read('src/app/globals.css');
    const focusColor = css.match(/--focus-ring:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(focusColor).toBeDefined();
    expect(contrastRatio(focusColor!, '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important');
    expect(css).toContain('transition-duration: 0.01ms !important');
  });

  it('keeps Next image optimization enabled with AVIF and WebP', () => {
    const gallery = read('src/components/product/ProductGallery.tsx');
    const blocks = read('src/components/content/ContentBlocks.tsx');
    const nextConfig = read('next.config.mjs');
    expect(gallery).not.toContain('unoptimized');
    expect(blocks).not.toContain('unoptimized');
    expect(gallery).toContain('sizes=');
    expect(blocks).toContain('sizes=');
    expect(nextConfig).toContain("formats: ['image/avif', 'image/webp']");
  });

  it('keeps measurable W8 quality budgets and four required viewports', () => {
    const quality = JSON.parse(read('web-quality.config.json')) as {
      javascript_budget_kib: number;
      minimum_route_count: number;
      lcp_budget_ms: number;
      cls_budget: number;
      minimum_accessibility_score: number;
      viewports: readonly { width: number }[];
    };
    expect(quality.javascript_budget_kib).toBe(150);
    expect(quality.minimum_route_count).toBe(41);
    expect(quality.lcp_budget_ms).toBe(2500);
    expect(quality.cls_budget).toBe(0.1);
    expect(quality.minimum_accessibility_score).toBe(1);
    expect(quality.viewports.map((viewport) => viewport.width)).toEqual([390, 768, 1024, 1440]);
  });
});

function read(path: string): string {
  return readFileSync(resolve(FRONTEND, path), 'utf8');
}

function contrastRatio(left: string, right: string): number {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}
