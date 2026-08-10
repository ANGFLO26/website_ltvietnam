import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ContentBlock, ProductDetailView, ProductRelatedView } from '@ltv/contracts';
import { ContentBlocks } from '@/components/content/ContentBlocks';
import { DiscontinuedNotice } from '@/components/product/DiscontinuedNotice';
import { ProductGallery } from '@/components/product/ProductGallery';
import { SpecificationTable } from '@/components/product/SpecificationTable';
import { getDictionary } from '@/lib/i18n';
import {
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  structuredDataJson,
} from '@/lib/structured-data';

const dictionary = getDictionary('en');

describe('W3 safe product content', () => {
  it('renders approved external video but treats raw iframe text as text', () => {
    const blocks: readonly ContentBlock[] = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        type: 'paragraph',
        spans: [{ text: '<iframe src="https://attacker.test"></iframe>' }],
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        type: 'external_video',
        provider: 'youtube',
        video_id: 'approved-video_1',
        title: 'Approved demonstration',
      },
    ];

    const { container } = render(<ContentBlocks blocks={blocks} />);
    expect(screen.getByText('<iframe src="https://attacker.test"></iframe>')).toBeInTheDocument();
    const frames = container.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/approved-video_1',
    );
    expect(frames[0]).toHaveAttribute('sandbox');
  });

  it('makes the technical table horizontally scrollable on narrow screens', () => {
    const { container } = render(
      <SpecificationTable
        specifications={[
          { group_key: 'Method', label: 'Test method', value: 'ASTM D86', unit: null },
        ]}
        dictionary={dictionary}
      />,
    );
    expect(screen.getByRole('table')).toHaveClass('min-w-[42rem]');
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
  });

  it('shows a placeholder when the product has no publishable media', () => {
    render(
      <ProductGallery
        productName="OptiDist 2"
        featuredImageId={null}
        media={[]}
        dictionary={dictionary}
      />,
    );
    expect(screen.getByText(dictionary.products.galleryPlaceholder)).toBeInTheDocument();
  });
});

describe('W3 discontinued product', () => {
  it('links the retained product page to its recommended alternative', () => {
    const related: readonly ProductRelatedView[] = [
      {
        relation_type: 'alternative',
        product: productCard('optidist-2', 'OptiDist 2'),
      },
    ];
    render(<DiscontinuedNotice related={related} dictionary={dictionary} />);
    expect(screen.getByRole('status')).toHaveTextContent(dictionary.products.discontinuedTitle);
    expect(screen.getByRole('link', { name: 'OptiDist 2' })).toHaveAttribute(
      'href',
      '/products/optidist-2',
    );
  });
});

describe('W3 structured data', () => {
  it('emits Product and BreadcrumbList without price or offers', () => {
    const product = detailFixture();
    const productData = buildProductStructuredData(product);
    const breadcrumbs = buildBreadcrumbStructuredData([
      { name: 'Home', url: 'https://example.test/' },
      { name: product.name, url: product.canonical },
    ]);
    const serialized = JSON.stringify(productData);

    expect(productData).toMatchObject({
      '@type': 'Product',
      name: 'OptiDist 2',
      model: 'OptiDist 2',
    });
    expect(serialized).not.toMatch(/"(?:price|offers)"/);
    expect(breadcrumbs).toMatchObject({ '@type': 'BreadcrumbList' });
  });

  it('escapes markup before embedding JSON in a script element', () => {
    expect(structuredDataJson({ name: '</script><script>alert(1)</script>' })).not.toContain('<');
  });
});

function productCard(slug: string, name: string): ProductRelatedView['product'] {
  return {
    slug,
    name,
    model: name,
    short_description: null,
    featured_image_id: null,
    brand: { slug: 'isl', name: 'ISL' },
    standards: [],
    is_featured: false,
    discontinued: false,
  };
}

function detailFixture(): ProductDetailView {
  return {
    canonical: 'https://example.test/products/optidist-2',
    robots: 'index,follow',
    hreflang_alternates: [],
    slug: 'optidist-2',
    name: 'OptiDist 2',
    model: 'OptiDist 2',
    short_description: 'Automatic distillation analyzer',
    brand: { slug: 'isl', name: 'ISL' },
    overview: [],
    features: [],
    applications_text: [],
    principle: [],
    sample_types: [],
    operating_conditions: [],
    accessories_options: [],
    categories: [{ slug: 'distillation', name: 'Distillation', is_primary: true }],
    standards: [],
    applications: [],
    industries: [],
    specifications: [{ group_key: 'Method', label: 'Test method', value: 'ASTM D86', unit: null }],
    media: [],
    related: [],
    featured_image_id: null,
    is_featured: true,
    discontinued: false,
    discontinued_at: null,
    seo_title: null,
    seo_description: null,
  };
}
