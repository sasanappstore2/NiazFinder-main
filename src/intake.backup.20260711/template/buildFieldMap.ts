import type { FieldSchema } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';
import type { IntakeFieldMeta, TemplateSection } from '@/intake/template/types';
import { wizardSlotToMeta, WIZARD_SLOT_SCHEMAS } from '@/intake/template/wizardSlots';

const SKIP_SPEC_KEYS = new Set([
  'city',
  'neighborhood',
  'location',
  'category',
  'serviceCategory',
  'details',
  'description',
  'budget',
  'budgetMin',
  'budgetMax',
]);

function specFieldToMeta(field: FieldSchema, sectionKey: string): IntakeFieldMeta {
  return {
    ...field,
    sectionKey,
    storage: 'answers',
  };
}

function collectSectionFieldKeys(sections: readonly TemplateSection[]): Set<string> {
  const keys = new Set<string>();
  for (const section of sections) {
    for (const key of section.fields) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Builds the canonical field map for a template: wizard slots + specs.ts intake fields.
 */
export function buildFieldMap(
  templateId: string,
  sections: TemplateSection[]
): Record<string, IntakeFieldMeta> {
  const map: Record<string, IntakeFieldMeta> = {};
  const sectionByField = new Map<string, string>();

  for (const section of sections) {
    for (const key of section.fields) {
      sectionByField.set(key, section.key);
      const slot = wizardSlotToMeta(key, section.key);
      if (slot) {
        map[key] = slot;
      }
    }
  }

  const specFields = getIntakeFieldsForCategory(templateId);
  const assigned = collectSectionFieldKeys(sections);

  for (const field of specFields) {
    if (SKIP_SPEC_KEYS.has(field.key) || assigned.has(field.key)) continue;
    const sectionKey = sectionByField.get(field.key) ?? 'specs';
    map[field.key] = specFieldToMeta(field, sectionKey);
    const specsSection = sections.find((s) => s.key === 'specs');
    if (specsSection && !specsSection.fields.includes(field.key)) {
      specsSection.fields.push(field.key);
    }
  }

  for (const [key, schema] of Object.entries(WIZARD_SLOT_SCHEMAS)) {
    if (!map[key] && assigned.has(key)) {
      const slot = wizardSlotToMeta(key, sectionByField.get(key));
      if (slot) map[key] = slot;
    } else if (!map[key] && !assigned.has(key)) {
      void schema;
    }
  }

  return map;
}

export function buildFieldMapFromSections(
  categorySlug: string,
  sections: TemplateSection[]
): Record<string, IntakeFieldMeta> {
  return buildFieldMap(categorySlug, sections.map((s) => ({ ...s, fields: [...s.fields] })));
}
