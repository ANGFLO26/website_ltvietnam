import type { ContentBlock } from '@ltv/contracts';
import { describe, expect, it } from 'vitest';
import {
  createEditorState,
  parseExternalVideo,
  serializeEditorState,
} from '@/components/content-editor/editor-state';

const blocks: ContentBlock[] = [
  { id: '10000000-0000-4000-8000-000000000001', type: 'heading', level: 2, text: 'Năng lực' },
  {
    id: '10000000-0000-4000-8000-000000000002',
    type: 'paragraph',
    spans: [
      { text: 'LTV ', marks: ['bold', 'italic'], link: { kind: 'service', slug: 'bao-tri' } },
      { text: 'Việt Nam' },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    type: 'list',
    style: 'number',
    items: [
      { spans: [{ text: 'Khảo sát', marks: ['bold'] }] },
      {
        spans: [
          {
            text: 'Triển khai',
            link: { kind: 'anchor', block_id: '10000000-0000-4000-8000-000000000001' },
          },
        ],
      },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    type: 'image',
    media_id: '20000000-0000-4000-8000-000000000001',
    caption: 'Thiết bị',
    alt: 'Kỹ sư vận hành',
    size: 'wide',
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    type: 'gallery',
    layout: 'carousel',
    items: [
      { media_id: '20000000-0000-4000-8000-000000000002', caption: 'Trước' },
      { media_id: '20000000-0000-4000-8000-000000000003', caption: 'Sau' },
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    type: 'table',
    headers: ['Thông số', 'Giá trị'],
    rows: [
      ['Áp suất', '10 bar'],
      ['Nhiệt độ', '80 °C'],
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    type: 'external_video',
    provider: 'youtube',
    video_id: 'AbC_123-x',
    title: 'Video vận hành',
    caption: 'Không lưu iframe',
  },
  {
    id: '10000000-0000-4000-8000-000000000008',
    type: 'file',
    document_id: '30000000-0000-4000-8000-000000000001',
    label: 'Datasheet',
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    type: 'callout',
    variant: 'warning',
    title: 'Lưu ý',
    spans: [
      {
        text: 'Đọc hướng dẫn',
        marks: ['italic'],
        link: { kind: 'external', url: 'https://example.com/safety' },
      },
    ],
  },
  { id: '10000000-0000-4000-8000-000000000010', type: 'divider' },
];

describe('A3 block editor round-trip', () => {
  it('giu nguyen ca 10 block, id, marks, link, media va thu tu khi khong sua', () => {
    expect(serializeEditorState(createEditorState(blocks))).toEqual(blocks);
  });

  it('state VI va EN khong dung chung tham chieu', () => {
    const vi = createEditorState(blocks);
    const en = createEditorState(blocks);
    (en[1] as Extract<ContentBlock, { type: 'paragraph' }>).spans[0]!.text = 'English only';
    expect((vi[1] as Extract<ContentBlock, { type: 'paragraph' }>).spans[0]!.text).toBe('LTV ');
  });

  it('chi chuyen URL YouTube/Vimeo thanh provider va video ID', () => {
    expect(parseExternalVideo('https://youtu.be/AbC_123-x')).toEqual({
      provider: 'youtube',
      videoId: 'AbC_123-x',
    });
    expect(parseExternalVideo('https://vimeo.com/123456')).toEqual({
      provider: 'vimeo',
      videoId: '123456',
    });
    expect(parseExternalVideo('https://evil.example/embed/123')).toBeNull();
  });
});
