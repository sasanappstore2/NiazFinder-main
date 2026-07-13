import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import type { CategoryFilterField } from '@/config/category-filters/types';
import {
  CATEGORY_SECTION_LABEL_OVERRIDES,
  getRootSectionConfig,
  resolveSectionKeyForField,
  resolveSectionLabel,
  SKIP_INTAKE_SECTION_FIELDS,
} from '@/intake/template/sectionGroups';
import type { TemplateSection } from '@/intake/template/types';
import { getPackIntakeMeta } from '@/intake/rules/pack-intake-manifest';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';

function intakeFilterFields(categorySlug: string): CategoryFilterField[] {
  return getMergedFieldsForCategory(categorySlug, 'need').filter(
    (f) => f.intake !== false && !f.key.startsWith('_')
  );
}

function collectAssignedKeys(sections: TemplateSection[]): Set<string> {
  const keys = new Set<string>();
  for (const section of sections) {
    for (const key of section.fields) {
      keys.add(key);
    }
  }
  return keys;
}

function ensureSpecsSection(sections: TemplateSection[]): TemplateSection {
  let specs = sections.find((s) => s.key === 'specs');
  if (!specs) {
    specs = { key: 'specs', label: 'فیلترهای پیشرفته', fields: [] };
    sections.push(specs);
  }
  return specs;
}

function inferSectionForPackField(
  fieldKey: string,
  rootSlug: string,
  categorySlug: string
): string | null {
  const mapped = resolveSectionKeyForField(fieldKey, rootSlug, categorySlug);
  if (mapped !== 'specs') return mapped;

  if (fieldKey === 'city' || fieldKey === 'mapPin' || fieldKey === 'neighborhood') {
    return null;
  }
  if (fieldKey.includes('budget') || fieldKey.includes('salary')) return 'budget';
  if (['brand', 'condition', 'productName', 'storage', 'ram'].includes(fieldKey)) {
    return rootSlug === 'vehicles' ? 'vehicle-specs' : 'product-specs';
  }
  if (fieldKey === 'dealType' || fieldKey === 'transactionType') return 'deal';
  if (fieldKey === 'roleType') return 'job-type';
  if (['jobTitle', 'employmentType', 'experience'].includes(fieldKey)) return 'job-details';
  if (fieldKey === 'serviceType' || fieldKey === 'when') {
    return fieldKey === 'when' ? 'timing' : 'service-details';
  }
  return null;
}

function insertSectionBeforeSpecs(
  sections: TemplateSection[],
  section: TemplateSection,
  sectionOrder: readonly string[]
): void {
  const specsIdx = sections.findIndex((s) => s.key === 'specs');
  const newIdx = sectionOrder.indexOf(section.key);
  let insertAt = specsIdx >= 0 ? specsIdx : sections.length;

  for (let i = 0; i < sections.length; i++) {
    if (sections[i]!.key === 'specs') continue;
    const existingOrder = sectionOrder.indexOf(sections[i]!.key);
    if (existingOrder >= 0 && newIdx >= 0 && existingOrder > newIdx) {
      insertAt = Math.min(insertAt, i);
    }
  }

  sections.splice(insertAt, 0, section);
}

/**
 * Merges registry intake fields into template sections for optional UI pills.
 */
export function buildIntakeSections(
  categorySlug: string,
  rootSlug: string,
  baseSections: readonly TemplateSection[]
): TemplateSection[] {
  const sections: TemplateSection[] = baseSections.map((s) => ({
    ...s,
    fields: [...s.fields],
  }));

  const config = getRootSectionConfig(rootSlug, categorySlug);
  const assigned = collectAssignedKeys(sections);
  const specsSection = ensureSpecsSection(sections);
  const packMeta = getPackIntakeMeta(categorySlug);

  const packFieldHints = new Set([
    ...(packMeta?.requiredFields ?? []),
    ...(packMeta?.optionalFields ?? []),
  ]);

  for (const field of intakeFilterFields(categorySlug)) {
    if (SKIP_INTAKE_SECTION_FIELDS.has(field.key)) continue;
    if (assigned.has(field.key)) continue;

    const isExtended = field.intakeTier === 'extended';
    const isCritical =
      field.intakeTier === 'critical' ||
      getCriticalIntakeFields(categorySlug).includes(field.key);
    let sectionKey = resolveSectionKeyForField(field.key, rootSlug, categorySlug);

    if (sectionKey === 'specs' && packFieldHints.has(field.key)) {
      const inferred = inferSectionForPackField(field.key, rootSlug, categorySlug);
      if (inferred) sectionKey = inferred;
    }

    const hasNoGroup = sectionKey === 'specs' && !packFieldHints.has(field.key);

    if (isExtended || (hasNoGroup && !isCritical)) {
      specsSection.fields.push(field.key);
      assigned.add(field.key);
      continue;
    }

    if (isCritical && sectionKey === 'specs') {
      const inferred = inferSectionForPackField(field.key, rootSlug, categorySlug);
      if (inferred) sectionKey = inferred;
    }

    let section = sections.find((s) => s.key === sectionKey);

    if (!section) {
      section = {
        key: sectionKey,
        label: resolveSectionLabel(sectionKey, rootSlug, categorySlug),
        fields: [],
      };
      insertSectionBeforeSpecs(sections, section, config.sectionOrder);
    }

    section.fields.push(field.key);
    assigned.add(field.key);
  }

  const labelOverrides = CATEGORY_SECTION_LABEL_OVERRIDES[categorySlug];
  if (labelOverrides) {
    for (const section of sections) {
      const override = labelOverrides[section.key];
      if (override) section.label = override;
    }
  }

  return sections;
}
