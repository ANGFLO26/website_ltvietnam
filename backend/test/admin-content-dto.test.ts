import { describe, expect, it } from 'vitest';
import {
  postTranslationSchema,
  serviceTranslationSchema,
} from '../src/api/dto/admin-content.dto.js';

const id = '10000000-0000-4000-8000-000000000001';

describe('A3 content DTO allowlist', () => {
  it('chan block khong duoc phep trong tung truong', () => {
    const parsed = serviceTranslationSchema.safeParse({
      benefits: [{ id, type: 'heading', level: 2, text: 'Sai vi benefits chi cho list' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('chan raw HTML block va iframe/URL luu trong video_id', () => {
    expect(
      postTranslationSchema.safeParse({
        content: [{ id, type: 'html', html: '<script>alert(1)</script>' }],
      }).success,
    ).toBe(false);
    expect(
      postTranslationSchema.safeParse({
        content: [
          {
            id,
            type: 'external_video',
            provider: 'youtube',
            video_id: 'https://youtube.com/watch?v=abc',
            title: 'Video',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('chap nhan block hop le trong truong content day du', () => {
    expect(
      postTranslationSchema.safeParse({
        title: 'Bai viet',
        slug: 'bai-viet',
        content: [{ id, type: 'paragraph', spans: [{ text: 'Noi dung' }] }],
      }).success,
    ).toBe(true);
  });
});
