import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InquiryForm } from '@/components/inquiry/InquiryForm';
import type { PublicCaptchaConfig } from '@/config';
import { createInquiryRequestId } from '@/lib/idempotency';
import { getDictionary } from '@/lib/i18n';
import { requestSuccessMetadata } from '@/lib/w5/success';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const dictionary = getDictionary('en');
const captcha: PublicCaptchaConfig = {
  provider: null,
  siteKey: null,
  developmentBypass: true,
};
const requestId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

beforeEach(() => {
  pushMock.mockReset();
  vi.unstubAllGlobals();
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => requestId) });
});

describe('W5 inquiry form', () => {
  it('shows validation errors in text without sending an invalid request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <InquiryForm locale="en" dictionary={dictionary} captcha={captcha} allowTypeSelection />,
    );

    const submit = screen.getByRole('button', { name: dictionary.inquiry.submit });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(screen.getByRole('alert')).toHaveTextContent(dictionary.inquiry.validationSummary);
    expect(screen.getAllByText(dictionary.inquiry.requiredError).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(dictionary.inquiry.contactMethodError)).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('locks duplicate submits and sends the public product slug with one idempotency key', async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(
      <InquiryForm
        locale="en"
        dictionary={dictionary}
        captcha={captcha}
        source={{
          kind: 'product',
          slug: 'isl-optidist-2-automatic-distillation-analyzer',
          label: 'OptiDist 2',
          sourceUrl: '/products/isl-optidist-2-automatic-distillation-analyzer',
        }}
      />,
    );

    await user.type(screen.getByLabelText(/^Full name/), 'Nguyen Van A');
    await user.type(screen.getByLabelText(/^Company/), 'LTV Test');
    await user.type(screen.getByLabelText(/^Phone/), '0900000000');
    await user.type(screen.getByLabelText(/^Your requirements/), 'Please send a quotation.');
    await user.click(screen.getByLabelText(/I agree to the privacy policy/));

    const submit = screen.getByRole('button', { name: dictionary.inquiry.submit });
    await waitFor(() => expect(submit).toBeEnabled());
    const form = submit.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(submit).toBeDisabled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(url).toBe('/api/v1/inquiries');
    expect(init.headers).toMatchObject({ 'idempotency-key': requestId });
    expect(payload).toMatchObject({
      inquiry_type: 'quotation',
      product_slug: 'isl-optidist-2-automatic-distillation-analyzer',
      source_url: '/products/isl-optidist-2-automatic-distillation-analyzer',
      request_id: requestId,
    });

    await act(async () => {
      resolveRequest?.(
        new Response(
          JSON.stringify({ data: { request_id: requestId, message: 'Request accepted' } }),
          { status: 202, headers: { 'content-type': 'application/json' } },
        ),
      );
    });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/request-success'));
  });

  it('creates UUID request identifiers and keeps the success page out of the index', () => {
    expect(createInquiryRequestId()).toBe(requestId);
    expect(requestSuccessMetadata('vi').robots).toMatchObject({ index: false, follow: true });
    expect(requestSuccessMetadata('vi').alternates?.canonical).toBe(
      'http://localhost:3000/vi/request-success',
    );
  });
});
