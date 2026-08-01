import { describe, expect, it } from 'vitest';
import {
  validateContentField,
  extractMediaIds,
  extractDocumentIds,
  ContentValidationError,
  LIMITS,
  faqSchema,
} from './blocks.js';

const ID = '550e8400-e29b-41d4-a716-446655440000';
const ID2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const b = (o: Record<string, unknown>) => ({ id: ID, ...o });
const wrap = (...blocks: unknown[]) => ({ version: 1, blocks });

/**
 * Phep thu quan trong nhat: dung lai TRANG SAN PHAM THAT cua website hien tai
 * bang luoc do nay. Neu khong dung lai duoc thi luoc do thieu.
 * Nguon: /m/69/30/OptiDist-Atmospheric-Distillation-...aspx
 */
describe('dung lai trang OptiDist that bang block', () => {
  const optidist = wrap(
    b({
      type: 'paragraph',
      spans: [
        {
          text: 'The evaporating characteristics of hydrocarbons have an important effect on their performance. The D86 distillation method allows characterizing the tendency of a fuel to vaporize.',
        },
      ],
    }),
    b({
      type: 'paragraph',
      spans: [
        {
          text: 'Eighty years combined experience of the companies Walter Herzog and ISL in designing and manufacturing automatic distillation equipment, directed PAC in the development of the most revolutionary automated distillation analyzer ever built.',
        },
      ],
    }),
    b({ type: 'heading', level: 2, text: 'Superior Precision from the First Run' }),
    b({
      type: 'paragraph',
      spans: [
        {
          text: 'The OptiDist fully automatically sets the optimal distillation conditions through the unique ',
        },
        { text: 'heating optimizer', marks: ['bold'] },
        { text: ' technology.' },
      ],
    }),
    b({ type: 'heading', level: 2, text: 'Enhanced Instrument Features' }),
    b({
      type: 'paragraph',
      spans: [
        {
          text: 'The optimizer technology assures perfect repeatability of distillation conditions.',
        },
      ],
    }),
    b({ type: 'heading', level: 2, text: 'Unparalleled Versatility' }),
    b({ type: 'image', media_id: ID, caption: 'OptiDist trong phong thi nghiem' }),
    b({
      type: 'external_video',
      provider: 'youtube',
      video_id: 'oWs8-xpbr0I',
      title: 'OptiDist demo',
    }),
  );

  it('overview cua san pham nhan duoc toan bo noi dung that', () => {
    const r = validateContentField('products.overview', optidist);
    expect(r.blocks).toHaveLength(9);
  });

  it('Main Features 15 gach dau dong vao truong features', () => {
    const features = wrap(
      b({
        type: 'list',
        style: 'bullet',
        items: [
          'Easy to use mistake proof unit',
          'Quick connection for flask',
          'Self-positioning heater lift',
          'Automatic heater base plate detection',
          'One button straight forward operation',
          'Superior precision from the first run',
          'Measuring of the Charge Volume',
          'Enhanced instrument features',
          'Reduced VOC emission',
          'Stand Alone Unit or networked with a PC',
          'Compatible with HLIS or ALAN',
          'Customized Printer Reports',
          'Built in or external Printer',
          'Flexible LIM communication',
          'Small Foot Print',
        ].map((t) => ({ spans: [{ text: t }] })),
      }),
    );
    const r = validateContentField('products.features', features);
    expect(r.blocks[0]!.type).toBe('list');
  });

  it('trich dung media_id de dong bo content_media_refs', () => {
    expect(extractMediaIds(validateContentField('products.overview', optidist))).toEqual([ID]);
  });
});

describe('allowlist theo truong', () => {
  it('features CHI nhan list', () => {
    expect(() =>
      validateContentField(
        'products.features',
        wrap(b({ type: 'paragraph', spans: [{ text: 'x' }] })),
      ),
    ).toThrow(/khong duoc phep o truong/);
  });
  it('mo ta danh muc khong nhan external_video', () => {
    expect(() =>
      validateContentField(
        'product_categories.description',
        wrap(b({ type: 'external_video', provider: 'youtube', video_id: 'abc', title: 't' })),
      ),
    ).toThrow(/khong duoc phep/);
  });
  it('truong khong khai bao bi tu choi', () => {
    expect(() => validateContentField('bang.khong_ton_tai', wrap())).toThrow(/allowlist/);
  });
});

