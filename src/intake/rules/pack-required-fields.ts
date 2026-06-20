/**
 * Client-safe required-field hints from rule packs (no fs).
 * @deprecated Prefer getPackRequiredFields from pack-intake-manifest.ts
 */
export {
  getPackIntakeMeta,
  getPackOptionalFields,
  getPackRequiredFields,
} from '@/intake/rules/pack-intake-manifest';
