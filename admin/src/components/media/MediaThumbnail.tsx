import type { MediaAdminView } from '@ltv/contracts';
import { FileText, ImageIcon } from 'lucide-react';
import Image from 'next/image';

export function MediaThumbnail({
  media,
  size = 160,
}: {
  readonly media: MediaAdminView;
  readonly size?: number;
}) {
  const source = media.variants.thumb ?? media.public_url;
  if (source && media.mime_type.startsWith('image/')) {
    return (
      <Image
        src={source}
        alt={media.alt_text ?? ''}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="media-thumbnail__image"
        unoptimized
      />
    );
  }
  return (
    <span className="media-thumbnail__placeholder" aria-hidden="true">
      {media.mime_type === 'application/pdf' ? <FileText size={30} /> : <ImageIcon size={30} />}
    </span>
  );
}