describe('bao mat', () => {
  it('chan link javascript:', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(
          b({
            type: 'paragraph',
            spans: [{ text: 'x', link: { kind: 'external', url: 'javascript:alert(1)' } }],
          }),
        ),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan link http:// khong ma hoa', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(
          b({
            type: 'paragraph',
            spans: [{ text: 'x', link: { kind: 'external', url: 'http://a.com' } }],
          }),
        ),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan provider video ngoai whitelist', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(b({ type: 'external_video', provider: 'tiktok', video_id: 'x', title: 't' })),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan video_id chua ky tu la (chong nhung URL)', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(
          b({
            type: 'external_video',
            provider: 'youtube',
            video_id: 'https://evil.com/x',
            title: 't',
          }),
        ),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan image dung URL thay vi media_id', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap({ id: ID, type: 'image', url: 'https://evil.com/x.jpg' }),
      ),
    ).toThrow(ContentValidationError);
  });
  it('khong cho heading level 1', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(b({ type: 'heading', level: 1, text: 'x' })),
      ),
    ).toThrow(ContentValidationError);
  });
  it('file phai tro qua document_id, khong tro thang media', () => {
    expect(() =>
      validateContentField('page_translations.content', wrap(b({ type: 'file', media_id: ID }))),
    ).toThrow(ContentValidationError);
  });
});

describe('gioi han xu ly (B25)', () => {
  it('chan qua so block cho phep', () => {
    const many = Array.from({ length: LIMITS.blocksPerField + 1 }, () => b({ type: 'divider' }));
    expect(() => validateContentField('page_translations.content', wrap(...many))).toThrow(
      ContentValidationError,
    );
  });
  it('chan van ban qua dai', () => {
    expect(() =>
      validateContentField(
        'page_translations.content',
        wrap(b({ type: 'paragraph', spans: [{ text: 'a'.repeat(LIMITS.textPerBlock + 1) }] })),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan gallery qua nhieu anh', () => {
    const items = Array.from({ length: LIMITS.imagesPerGallery + 1 }, () => ({ media_id: ID }));
    expect(() =>
      validateContentField(
        'project_translations.implementation',
        wrap(b({ type: 'gallery', layout: 'grid', items })),
      ),
    ).toThrow(ContentValidationError);
  });
  it('chan table co dong lech so cot', () => {
    expect(() =>
      validateContentField(
        'products.principle',
        wrap(b({ type: 'table', headers: ['a', 'b'], rows: [['1']] })),
      ),
    ).toThrow(ContentValidationError);
  });
});

describe('tuong thich va tien ich', () => {
  it('chap nhan mang tran (du lieu cu) va tu boc phong bi', () => {
    const r = validateContentField('page_translations.content', [b({ type: 'divider' })]);
    expect(r.version).toBe(1);
    expect(r.blocks).toHaveLength(1);
  });
  it('noi dung rong hop le', () => {
    expect(validateContentField('page_translations.content', []).blocks).toHaveLength(0);
  });
  it('trich document_id tu block file', () => {
    const c = validateContentField(
      'page_translations.content',
      wrap(b({ type: 'file', document_id: ID2 })),
    );
    expect(extractDocumentIds(c)).toEqual([ID2]);
  });
  it('media_id trung chi tra ve mot lan', () => {
    const c = validateContentField(
      'page_translations.content',
      wrap(b({ type: 'image', media_id: ID }), { id: ID2, type: 'image', media_id: ID }),
    );
    expect(extractMediaIds(c)).toEqual([ID]);
  });
  it('FAQ dung cau truc rieng, map thang sang JSON-LD', () => {
    const faq = {
      version: 1,
      items: [
        {
          id: ID,
          question: 'Bao lau thi hieu chuan mot lan?',
          answer_spans: [{ text: 'Moi 12 thang.' }],
        },
      ],
    };
    expect(faqSchema.safeParse(faq).success).toBe(true);
  });
});
