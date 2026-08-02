import type { Selectable } from 'kysely';
import type { BannersTable } from '@ltv/db';
import type { Banner, BannerLinkType, BannerStatus } from './object.js';

export function toBanner(row: Selectable<BannersTable>): Banner {
  return {
    id: row.id,
    imageId: row.image_id,
    mobileImageId: row.mobile_image_id,
    title: row.title,
    subtitle: row.subtitle,
    buttonLabel: row.button_label,
    imageAlt: row.image_alt,
    linkType: row.link_type as BannerLinkType,
    linkTargetId: row.link_target_id,
    customUrl: row.custom_url,
    openNewTab: row.open_new_tab,
    status: row.status as BannerStatus,
    displayOrder: row.display_order,
    startAt: row.start_at,
    endAt: row.end_at,
  };
}
