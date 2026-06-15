/**
 * Phase 41.3 — TEMPLATE: category filter specs for a new intake vertical.
 *
 * Copy relevant blocks into specs.ts:
 * - ROOT_SPECS['services'] for service verticals
 * - LEAF_SPECS['your-slug'] for leaf-only overrides
 *
 * Docs: docs/INTAKE_CATEGORY_FILTERS.md
 */
import type { CategoryFilterSpec } from '@/config/category-filters/types';

/** Replace YOUR_SLUG, labels, and options */
export const TEMPLATE_ROOT_SERVICES_SPECS: CategoryFilterSpec = [
  {
    key: 'serviceCategory',
    label: 'دسته خدمات',
    kind: 'chips',
    options: [
      { value: 'YOUR_SLUG', label: 'برچسب فارسی' },
      { value: 'other', label: 'سایر' },
    ],
    required: true,
    browse: false,
    intake: true,
  },
  {
    key: 'serviceType',
    label: 'شرح خدمت',
    kind: 'text',
    required: true,
    browse: false,
    intake: true,
  },
  {
    key: 'when',
    label: 'زمان',
    kind: 'chips',
    options: [
      { value: 'urgent', label: 'فوری' },
      { value: 'this_week', label: 'این هفته' },
      { value: 'flexible', label: 'انعطاف‌پذیر' },
    ],
    browse: true,
    intake: true,
  },
  {
    key: 'budget',
    label: 'بودجه تقریبی',
    kind: 'range',
    browse: false,
    intake: true,
  },
];

/**
 * Optional leaf override in LEAF_SPECS:
 *
 * 'YOUR_SLUG': [
 *   { key: 'problemType', label: 'نوع مشکل', kind: 'chips', intake: true, ... },
 * ]
 */
