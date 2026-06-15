import 'server-only';

import type { FieldSchema } from '@/contracts/need-intake';
import {
  getIntakeFieldsForCategoryBase,
  mergeIntakeFieldSpecOverrides,
} from '@/config/category-filters/registry';
import { getActiveIntakeFieldOverrides } from '@/lib/need-intake/admin-field-specs/intake-field-spec-store';

/** Intake schema fields for a category (specs + admin overrides from disk store). */
export function getIntakeFieldsForCategory(categorySlug: string): FieldSchema[] {
  const base = getIntakeFieldsForCategoryBase(categorySlug);
  const overrides = getActiveIntakeFieldOverrides(categorySlug);
  return mergeIntakeFieldSpecOverrides(base, overrides);
}
