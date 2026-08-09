import { Controller, Get, Inject, Param, StreamableFile } from '@nestjs/common';
import { MEDIA_SERVICE, type MediaService } from '../../services/media/interface.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { Public } from '../admin/auth.guard.js';

@Public()
@Controller('documents')
export class DocumentDownloadController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Get(':slug/download')
  async download(@Param('slug', SlugPipe) slug: string) {
    const file = await this.media.downloadDocument(slug);
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.size,
      disposition: contentDisposition(file.fileName),
    });
  }
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
