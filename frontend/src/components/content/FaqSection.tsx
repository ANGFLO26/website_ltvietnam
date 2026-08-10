import type { Faq } from '@ltv/contracts';
import { ContentBlocks } from './ContentBlocks';

export function FaqSection({ title, faq }: { title: string; faq: Faq | null | undefined }) {
  if (!Array.isArray(faq?.items) || faq.items.length === 0) return null;
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      <dl className="mt-5 space-y-6">
        {faq.items.map((item) => (
          <div className="rounded-lg border border-slate-200 bg-white p-5" key={item.id}>
            <dt className="font-semibold text-slate-950">{item.question}</dt>
            <dd className="mt-2 text-slate-700">
              <ContentBlocks
                blocks={[{ id: item.id, type: 'paragraph', spans: item.answer_spans }]}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
