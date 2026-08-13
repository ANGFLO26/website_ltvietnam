import type { ContentBlock, Span } from '@ltv/contracts';
import type { ReactNode } from 'react';

export function ContentPreview({
  blocks,
  title = 'Xem trước nội bộ',
}: {
  readonly blocks: readonly ContentBlock[];
  readonly title?: string;
}) {
  return (
    <section className="content-preview" aria-label={title}>
      <div className="content-preview__bar">
        <strong>{title}</strong>
        <span>Chưa công khai</span>
      </div>
      <div className="content-preview__body">
        {blocks.length === 0 ? (
          <p className="text-muted">Chưa có nội dung.</p>
        ) : (
          blocks.map(renderBlock)
        )}
      </div>
    </section>
  );
}

function renderBlock(block: ContentBlock): ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
      return <Tag key={block.id}>{block.text}</Tag>;
    }
    case 'paragraph':
      return <p key={block.id}>{renderSpans(block.spans)}</p>;
    case 'list': {
      const Tag = block.style === 'number' ? 'ol' : 'ul';
      return (
        <Tag key={block.id}>
          {block.items.map((item, index) => (
            <li key={index}>{renderSpans(item.spans)}</li>
          ))}
        </Tag>
      );
    }
    case 'image':
      return (
        <figure key={block.id}>
          <div className="preview-media">Ảnh media · {block.media_id}</div>
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    case 'gallery':
      return (
        <div key={block.id} className="preview-gallery">
          {block.items.map((item) => (
            <figure key={item.media_id}>
              <div className="preview-media">Ảnh · {item.media_id}</div>
              {item.caption ? <figcaption>{item.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      );
    case 'table':
      return (
        <div key={block.id} className="preview-table">
          <table>
            <thead>
              <tr>
                {block.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'external_video':
      return (
        <a
          key={block.id}
          className="preview-video"
          href={videoUrl(block.provider, block.video_id)}
          target="_blank"
          rel="noreferrer"
        >
          {block.title} · {block.provider}
        </a>
      );
    case 'file':
      return (
        <p key={block.id}>
          📎 {block.label || 'Tài liệu'} · {block.document_id}
        </p>
      );
    case 'callout':
      return (
        <aside key={block.id} className={`preview-callout preview-callout--${block.variant}`}>
          {block.title ? <strong>{block.title}</strong> : null}
          <p>{renderSpans(block.spans)}</p>
        </aside>
      );
    case 'divider':
      return <hr key={block.id} />;
  }
}

function renderSpans(spans: readonly Span[]): ReactNode {
  return spans.map((span, index) => {
    let value: ReactNode = span.text;
    for (const mark of span.marks ?? []) {
      if (mark === 'bold') value = <strong>{value}</strong>;
      else if (mark === 'italic') value = <em>{value}</em>;
      else if (mark === 'code') value = <code>{value}</code>;
      else if (mark === 'sup') value = <sup>{value}</sup>;
      else if (mark === 'sub') value = <sub>{value}</sub>;
    }
    if (span.link) value = <span className="preview-link">{value}</span>;
    return <span key={index}>{value}</span>;
  });
}

function videoUrl(provider: 'youtube' | 'vimeo', id: string): string {
  return provider === 'youtube'
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
    : `https://vimeo.com/${encodeURIComponent(id)}`;
}
