import { Controller, Get, Header, Inject, Param } from '@nestjs/common';
import { LOCALES, type Locale } from '@ltv/contracts';
import { SEO_SERVICE, type SeoService } from '../../services/seo/interface.js';
import { DomainError } from '../../shared/errors.js';
import { NoEnvelope } from '../../shared/http/envelope.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { Public } from '../admin/auth.guard.js';

/** Ba tai nguyen SEO nam o goc domain, ngoai `/api/v1`. */
@NoEnvelope()
@Public()
@Controller()
export class SeoController {
  constructor(@Inject(SEO_SERVICE) private readonly seo: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  sitemapIndex(): string {
    return this.seo.sitemapIndex();
  }

  @Get('sitemap-:locale.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  sitemap(@Param('locale', SlugPipe) rawLocale: string): Promise<string> {
    if (!(LOCALES as readonly string[]).includes(rawLocale)) {
      throw new DomainError(
        'VALIDATION_FAILED',
        `Locale sitemap khong hop le: "${rawLocale}"`,
        'VALIDATION_FAILED',
        { fields: [{ field: 'locale', message: 'phai la en | vi' }] },
      );
    }
    return this.seo.sitemap(rawLocale as Locale);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  robots(): Promise<string> {
    return this.seo.robots();
  }
}
