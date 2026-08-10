import type { ContentBlock } from '@ltv/contracts';
import { ContentBlocks } from './ContentBlocks';

export function ContentDetailSection({
  title,
  blocks,
}: {
  title: string;
  blocks: readonly ContentBlock[];
}) {
  if (blocks.length === 0) return null;
  const content = blocks[0]?.type === 'heading' ? blocks.slice(1) : blocks;
  return (
    <section>
      <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
      {content.length === 0 ? null : (
        <div className="mt-5">
          <ContentBlocks blocks={content} />
        </div>
      )}
    </section>
  );
}
