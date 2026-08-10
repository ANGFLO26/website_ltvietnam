import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProductCardView } from '@ltv/contracts';
import { ProductCard } from '@/components/product/ProductCard';
import {
  hasCatalogueQuery,
  parseProductFilters,
  productFilterHref,
  removeFilterValue,
  toggleFilterValue,
  withPage,
} from '@/lib/filter';
import { getDictionary } from '@/lib/i18n';

const dictionary = getDictionary('en');

describe('W2 URL filter contract', () => {
  it('keeps repeated values as OR and different dimensions together as AND', () => {
    const filters = parseProductFilters({
      brand: ['pac', 'herzog'],
      standard: 'astm-d86',
      page: '2',
    });
    expect(filters.brand).toEqual(['pac', 'herzog']);
    expect(filters.standard).toEqual(['astm-d86']);
    expect(productFilterHref(filters)).toBe(
      '/products/all?brand=pac&brand=herzog&standard=astm-d86&page=2',
    );
  });

  it('removing PAC leaves Herzog and resets pagination', () => {
    const filters = parseProductFilters({ brand: ['pac', 'herzog'], page: '4' });
    const next = removeFilterValue(filters, 'brand', 'pac');
    expect(next.brand).toEqual(['herzog']);
    expect(next.page).toBe(1);
    expect(productFilterHref(next)).toBe('/products/all?brand=herzog');
  });

  it('toggle, reload parsing and pagination all derive from URL data', () => {
    const initial = parseProductFilters({ category: 'cold-properties', sort: 'newest' });
    const selected = toggleFilterValue(initial, 'brand', 'isl');
    const href = productFilterHref(withPage(selected, 3));
    const url = new URL(href, 'https://example.test');
    const reloaded = parseProductFilters(Object.fromEntries(url.searchParams.entries()));

    expect(href).toContain('category=cold-properties');
    expect(href).toContain('brand=isl');
    expect(reloaded).toMatchObject({
      category: ['cold-properties'],
      brand: ['isl'],
      sort: 'newest',
      page: 3,
    });
  });

  it('marks filter, sort and page variants for noindex metadata', () => {
    expect(hasCatalogueQuery(parseProductFilters({}))).toBe(false);
    expect(hasCatalogueQuery(parseProductFilters({ category: 'cold-properties' }))).toBe(true);
    expect(hasCatalogueQuery(parseProductFilters({ sort: 'name' }))).toBe(true);
    expect(hasCatalogueQuery(parseProductFilters({ page: '2' }))).toBe(true);
  });
});

describe('W2 product card', () => {
  it('renders standards already included in the card response', () => {
    const product: ProductCardView = {
      slug: 'optidist-2',
      name: 'OptiDist 2',
      model: 'OptiDist 2',
      short_description: 'Automatic distillation analyzer',
      featured_image_id: null,
      brand: { slug: 'isl', name: 'ISL' },
      standards: [{ slug: 'astm-d86', organization: 'ASTM', code: 'D86', name: 'Distillation' }],
      is_featured: true,
      discontinued: false,
    };

    render(<ProductCard product={product} dictionary={dictionary} />);
    expect(screen.getByRole('heading', { name: 'OptiDist 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ASTM D86' })).toHaveAttribute(
      'href',
      '/products/standard/astm-d86',
    );
  });
});
