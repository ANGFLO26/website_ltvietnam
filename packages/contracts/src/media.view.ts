/** Hop dong media dung chung cho man hinh quan tri F7. */

export interface MediaUsagePlaceView {
  readonly source: 'foreign_key' | 'content_block';
  readonly entity_type: string;
  readonly entity_id: string;
  readonly field_name: string;
  readonly locale: string | null;
}

export interface MediaUsageView {
  readonly foreign_keys: number;
  readonly content_blocks: number;
  readonly total: number;
  readonly places: readonly MediaUsagePlaceView[];
}

export interface MediaAdminView {
  readonly id: string;
  readonly file_name: string;
  readonly original_name: string;
  readonly storage_class: 'public' | 'protected' | 'temp' | 'quarantine';
  /** Chi public media moi co URL. Protected PDF luon la null. */
  readonly public_url: string | null;
  /** URL cong khai theo ten kich thuoc: thumb/small/medium/large. */
  readonly variants: Readonly<Record<string, string>>;
  readonly mime_type: string;
  readonly file_extension: string;
  readonly file_size_bytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly checksum: string | null;
  readonly title: string | null;
  readonly alt_text: string | null;
  readonly caption: string | null;
  readonly credit: string | null;
  readonly uploaded_by: string | null;
  readonly created_at: string;
  /** Danh sach tra null; endpoint chi tiet moi tinh usage de tranh N+1. */
  readonly usage: MediaUsageView | null;
}
