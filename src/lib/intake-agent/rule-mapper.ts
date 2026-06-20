import type { IntakeRule, RulePack, RulePackMeta } from '@/intake/rules/types';
import type { IntakeDomain } from '@prisma/client';
import type { TechnicalConstraints } from '@/lib/intake-agent/types';

export function buildRuleDescription(rule: IntakeRule, meta: RulePackMeta): string {
  const setHint =
    rule.set && Object.keys(rule.set).length > 0
      ? ` → sets ${Object.entries(rule.set)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      : '';
  const unlessHint =
    rule.unless && rule.unless.length > 0 ? ` (unless: ${rule.unless.join(' | ')})` : '';
  return `[${rule.kind}] ${rule.pattern}${setHint}${unlessHint} → category "${rule.slug}" (pack: ${meta.slug})`;
}

export function ruleToTechnicalConstraints(
  rule: IntakeRule,
  meta: RulePackMeta,
): TechnicalConstraints {
  return {
    kind: rule.kind,
    pattern: rule.pattern,
    set: rule.set,
    unless: rule.unless,
    requiredFields: meta.requiredFields,
    optionalFields: meta.optionalFields,
    ...(rule.titleTemplate ? { titleTemplate: rule.titleTemplate } : {}),
  };
}

export function buildRuleSearchText(rule: IntakeRule, meta: RulePackMeta): string {
  return [
    meta.slug,
    rule.slug,
    rule.kind,
    rule.pattern,
    rule.set ? JSON.stringify(rule.set) : '',
    rule.unless?.join(' ') ?? '',
    meta.requiredFields?.join(' ') ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildCategoryRouteDescription(args: {
  title: string;
  slug: string;
  parentSlug: string | null;
  englishTitle?: string;
  requiredFields?: string[];
  optionalFields?: string[];
}): string {
  const path = args.parentSlug ? `${args.parentSlug} > ${args.slug}` : args.slug;
  const req = args.requiredFields?.length
    ? `Required intake fields: ${args.requiredFields.join(', ')}.`
    : '';
  const opt = args.optionalFields?.length
    ? `Optional fields: ${args.optionalFields.join(', ')}.`
    : '';
  return [
    `Category "${args.title}" (${path}).`,
    args.englishTitle ? `English: ${args.englishTitle}.` : '',
    req,
    opt,
  ]
    .filter(Boolean)
    .join(' ');
}

export function packRuleKey(domain: IntakeDomain, rule: IntakeRule): string {
  return `${domain}:${rule.id}`;
}

export function inferBundleType(kind: IntakeRule['kind']): string {
  if (kind === 'negative') return 'negative';
  return 'match';
}

export function summarizePackForRoute(pack: RulePack): {
  description: string;
  technicalConstraints: TechnicalConstraints;
} {
  const { meta } = pack;
  return {
    description: `Intake for ${meta.slug}: collect ${meta.requiredFields?.join(', ') || 'basic details'}.`,
    technicalConstraints: {
      requiredFields: meta.requiredFields ?? [],
      optionalFields: meta.optionalFields ?? [],
      exclusions: meta.exclusions ?? [],
      brandDictionary: meta.brandDictionary ?? [],
    },
  };
}
