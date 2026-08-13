import type { MediaAdminView } from '@ltv/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RelationSelector } from '@/components/forms/RelationSelector';
import { MediaPicker } from '@/components/media/MediaPicker';
import { buildProductPayload } from '@/features/products/ProductForm';

const image: MediaAdminView = {
  id: '11111111-1111-4111-8111-111111111111',
  file_name: 'photo.webp',
  original_name: 'photo.webp',
  storage_class: 'public',
  public_url: '/media/photo.webp',
  variants: {},
  mime_type: 'image/webp',
  file_extension: 'webp',
  file_size_bytes: 100,
  width: 100,
  height: 100,
  checksum: null,
  title: 'Ảnh sản phẩm',
  alt_text: 'Máy phân tích',
  caption: null,
  credit: null,
  uploaded_by: null,
  created_at: new Date(0).toISOString(),
  usage: null,
};
const pdf: MediaAdminView = {
  ...image,
  id: '22222222-2222-4222-8222-222222222222',
  file_name: 'spec.pdf',
  original_name: 'spec.pdf',
  public_url: null,
  mime_type: 'application/pdf',
  file_extension: 'pdf',
  width: null,
  height: null,
  title: 'PDF kỹ thuật',
};

vi.mock('@/features/catalogue/api', () => ({
  catalogueKeys: { media: (query = '') => ['catalogue', 'media', query] },
  listMedia: vi.fn(async () => ({
    data: [image, pdf],
    meta: { page: 1, page_size: 60, total_items: 2, total_pages: 1 },
  })),
}));

describe('A2 catalogue components', () => {
  it('bo primary khi bo chon relation dang la primary', () => {
    const onChange = vi.fn();
    const onPrimaryChange = vi.fn();
    render(
      <RelationSelector
        label="Danh mục"
        options={[{ id: 'c1', label: 'Thiết bị' }]}
        selected={['c1']}
        onChange={onChange}
        primaryId="c1"
        onPrimaryChange={onPrimaryChange}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /Thiết bị/ }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(onPrimaryChange).toHaveBeenCalledWith(null);
  });

  it('MediaPicker hinh anh khong cho PDF lot vao danh sach chon', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MediaPicker value={null} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Chọn media' }));
    await waitFor(() => expect(screen.getByText('Ảnh sản phẩm')).toBeInTheDocument());
    expect(screen.queryByText('PDF kỹ thuật')).not.toBeInTheDocument();
  });

  it('PATCH san pham chi gui tap relation da thay doi', () => {
    const value: Parameters<typeof buildProductPayload>[0] = {
      brand_id: image.id,
      name: 'Máy phân tích',
      slug: 'may-phan-tich',
      short_description: '',
      model: '',
      internal_code: '',
      sku: '',
      product_type: 'equipment',
      price_visibility: 'hidden',
      sale_mode: 'inquiry',
      warranty_months: null,
      requires_configuration: false,
      is_featured: false,
      display_order: 0,
      discontinued_at: '',
      seo_title: '',
      seo_description: '',
      overview: '[]',
      features: '[]',
      applications_text: '[]',
      principle: '[]',
      sample_types: '[]',
      operating_conditions: '[]',
      accessories_options: '[]',
    };
    const baseState: Parameters<typeof buildProductPayload>[1] = {
      featured: null,
      gallery: [],
      mediaRoles: {},
      categoryIds: [pdf.id],
      primaryCategory: pdf.id,
      standards: [],
      applicationIds: [],
      primaryApplication: null,
      industryIds: [],
      related: [],
      specs: [],
      dirtyRelations: new Set(),
      isCreate: false,
    };

    const untouched = buildProductPayload(value, baseState);
    expect(untouched).not.toHaveProperty('categories');
    expect(untouched).not.toHaveProperty('media');

    const changed = buildProductPayload(value, {
      ...baseState,
      dirtyRelations: new Set(['categories']),
    });
    expect(changed.categories).toEqual([{ category_id: pdf.id, is_primary: true }]);
    expect(changed).not.toHaveProperty('standards');
  });
});
