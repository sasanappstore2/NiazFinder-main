import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import type { IntakeTemplate, ResolveTemplateInput } from '@/intake/template/types';
import { buildFieldMapFromSections } from '@/intake/template/buildFieldMap';
import {
  DEFAULT_VERTICAL_POLICY,
  resolveVerticalPolicy,
} from '@/intake/template/verticalPolicy';

function resolveLeafSlug(input: ResolveTemplateInput): string | null {
  const normalized = normalizeCategoryPair(
    input.categorySlug ?? '',
    input.subcategorySlug ?? undefined
  );
  return normalized.subcategorySlug ?? normalized.categorySlug ?? input.categorySlug ?? null;
}

function inferCategoryFromSlug(leafSlug: string): string | null {
  if (leafSlug.includes('apartment')) return 'apartment';
  if (leafSlug.includes('villa')) return 'villa';
  if (leafSlug.includes('shop') || leafSlug.includes('store')) return 'shop';
  if (leafSlug.includes('office')) return 'office';
  if (leafSlug.includes('land')) return 'land';
  if (leafSlug.includes('car') || leafSlug.includes('vehicle')) return 'car';
  if (leafSlug.includes('plumb')) return 'plumbing';
  return null;
}

/**
 * Resolves intake template from category tree + specs (canonical identity).
 */
export function resolveTemplate(input: ResolveTemplateInput = {}): IntakeTemplate {
  const leafSlug = resolveLeafSlug(input);
  const path = leafSlug ? getCategoryPath(leafSlug) : [];
  const rootSlug = path[0]?.slug ?? 'general';
  const categoryPath = path.map((node) => node.slug);
  const parentSlug = path.length >= 2 ? path[path.length - 2]?.slug : null;
  const templateId = parentSlug ?? leafSlug ?? rootSlug;

  const inferredCategory = leafSlug ? inferCategoryFromSlug(leafSlug) : null;
  const category = input.category ?? inferredCategory ?? DEFAULT_VERTICAL_POLICY.category;

  const policy = resolveVerticalPolicy({
    rootSlug,
    category,
    vertical: input.vertical,
    categorySlug: leafSlug,
    transactionType: input.transactionType,
  });

  const sections = policy.sections.map((s) => ({
    ...s,
    fields: [...s.fields],
  }));

  const fieldMap = leafSlug
    ? buildFieldMapFromSections(leafSlug, sections)
    : buildFieldMapFromSections(templateId, sections);

  const requiresMapPin =
    policy.vertical === 'real-estate' &&
    policy.requiredFields.some((f) => f === 'city' || f === 'neighborhood');

  return {
    id: templateId,
    schemaVersion: 1,
    rootSlug,
    categoryPath,
    vertical: policy.vertical,
    category: policy.category,
    proposalMode: policy.proposalMode,
    sections,
    requiredFields: policy.requiredFields,
    optionalFields: policy.optionalFields,
    mandatorySectionKeys: new Set(policy.mandatorySectionKeys),
    fieldMap,
    rules: {
      publish: {
        requiredFields: policy.requiredFields,
        requiresMapPin,
      },
      location: {
        requiresMapPin: policy.vertical === 'real-estate',
      },
    },
  };
}

export function resolveTemplateFromDraftEntities(entities: {
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  vertical?: string | null;
  category?: string | null;
  transactionType?: string | null;
}): IntakeTemplate {
  return resolveTemplate({
    categorySlug: entities.categorySlug,
    subcategorySlug: entities.subcategorySlug,
    vertical: entities.vertical,
    category: entities.category,
    transactionType: entities.transactionType,
  });
}
