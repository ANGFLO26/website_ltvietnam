import { describe, expect, it } from 'vitest';
import { fromFaq, toFaq } from './content.js';

describe('structured FAQ persistence', () => {
  it('round-trips the dedicated FAQ envelope', () => {
    const faq = {
      version: 1 as const,
      items: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          question: 'Question?',
          answer_spans: [{ text: 'Answer.' }],
        },
      ],
    };
    expect(toFaq(JSON.parse(fromFaq(faq)))).toEqual(faq);
  });

  it('fails closed to an empty FAQ for legacy or malformed JSON', () => {
    expect(toFaq([])).toEqual({ version: 1, items: [] });
    expect(toFaq({ version: 1, items: [{ question: 'Missing fields' }] })).toEqual({
      version: 1,
      items: [],
    });
  });
});
