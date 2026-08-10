import Image from 'next/image';
import Link from 'next/link';
import type { ContentBlock, ContentLink, ProductMediaView, Span } from '@ltv/contracts';
import type { ReactNode } from 'react';
import { routePath } from '@/lib/routes';

export function ContentBlocks({
  blocks,
  media = [],
}: {
  blocks: readonly ContentBlock[];
  media?: readonly ProductMediaView[];
}) {
  const mediaById = new Map(media.map((item) => [item.media_id, item]));
  return (
    <div className="space-y-5 text-slate-700">
      {blocks.map((block) => (
        <ContentBlockView key={block.id} block={block} mediaById={mediaById} />
      ))}
    </div>
  );
}

function ContentBlockView({
  block,
  mediaById,
}: {
  block: ContentBlock;
  mediaById: ReadonlyMap<string, ProductMediaView>;
}) {
  switch (block.type) {
    case 'heading': {
      const Heading = `h${block.level}` as 'h2' | 'h3' | 'h4';
      return (
        <Heading id={block.id} className="font-bold text-slate-950">
          {block.text}
        </Heading>
      );
    }
    case 'paragraph':
      return <p>{renderSpans(block.spans)}</p>;
    case 'list': {
      const List = block.style === 'number' ? 'ol' : 'ul';
      return (
        <List
          className={`space-y-2 pl-6 ${block.style === 'number' ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((item, index) => (
            <li key={index}>{renderSpans(item.spans)}</li>
          ))}
        </List>
      );
    }
    case 'image': {
      const item = mediaById.get(block.media_id);
      if (item?.public_url === null || item === undefined) return null;
      return (
        <figure className={block.size === 'inline' ? 'max-w-xl' : undefined}>
          <Image
            className="h-auto w-full rounded-xl"
            src={item.public_url}
            alt={block.alt ?? item.alt_text ?? ''}
            width={item.width ?? 1200}
            height={item.height ?? 800}
            sizes={block.size === 'inline' ? '(min-width: 640px) 36rem, 100vw' : '100vw'}
          />
          {block.caption === undefined && item.caption === null ? null : (
            <figcaption className="mt-2 text-sm text-slate-500">
              {block.caption ?? item.caption}
            </figcaption>
          )}
        </figure>
      );
    }
    case 'gallery':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {block.items.map((entry) => {
            const item = mediaById.get(entry.media_id);
            if (item?.public_url === null || item === undefined) return null;
            return (
              <figure key={entry.media_id}>
                <Image
                  className="h-auto w-full rounded-xl"
                  src={item.public_url}
                  alt={item.alt_text ?? ''}
                  width={item.width ?? 800}
                  height={item.height ?? 600}
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
                {entry.caption === undefined ? null : (
                  <figcaption className="mt-2 text-sm text-slate-500">{entry.caption}</figcaption>
                )}
              </figure>
            );
          })}
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th className="border border-slate-300 bg-slate-100 px-4 py-3" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td className="border border-slate-300 px-4 py-3" key={cellIndex}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'external_video': {
      const source = approvedVideoSource(block.provider, block.video_id);
      if (source === null) return null;
      return (
        <figure>
          <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
            <iframe
              className="h-full w-full"
              src={source}
              title={block.title}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
          </div>
          {block.caption === undefined ? null : (
            <figcaption className="mt-2 text-sm text-slate-500">{block.caption}</figcaption>
          )}
        </figure>
      );
    }
    case 'file':
      return null;
    case 'callout':
      return (
        <aside className={calloutClass(block.variant)}>
          {block.title === undefined ? null : (
            <p className="font-semibold text-slate-950">{block.title}</p>
          )}
          <p className={block.title === undefined ? undefined : 'mt-1'}>
            {renderSpans(block.spans)}
          </p>
        </aside>
      );
    case 'divider':
      return <hr className="border-slate-300" />;
  }
}

function renderSpans(spans: readonly Span[]): ReactNode {
  return spans.map((span, index) => {
    let content: ReactNode = span.text;
    for (const mark of span.marks ?? []) {
      if (mark === 'bold') content = <strong>{content}</strong>;
      else if (mark === 'italic') content = <em>{content}</em>;
      else if (mark === 'code') content = <code>{content}</code>;
      else if (mark === 'sup') content = <sup>{content}</sup>;
      else content = <sub>{content}</sub>;
    }
    return (
      <span key={index}>{span.link === undefined ? content : linked(content, span.link)}</span>
    );
  });
}

function linked(content: ReactNode, link: ContentLink): ReactNode {
  if (link.kind === 'external') {
    return (
      <a href={link.url} rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  if (link.kind === 'anchor') return <a href={`#${link.block_id}`}>{content}</a>;
  return <Link href={internalLink(link)}>{content}</Link>;
}

function internalLink(link: Exclude<ContentLink, { kind: 'external' | 'anchor' }>): string {
  const params = { slug: link.slug };
  if (link.kind === 'product') return routePath('products.detail', { params });
  if (link.kind === 'brand') return routePath('brands.detail', { params });
  if (link.kind === 'service') return routePath('services.detail', { params });
  if (link.kind === 'project') return routePath('projects.detail', { params });
  if (link.kind === 'post') return routePath('news.detail', { params });
  if (link.kind === 'document') return routePath('resources.detail', { params });
  return routePath('about.page', { params });
}

function approvedVideoSource(provider: string, videoId: string): string | null {
  if (!/^[\w-]{1,64}$/.test(videoId)) return null;
  if (provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${videoId}`;
  if (provider === 'vimeo') return `https://player.vimeo.com/video/${videoId}`;
  return null;
}

function calloutClass(variant: 'info' | 'note' | 'warning' | 'success'): string {
  const color =
    variant === 'warning'
      ? 'border-amber-400 bg-amber-50'
      : variant === 'success'
        ? 'border-emerald-400 bg-emerald-50'
        : 'border-blue-400 bg-blue-50';
  return `rounded-r-lg border-l-4 p-4 ${color}`;
}
