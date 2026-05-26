import { getCategoryPath } from '@/config/categories';

function getRootCategorySlug(categorySlug: string): string {
  const path = getCategoryPath(categorySlug);
  return path[0]?.slug ?? categorySlug;
}
import type { FieldSchema, FieldType } from '@/contracts/need-intake';
import type { ListingType } from '@/lib/filters/parser';
import type { CategoryFilterField, FilterAudience, ResolvedCategoryFilters } from './types';
import {
  BUSINESS_ROOT_SPECS,
  GLOBAL_BUSINESS_BROWSE_SPEC,
  GLOBAL_NEED_BROWSE_SPEC,
  INTAKE_TAIL,
  LEAF_SPECS,
  PARENT_SPECS,
  ROOT_SPECS,
} from './specs';
import { inferAttributesFromPath } from './path-inference';

function fieldVisible(
  field: CategoryFilterField,
  answers: Record<string, string>
): boolean {
  if (!field.showIf) return true;
  const val = answers[field.showIf.field] ?? '';
  if (field.showIf.equals != null) return val === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(val);
  return true;
}

function mergeFields(
  layers: CategoryFilterField[][]
): CategoryFilterField[] {
  const byKey = new Map<string, CategoryFilterField>();
  for (const layer of layers) {
    for (const f of layer) {
      if (f.key.startsWith('_')) {
        byKey.set(f.key, f);
        continue;
      }
      byKey.set(f.key, f);
    }
  }
  return Array.from(byKey.values());
}

function filterFieldsByAudience(
  fields: CategoryFilterField[],
  listingType: ListingType
): CategoryFilterField[] {
  return fields.filter((f) => {
    const audience: FilterAudience = f.audience ?? 'need';
    return audience === 'both' || audience === listingType;
  });
}

function filterKindToFieldType(kind: CategoryFilterField['kind']): FieldType {
  switch (kind) {
    case 'chips':
    case 'multi':
      return 'chips';
    case 'select':
      return 'select';
    case 'toggle':
      return 'toggle';
    case 'range':
      return 'price_range';
    case 'text':
    default:
      return 'text';
  }
}

export function filterFieldToSchema(field: CategoryFilterField): FieldSchema {
  let type: FieldType = filterKindToFieldType(field.kind);
  if (field.key === 'location') type = 'location';
  else if (field.key === 'details' || field.key === 'serviceType') type = 'textarea';
  else if (field.kind === 'range' && (field.key === 'budget' || field.key.includes('rent') || field.key.includes('rahn') || field.key.includes('deposit') || field.key.includes('salary'))) {
    type = 'price';
  } else if (field.kind === 'range' && (field.key.includes('area') || field.key.includes('year') || field.key.includes('mileage'))) {
    type = 'number';
  }

  const schema: FieldSchema = {
    key: field.key,
    type,
    label: field.label,
    placeholder: field.placeholder,
    helpText: field.helpText,
    required: field.required,
    options: field.options ? [...field.options] : undefined,
  };
  if (field.showIf?.equals != null) {
    schema.showIf = { field: field.showIf.field, equals: field.showIf.equals };
  }
  if (field.showIf?.in) {
    schema.showIfIn = { field: field.showIf.field, values: field.showIf.in };
  }
  return schema;
}

function layersForSlug(categorySlug: string | null): CategoryFilterField[][] {
  if (!categorySlug) return [];

  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug;
  const layers: CategoryFilterField[][] = [];

  if (root && ROOT_SPECS[root]) layers.push(ROOT_SPECS[root]);

  for (const node of path) {
    if (node.slug === root) continue;
    if (PARENT_SPECS[node.slug]) layers.push(PARENT_SPECS[node.slug]);
    if (LEAF_SPECS[node.slug]) layers.push(LEAF_SPECS[node.slug]);
  }

  return layers;
}

function businessLayersForSlug(categorySlug: string | null): CategoryFilterField[][] {
  if (!categorySlug) return [];

  const path = getCategoryPath(categorySlug);
  const root = path[0]?.slug;
  const layers: CategoryFilterField[][] = [];

  if (root && BUSINESS_ROOT_SPECS[root]) {
    layers.push(BUSINESS_ROOT_SPECS[root]);
  }

  return layers;
}

export function getMergedFieldsForCategory(
  categorySlug: string | null,
  listingType: ListingType
): CategoryFilterField[] {
  const global =
    listingType === 'business' ? GLOBAL_BUSINESS_BROWSE_SPEC : GLOBAL_NEED_BROWSE_SPEC;

  if (!categorySlug) {
    const fallback =
      listingType === 'business' ? [] : (ROOT_SPECS.services ?? []);
    return mergeFields([global, fallback]);
  }

  const categoryLayers =
    listingType === 'business'
      ? businessLayersForSlug(categorySlug)
      : layersForSlug(categorySlug);

  return mergeFields([global, ...categoryLayers]);
}

export function resolveFiltersFromPath(
  fields: CategoryFilterField[],
  categorySlug: string | null | undefined,
  listingType: ListingType = 'need'
): CategoryFilterField[] {
  const hiddenKeys =
    listingType === 'business'
      ? new Set<string>()
      : inferAttributesFromPath(categorySlug).hiddenKeys;

  return fields.filter((f) => {
    if (f.globalKey) return f.browse !== false;
    if (hiddenKeys.has(f.key)) return false;
    return f.browse !== false;
  });
}

export function getFiltersForCategory(
  categorySlug: string | null,
  listingType: ListingType
): ResolvedCategoryFilters {
  const merged = getMergedFieldsForCategory(categorySlug, listingType);
  const browseFields = filterFieldsByAudience(
    resolveFiltersFromPath(merged, categorySlug, listingType),
    listingType
  );
  const rootSlug = categorySlug ? getRootCategorySlug(categorySlug) : null;

  const intakeMerged = mergeFields([
    ...layersForSlug(categorySlug),
    INTAKE_TAIL,
  ]);
  const intakeFields = intakeMerged
    .filter((f) => f.intake !== false && !f.key.startsWith('_'))
    .map(filterFieldToSchema);

  const allowedUrlParams = new Set<string>();
  for (const f of browseFields) {
    if (f.globalKey) continue;
    allowedUrlParams.add(f.urlParam ?? f.key);
    if (f.kind === 'range') {
      allowedUrlParams.add(f.key);
      if (f.urlParam && f.urlParam !== f.key) allowedUrlParams.add(f.urlParam);
      const base = f.key.replace(/Min$|Max$/, '');
      if (base !== f.key) {
        allowedUrlParams.add(`${base}Min`);
        allowedUrlParams.add(`${base}Max`);
      }
    }
  }

  return {
    categorySlug,
    rootSlug,
    listingType,
    browseFields,
    intakeFields,
    allowedUrlParams,
  };
}

/** Intake schema fields for a category (replaces per-vertical hard-coded lists). */
export function getIntakeFieldsForCategory(categorySlug: string): FieldSchema[] {
  const root = getRootCategorySlug(categorySlug);
  const layers = layersForSlug(categorySlug);
  if (root && ROOT_SPECS[root]) {
    const hasRoot = layers.some((l) => l === ROOT_SPECS[root]);
    if (!hasRoot) layers.unshift(ROOT_SPECS[root]);
  }
  const merged = mergeFields([...layers, INTAKE_TAIL]);
  return merged
    .filter((f) => f.intake !== false && !f.key.startsWith('_'))
    .map(filterFieldToSchema);
}

export function getAllowedAttributeKeys(categorySlug: string | null): Set<string> {
  return getFiltersForCategory(categorySlug, 'need').allowedUrlParams;
}

export { fieldVisible };
