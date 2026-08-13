import { anyBlockSchema, type ContentBlock } from '@ltv/contracts';
import { z } from 'zod';

export function createEditorState(blocks: readonly ContentBlock[]): ContentBlock[] {
  return z.array(anyBlockSchema).parse(clone(blocks));
}

export function serializeEditorState(blocks: readonly ContentBlock[]): ContentBlock[] {
  return z.array(anyBlockSchema).parse(clone(blocks));
}

export function duplicateBlock(block: ContentBlock): ContentBlock {
  return { ...clone(block), id: crypto.randomUUID() } as ContentBlock;
}

export function parseExternalVideo(
  input: string,
  preferred: 'youtube' | 'vimeo' = 'youtube',
): { provider: 'youtube' | 'vimeo'; videoId: string } | null {
  const value = input.trim();
  if (/^[\w-]{1,64}$/.test(value)) return { provider: preferred, videoId: value };
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return validId(id) ? { provider: 'youtube', videoId: id } : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      const id = url.pathname === '/watch' ? url.searchParams.get('v') : parts.at(-1);
      return validId(id) ? { provider: 'youtube', videoId: id } : null;
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').filter(Boolean).at(-1);
      return validId(id) ? { provider: 'vimeo', videoId: id } : null;
    }
  } catch {
    return null;
  }
  return null;
}

function validId(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[\w-]{1,64}$/.test(value);
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
