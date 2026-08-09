import { Controller, Get, Inject, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { MEDIA_SERVICE, type MediaService } from '../../services/media/interface.js';
import { Public } from '../admin/auth.guard.js';
import { MediaPathPipe } from '../../shared/http/media-path.pipe.js';

@Public()
@Controller('media')
export class PublicMediaController {
  constructor(@Inject(MEDIA_SERVICE) private readonly media: MediaService) {}

  @Get('*')
  async open(
    @Param('0', MediaPathPipe) assetPath: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.media.openPublic(assetPath);
    res.setHeader('Cache-Control', file.cacheControl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.stream, {
      type: file.mimeType,
      length: file.size,
      disposition: 'inline',
    });
  }
}
