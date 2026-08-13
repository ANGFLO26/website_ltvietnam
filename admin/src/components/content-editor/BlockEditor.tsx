'use client';

import {
  FIELD_ALLOWLIST,
  MARKS,
  type BlockType,
  type ContentBlock,
  type ContentLink,
  type MediaAdminView,
  type Span,
} from '@ltv/contracts';
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MediaPicker } from '@/components/media/MediaPicker';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { duplicateBlock, parseExternalVideo } from './editor-state';

const LABELS: Record<BlockType, string> = {
  heading: 'Tiêu đề',
  paragraph: 'Đoạn văn',
  list: 'Danh sách',
  image: 'Hình ảnh',
  gallery: 'Thư viện ảnh',
  table: 'Bảng',
  external_video: 'Video YouTube/Vimeo',
  file: 'Tài liệu',
  callout: 'Khung nhấn mạnh',
  divider: 'Đường phân cách',
};
const PLACEHOLDER_ID = '00000000-0000-4000-8000-000000000000';

export interface BlockEditorProps {
  readonly field: string;
  readonly value: readonly ContentBlock[];
  readonly onChange: (blocks: ContentBlock[]) => void;
  readonly media: readonly MediaAdminView[];
  readonly documents: readonly { readonly id: string; readonly label: string }[];
}

