import { describe, expect, it, vi } from 'vitest';
import { AdminPublishController } from '../src/api/admin/publish.controller.js';
import type { PublishService } from '../src/services/shared/publish.interface.js';

const id = '11111111-1111-4111-8111-111111111111';

describe('AdminPublishController', () => {
  it('returns a stable blockers array for successful preflight', async () => {
    const check = vi.fn(async () => ({ ok: true as const }));
    const controller = new AdminPublishController(publisher(check));

    await expect(controller.check({ entity: 'product', id })).resolves.toEqual({
      ok: true,
      blockers: [],
    });
    expect(check).toHaveBeenCalledWith({ entity: 'product', id });
  });

  it('forwards all blockers and validates locale semantics', async () => {
    const check = vi.fn(async () => ({
      ok: false as const,
      blockers: [{ field: 'featured_image_id', message: 'Can anh dai dien' }],
    }));
    const controller = new AdminPublishController(publisher(check));

    await expect(controller.check({ entity: 'post', id, locale: 'vi' })).resolves.toEqual({
      ok: false,
      blockers: [{ field: 'featured_image_id', message: 'Can anh dai dien' }],
    });
    await expect(controller.check({ entity: 'post', id })).rejects.toThrow();
  });
});

function publisher(check: PublishService['check']): PublishService {
  return {
    check,
    publish: vi.fn(async () => undefined),
    unpublish: vi.fn(async () => undefined),
  };
}
