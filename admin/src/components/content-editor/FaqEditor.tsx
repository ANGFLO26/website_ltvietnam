'use client';

import type { Faq, Span } from '@ltv/contracts';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';

export function FaqEditor({
  value,
  onChange,
}: {
  readonly value: Faq;
  readonly onChange: (value: Faq) => void;
}) {
  return (
    <div className="faq-editor">
      {value.items.map((item, index) => (
        <article key={item.id} className="faq-editor__item">
          <div className="block-card__heading">
            <strong>Câu hỏi {index + 1}</strong>
            <div>
              <Button
                type="button"
                variant="ghost"
                aria-label="Nhân đôi câu hỏi"
                icon={<Copy size={16} />}
                onClick={() =>
                  onChange({
                    version: 1,
                    items: [
                      ...value.items.slice(0, index + 1),
                      {
                        ...item,
                        id: crypto.randomUUID(),
                        answer_spans: cloneSpans(item.answer_spans),
                      },
                      ...value.items.slice(index + 1),
                    ],
                  })
                }
              />
              <Button
                type="button"
                variant="ghost"
                aria-label="Xóa câu hỏi"
                icon={<Trash2 size={16} />}
                onClick={() =>
                  onChange({
                    version: 1,
                    items: value.items.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              />
            </div>
          </div>
          <Field
            label="Câu hỏi"
            value={item.question}
            onChange={(event) => update(index, { question: event.target.value })}
          />
          <Textarea
            label="Câu trả lời"
            rows={4}
            value={item.answer_spans.map((span) => span.text).join('')}
            onChange={(event) => update(index, { answer_spans: [{ text: event.target.value }] })}
          />
        </article>
      ))}
      <Button
        type="button"
        variant="secondary"
        icon={<Plus size={16} />}
        disabled={value.items.length >= 50}
        onClick={() =>
          onChange({
            version: 1,
            items: [
              ...value.items,
              { id: crypto.randomUUID(), question: '', answer_spans: [{ text: '' }] },
            ],
          })
        }
      >
        Thêm câu hỏi
      </Button>
    </div>
  );

  function update(index: number, patch: Partial<(typeof value.items)[number]>): void {
    onChange({
      version: 1,
      items: value.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });
  }
}

function cloneSpans(spans: readonly Span[]): Span[] {
  return spans.map((span) => ({
    ...span,
    marks: span.marks ? [...span.marks] : undefined,
    link: span.link ? { ...span.link } : undefined,
  }));
}