export function BlockEditor({ field, value, onChange, media, documents }: BlockEditorProps) {
  const allowed = FIELD_ALLOWLIST[field] ?? [];
  const [type, setType] = useState<BlockType>(allowed[0] ?? 'paragraph');
  const [dragged, setDragged] = useState<number | null>(null);
  function move(from: number, to: number): void {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  }
  function replace(index: number, block: ContentBlock): void {
    onChange(value.map((item, itemIndex) => (itemIndex === index ? block : item)));
  }
  return (
    <div className="block-editor">
      <div className="block-editor__toolbar">
        <Select
          label="Loại block"
          value={type}
          onChange={(event) => setType(event.target.value as BlockType)}
        >
          {allowed.map((blockType) => (
            <option key={blockType} value={blockType}>
              {LABELS[blockType]}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          icon={<Plus size={16} />}
          disabled={value.length >= 200 || allowed.length === 0}
          onClick={() => onChange([...value, defaultBlock(type, media, documents)])}
        >
          Thêm block
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="block-editor__empty">
          Chưa có block. Chọn loại nội dung rồi nhấn “Thêm block”.
        </p>
      ) : null}
      <div className="block-editor__list">
        {value.map((block, index) => (
          <article
            key={block.id}
            className="block-card"
            draggable
            onDragStart={() => setDragged(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragged !== null) move(dragged, index);
              setDragged(null);
            }}
          >
            <div className="block-card__heading">
              <div className="block-card__identity">
                <span
                  className="block-card__handle"
                  tabIndex={0}
                  role="button"
                  aria-label={`Sắp xếp ${LABELS[block.type]}. Alt mũi tên lên hoặc xuống`}
                  onKeyDown={(event) => {
                    if (!event.altKey) return;
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      move(index, index - 1);
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      move(index, index + 1);
                    }
                  }}
                >
                  <GripVertical size={18} />
                </span>
                <strong>
                  {index + 1}. {LABELS[block.type]}
                </strong>
              </div>
              <div className="block-card__actions">
                <Button
                  type="button"
                  variant="ghost"
                  icon={<ArrowUp size={15} />}
                  aria-label="Đưa block lên"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={<ArrowDown size={15} />}
                  aria-label="Đưa block xuống"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, index + 1)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Copy size={15} />}
                  aria-label="Nhân đôi block"
                  onClick={() =>
                    onChange([
                      ...value.slice(0, index + 1),
                      duplicateBlock(block),
                      ...value.slice(index + 1),
                    ])
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  icon={<Trash2 size={15} />}
                  aria-label="Xóa block"
                  onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                />
              </div>
            </div>
            <BlockFields
              block={block}
              onChange={(next) => replace(index, next)}
              media={media}
              documents={documents}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

function BlockFields({
  block,
  onChange,
  media,
  documents,
}: {
  readonly block: ContentBlock;
  readonly onChange: (block: ContentBlock) => void;
  readonly media: readonly MediaAdminView[];
  readonly documents: readonly { readonly id: string; readonly label: string }[];
}) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="form-grid form-grid--two">
          <Select
            label="Cấp tiêu đề"
            value={block.level}
            onChange={(event) =>
              onChange({ ...block, level: Number(event.target.value) as 2 | 3 | 4 })
            }
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
          </Select>
          <Field
            label="Nội dung"
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </div>
      );
    case 'paragraph':
      return <SpanEditor value={block.spans} onChange={(spans) => onChange({ ...block, spans })} />;
    case 'list':
      return <ListFields block={block} onChange={onChange} />;
    case 'image':
      return <ImageFields block={block} onChange={onChange} media={media} />;
    case 'gallery':
      return <GalleryFields block={block} onChange={onChange} media={media} />;
    case 'table':
      return <TableFields block={block} onChange={onChange} />;
    case 'external_video':
      return <VideoFields block={block} onChange={onChange} />;
    case 'file':
      return (
        <div className="form-grid form-grid--two">
          <Select
            label="Tài liệu"
            value={block.document_id}
            onChange={(event) => onChange({ ...block, document_id: event.target.value })}
          >
            <option value={PLACEHOLDER_ID}>Chọn tài liệu</option>
            {documents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
          <Field
            label="Nhãn hiển thị"
            value={block.label ?? ''}
            onChange={(event) => onChange({ ...block, label: optional(event.target.value) })}
          />
        </div>
      );
    case 'callout':
      return (
        <>
          <div className="form-grid form-grid--two">
            <Select
              label="Kiểu"
              value={block.variant}
              onChange={(event) =>
                onChange({ ...block, variant: event.target.value as typeof block.variant })
              }
            >
              <option value="info">Thông tin</option>
              <option value="note">Ghi chú</option>
              <option value="warning">Cảnh báo</option>
              <option value="success">Thành công</option>
            </Select>
            <Field
              label="Tiêu đề"
              value={block.title ?? ''}
              onChange={(event) => onChange({ ...block, title: optional(event.target.value) })}
            />
          </div>
          <SpanEditor value={block.spans} onChange={(spans) => onChange({ ...block, spans })} />
        </>
      );
    case 'divider':
      return <p className="field__description">Đường phân cách không có nội dung chỉnh sửa.</p>;
  }
}

function SpanEditor({
  value,
  onChange,
}: {
  readonly value: readonly Span[];
  readonly onChange: (value: Span[]) => void;
}) {
  function update(index: number, patch: Partial<Span>): void {
    onChange(value.map((span, itemIndex) => (itemIndex === index ? { ...span, ...patch } : span)));
  }
  return (
    <div className="span-editor">
      {value.map((span, index) => (
        <div key={index} className="span-editor__row">
          <Textarea
            label={`Đoạn chữ ${index + 1}`}
            rows={3}
            value={span.text}
            onChange={(event) => update(index, { text: event.target.value })}
          />
          <div className="span-editor__marks">
            {MARKS.map((mark) => (
              <label key={mark}>
                <input
                  type="checkbox"
                  checked={span.marks?.includes(mark) ?? false}
                  onChange={(event) => {
                    const marks = new Set(span.marks ?? []);
                    if (event.target.checked) marks.add(mark);
                    else marks.delete(mark);
                    update(index, { marks: marks.size ? [...marks] : undefined });
                  }}
                />
                {mark}
              </label>
            ))}
          </div>
          <div className="form-grid form-grid--two">
            <Select
              label="Liên kết"
              value={span.link?.kind ?? ''}
              onChange={(event) => update(index, { link: makeLink(event.target.value) })}
            >
              <option value="">Không liên kết</option>
              <option value="external">Website HTTPS</option>
              <option value="product">Sản phẩm</option>
              <option value="service">Dịch vụ</option>
              <option value="project">Dự án</option>
              <option value="post">Bài viết</option>
              <option value="brand">Hãng</option>
              <option value="document">Tài liệu</option>
              <option value="page">Trang</option>
              <option value="anchor">Neo trong trang</option>
            </Select>
            {span.link ? (
              <Field
                label={
                  span.link.kind === 'external'
                    ? 'URL HTTPS'
                    : span.link.kind === 'anchor'
                      ? 'Block ID'
                      : 'Slug'
                }
                value={linkTarget(span.link)}
                onChange={(event) =>
                  update(index, { link: changeLinkTarget(span.link!, event.target.value) })
                }
              />
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={value.length === 1}
            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
          >
            Xóa đoạn
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={() => onChange([...value, { text: '' }])}>
        Thêm đoạn chữ
      </Button>
    </div>
  );
}

function ListFields({
  block,
  onChange,
}: {
  readonly block: Extract<ContentBlock, { type: 'list' }>;
  readonly onChange: (block: ContentBlock) => void;
}) {
  return (
    <div className="list-editor">
      <Select
        label="Kiểu danh sách"
        value={block.style}
        onChange={(event) =>
          onChange({ ...block, style: event.target.value as 'bullet' | 'number' })
        }
      >
        <option value="bullet">Dấu đầu dòng</option>
        <option value="number">Đánh số</option>
      </Select>
      {block.items.map((item, index) => (
        <div key={index} className="list-editor__item">
          <SpanEditor
            value={item.spans}
            onChange={(spans) =>
              onChange({
                ...block,
                items: block.items.map((current, itemIndex) =>
                  itemIndex === index ? { spans } : current,
                ),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            disabled={block.items.length === 1}
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter((_, itemIndex) => itemIndex !== index),
              })
            }
          >
            Xóa mục
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange({ ...block, items: [...block.items, { spans: [{ text: '' }] }] })}
      >
        Thêm mục
      </Button>
    </div>
  );
}

function ImageFields({
  block,
  onChange,
  media,
}: {
  readonly block: Extract<ContentBlock, { type: 'image' }>;
  readonly onChange: (block: ContentBlock) => void;
  readonly media: readonly MediaAdminView[];
}) {
  const selected = media.find((item) => item.id === block.media_id) ?? null;
  return (
    <div className="block-fields">
      <MediaPicker
        label="Chọn hình ảnh"
        value={selected}
        onChange={(item) => item && onChange({ ...block, media_id: item.id })}
      />
      <div className="form-grid form-grid--two">
        <Field
          label="Alt text"
          value={block.alt ?? ''}
          onChange={(event) => onChange({ ...block, alt: optional(event.target.value) })}
        />
        <Field
          label="Chú thích"
          value={block.caption ?? ''}
          onChange={(event) => onChange({ ...block, caption: optional(event.target.value) })}
        />
        <Select
          label="Kích thước"
          value={block.size}
          onChange={(event) =>
            onChange({ ...block, size: event.target.value as typeof block.size })
          }
        >
          <option value="full">Toàn chiều rộng</option>
          <option value="wide">Rộng</option>
          <option value="inline">Trong dòng</option>
        </Select>
      </div>
    </div>
  );
}

function GalleryFields({
  block,
  onChange,
  media,
}: {
  readonly block: Extract<ContentBlock, { type: 'gallery' }>;
  readonly onChange: (block: ContentBlock) => void;
  readonly media: readonly MediaAdminView[];
}) {
  const [picker, setPicker] = useState<MediaAdminView | null>(null);
  return (
    <div className="gallery-editor">
      <Select
        label="Bố cục"
        value={block.layout}
        onChange={(event) =>
          onChange({ ...block, layout: event.target.value as 'grid' | 'carousel' })
        }
      >
        <option value="grid">Lưới</option>
        <option value="carousel">Trình chiếu</option>
      </Select>
      {block.items.map((item, index) => (
        <div key={`${item.media_id}:${index}`} className="gallery-editor__item">
          <span>
            {media.find((candidate) => candidate.id === item.media_id)?.title ?? item.media_id}
          </span>
          <Field
            label="Chú thích"
            value={item.caption ?? ''}
            onChange={(event) =>
              onChange({
                ...block,
                items: block.items.map((current, itemIndex) =>
                  itemIndex === index
                    ? { ...current, caption: optional(event.target.value) }
                    : current,
                ),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            disabled={block.items.length === 1}
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter((_, itemIndex) => itemIndex !== index),
              })
            }
          >
            Xóa
          </Button>
        </div>
      ))}
      <MediaPicker
        label="Thêm ảnh vào thư viện"
        value={picker}
        onChange={(item) => {
          setPicker(null);
          if (item && !block.items.some((current) => current.media_id === item.id))
            onChange({ ...block, items: [...block.items, { media_id: item.id }] });
        }}
      />
    </div>
  );
}

function TableFields({
  block,
  onChange,
}: {
  readonly block: Extract<ContentBlock, { type: 'table' }>;
  readonly onChange: (block: ContentBlock) => void;
}) {
  return (
    <div className="form-grid form-grid--two">
      <Textarea
        label="Tên cột"
        description="Phân cách các cột bằng dấu |"
        rows={4}
        value={block.headers.join(' | ')}
        onChange={(event) => {
          const headers = splitLine(event.target.value).slice(0, 10);
          onChange({
            ...block,
            headers,
            rows: block.rows.map((row) => fitRow(row, headers.length)),
          });
        }}
      />
      <Textarea
        label="Dữ liệu"
        description="Mỗi dòng là một hàng; phân cách ô bằng dấu |"
        rows={7}
        value={block.rows.map((row) => row.join(' | ')).join('\n')}
        onChange={(event) =>
          onChange({
            ...block,
            rows: event.target.value
              .split('\n')
              .slice(0, 100)
              .map((row) => fitRow(splitLine(row), block.headers.length)),
          })
        }
      />
    </div>
  );
}

function VideoFields({
  block,
  onChange,
}: {
  readonly block: Extract<ContentBlock, { type: 'external_video' }>;
  readonly onChange: (block: ContentBlock) => void;
}) {
  const [source, setSource] = useState(block.video_id);
  const [error, setError] = useState('');
  return (
    <div className="form-grid form-grid--two">
      <Select
        label="Nền tảng"
        value={block.provider}
        onChange={(event) =>
          onChange({ ...block, provider: event.target.value as 'youtube' | 'vimeo' })
        }
      >
        <option value="youtube">YouTube</option>
        <option value="vimeo">Vimeo</option>
      </Select>
      <Field
        label="ID hoặc URL video"
        value={source}
        error={error || undefined}
        onChange={(event) => setSource(event.target.value)}
        onBlur={() => {
          const parsed = parseExternalVideo(source, block.provider);
          if (!parsed) {
            setError('Chỉ chấp nhận ID hoặc URL YouTube/Vimeo hợp lệ.');
            return;
          }
          setError('');
          setSource(parsed.videoId);
          onChange({ ...block, provider: parsed.provider, video_id: parsed.videoId });
        }}
      />
      <Field
        label="Tiêu đề"
        value={block.title}
        onChange={(event) => onChange({ ...block, title: event.target.value })}
      />
      <Field
        label="Chú thích"
        value={block.caption ?? ''}
        onChange={(event) => onChange({ ...block, caption: optional(event.target.value) })}
      />
    </div>
  );
}

function defaultBlock(
  type: BlockType,
  media: readonly MediaAdminView[],
  documents: readonly { readonly id: string }[],
): ContentBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case 'heading':
      return { id, type, level: 2, text: '' };
    case 'paragraph':
      return { id, type, spans: [{ text: '' }] };
    case 'list':
      return { id, type, style: 'bullet', items: [{ spans: [{ text: '' }] }] };
    case 'image':
      return { id, type, media_id: media[0]?.id ?? PLACEHOLDER_ID, size: 'full' };
    case 'gallery':
      return { id, type, layout: 'grid', items: [{ media_id: media[0]?.id ?? PLACEHOLDER_ID }] };
    case 'table':
      return { id, type, headers: ['Cột 1'], rows: [['']] };
    case 'external_video':
      return { id, type, provider: 'youtube', video_id: 'video-id', title: 'Video' };
    case 'file':
      return { id, type, document_id: documents[0]?.id ?? PLACEHOLDER_ID };
    case 'callout':
      return { id, type, variant: 'info', spans: [{ text: '' }] };
    case 'divider':
      return { id, type };
  }
}

function optional(value: string): string | undefined {
  return value.trim() ? value : undefined;
}
function splitLine(value: string): string[] {
  return value.split('|').map((item) => item.trim());
}
function fitRow(row: readonly string[], columns: number): string[] {
  return Array.from({ length: columns }, (_, index) => row[index] ?? '');
}
function makeLink(kind: string): ContentLink | undefined {
  if (!kind) return undefined;
  if (kind === 'external') return { kind, url: 'https://' };
  if (kind === 'anchor') return { kind, block_id: PLACEHOLDER_ID };
  return { kind: kind as Exclude<ContentLink['kind'], 'external' | 'anchor'>, slug: '' };
}
function linkTarget(link: ContentLink): string {
  return link.kind === 'external' ? link.url : link.kind === 'anchor' ? link.block_id : link.slug;
}
function changeLinkTarget(link: ContentLink, value: string): ContentLink {
  return link.kind === 'external'
    ? { ...link, url: value }
    : link.kind === 'anchor'
      ? { ...link, block_id: value }
      : { ...link, slug: value };
}
