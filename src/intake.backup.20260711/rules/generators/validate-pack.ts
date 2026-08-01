import type { RulePack } from '@/intake/rules/types';

export function validateRulePack(pack: RulePack): string[] {
  const errors: string[] = [];
  if (!pack.meta?.slug) errors.push('missing meta.slug');
  if (!pack.rules?.length) errors.push('empty rules');
  const ids = new Set<string>();
  for (const r of pack.rules) {
    if (!r.id) errors.push('rule missing id');
    if (ids.has(r.id)) errors.push(`duplicate id ${r.id}`);
    ids.add(r.id);
    if (!r.slug) errors.push(`rule ${r.id} missing slug`);
    if (!r.pattern?.trim()) errors.push(`rule ${r.id} empty pattern`);
    if (r.kind !== 'negative' && r.slug !== pack.meta.slug) {
      errors.push(`rule ${r.id} slug mismatch ${r.slug} vs ${pack.meta.slug}`);
    }
  }
  return errors;
}
