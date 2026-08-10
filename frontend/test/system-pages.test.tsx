import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from '@/app/error';
import NotFoundPage from '@/app/not-found';
import { getDictionary } from '@/lib/i18n';

const dictionary = getDictionary('en');

describe('system pages', () => {
  it('renders 404 without contacting the API', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      dictionary.errors.notFoundTitle,
    );
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: dictionary.search.browseProducts })).toHaveAttribute(
      'href',
      '/products',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not expose error details and lets the user retry', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ErrorPage error={new Error('SECRET_STACK_CONTENT')} reset={reset} />,
    );
    expect(container).not.toHaveTextContent('SECRET_STACK_CONTENT');
    await user.click(screen.getByRole('button', { name: dictionary.common.retry }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
