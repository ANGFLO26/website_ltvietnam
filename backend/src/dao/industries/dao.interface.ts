import type { Page, Paged } from '../helpers.js';
import type {
  CreateIndustryInput,
  Industry,
  IndustryFilter,
  UpdateIndustryInput,
} from './object.js';

export interface IndustryDao {
  findById(id: string): Promise<Industry | null>;
  findBySlug(slug: string): Promise<Industry | null>;
  list(filter: IndustryFilter, page?: Partial<Page>): Promise<Paged<Industry>>;

  insert(input: CreateIndustryInput): Promise<Industry>;
  update(id: string, input: UpdateIndustryInput): Promise<Industry>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Industry>;
  unpublish(id: string): Promise<Industry>;

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
