import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { LOGGER } from '../../shared/tokens.js';
import type { Logger } from '../../shared/logging/logger.js';
import { MEDIA_SERVICE, type MediaService } from './interface.js';

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Nhip don tep vat ly. Ban ghi DB van duoc giu de truy vet purged_at. */
@Injectable()
export class MediaPurgeScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(MEDIA_SERVICE) private readonly media: MediaService,
    @Inject(LOGGER) private readonly log: Logger,
  ) {}

  onApplicationBootstrap(): void {
    // Cho bootstrap on dinh roi moi cham kho/DB; sau do lap lai dinh ky.
    this.timer = setTimeout(() => {
      void this.run();
      this.timer = setInterval(() => void this.run(), PURGE_INTERVAL_MS);
      this.timer.unref();
    }, 60_000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const count = await this.media.purgeDue();
      if (count > 0) this.log.info('media_purge_completed', { count });
    } catch (error) {
      this.log.error('media_purge_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
