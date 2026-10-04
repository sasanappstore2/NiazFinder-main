import type { FieldSchema, NeedDraft } from '@/contracts/need-intake';
import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';
import { packRequiredFieldKeys } from '@/intake/intelligence-engine/hybrid/pack-required-gaps';
import {
  canProceedToIntakeLocation,
  INTAKE_NEED_TEXT_SKIP_DETAILS_MIN,
} from '@/lib/need-intake/compose-source-text';
import { isIntakeFieldAnswered } from '@/lib/need-intake/intake-field-answered';
import { resolveIntakeNeighborhoodFromDraft } from '@/lib/need-intake/sync-intake-location-form';
import { getPublishReadiness } from '@/intake/validation/publishValidator';

export type IntakeProgressCoreKey = 'need' | 'category' | 'city' | 'neighborhood';
export type IntakeProgressShardStatus = 'pending' | 'blocked' | 'running' | 'done';

export interface IntakeProgressFieldShard {
  key: string;
  label: string;
  required: boolean;
  status: IntakeProgressShardStatus;
}

export interface IntakeProgressSnapshot {
  core: Record<IntakeProgressCoreKey, IntakeProgressShardStatus>;
  fields: IntakeProgressFieldShard[];
  missingSummaryFa: string;
  activeShardLabel: string | null;
}

export interface BuildIntakeProgressOpts {
  enriching?: boolean;
  needText?: string;
  detailsText?: string;
}

const CORE_ORDER: IntakeProgressCoreKey[] = ['need', 'category', 'city', 'neighborhood'];

const CORE_FIELD_KEYS = new Set([
  'city',
  'citySlug',
  'neighborhood',
  'neighborhoodSlug',
  'categorySlug',
  'category',
  'subcategorySlug',
]);

const FIELD_LABELS_FA: Record<string, string> = {
  city: '\u0634\u0647\u0631',
  dealType: '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647',
  transactionType: '\u0646\u0648\u0639 \u0645\u0639\u0627\u0645\u0644\u0647',
  budget: '\u0628\u0648\u062F\u062C\u0647',
  budgetMax: '\u0628\u0648\u062F\u062C\u0647',
  budgetMin: '\u0628\u0648\u062F\u062C\u0647',
  neighborhoodSlug: '\u0645\u062D\u0644\u0647',
  neighborhood: '\u0645\u062D\u0644\u0647',
  categorySlug: '\u062F\u0633\u062A\u0647\u200c\u0628\u0646\u062F\u06CC',
  mapPin: '\u0645\u0648\u0642\u0639\u06CC\u062A \u0631\u0648\u06CC \u0646\u0642\u0634\u0647',
  rooms: '\u0627\u062A\u0627\u0642',
  area: '\u0645\u062A\u0631\u0627\u0698',
  areaMin: '\u0645\u062A\u0631\u0627\u0698',
  brand: '\u0628\u0631\u0646\u062F',
  condition: '\u0648\u0636\u0639\u06CC\u062A',
  when: '\u0632\u0645\u0627\u0646',
  serviceType: '\u0646\u0648\u0639 \u0633\u0631\u0648\u06CC\u0633',
  urgency: '\u0641\u0648\u0631\u06CC\u062A',
};

const CORE_LABELS: Record<IntakeProgressCoreKey, string> = {
  need: '\u0646\u06CC\u0627\u0632',
  category: '\u062F\u0633\u062A\u0647',
  city: '\u0634\u0647\u0631',
  neighborhood: '\u0645\u062D\u0644\u0647',
};

function fieldLabelFor(categorySlug: string, fieldKey: string): string {
  const fromRegistry = getMergedFieldsForCategory(categorySlug, 'need').find(
    (f) => f.key === fieldKey
  )?.label;
  return fromRegistry ?? FIELD_LABELS_FA[fieldKey] ?? fieldKey;
}

function isNeedFilled(draft: NeedDraft | null, opts?: BuildIntakeProgressOpts): boolean {
  const raw = (draft?.sourceText ?? draft?.parsedIntent.rawText ?? '').trim();
  if (raw.length >= 12) return true;
  if (opts?.detailsText?.trim()) return true;
  const need = opts?.needText?.trim() ?? '';
  const details = opts?.detailsText?.trim() ?? '';
  if (need && canProceedToIntakeLocation(need, details)) return true;
  if (need.length >= INTAKE_NEED_TEXT_SKIP_DETAILS_MIN) return true;
  return false;
}

function isCategoryFilled(draft: NeedDraft | null): boolean {
  if (!draft) return false;
  const entities = recordToEntities(draft.entities);
  const slug = entities.subcategorySlug || entities.categorySlug;
  const ambiguous =
    (draft.parsedIntent.categoryCandidates?.length ?? 0) >= 2 &&
    !entities.categorySlug &&
    !entities.subcategorySlug;
  return Boolean(slug) && !ambiguous;
}

function isCityFilled(draft: NeedDraft | null): boolean {
  if (!draft) return false;
  const entities = recordToEntities(draft.entities);
  return Boolean(entities.city?.trim() || draft.parsedIntent.city?.trim());
}

function isNeighborhoodFilled(draft: NeedDraft | null): boolean {
  if (!draft) return false;
  return Boolean(
    resolveIntakeNeighborhoodFromDraft(draft) ||
      (typeof draft.answers?.location === 'string' && draft.answers.location.trim().length >= 2)
  );
}

function isDraftFieldFilled(draft: NeedDraft | null, fieldKey: string): boolean {
  if (!draft) return false;
  const entities = recordToEntities(draft.entities);
  const parsed = draft.parsedIntent;
  const answers = draft.answers ?? {};

  if (fieldKey === 'city') return isCityFilled(draft);
  if (fieldKey === 'neighborhood' || fieldKey === 'neighborhoodSlug') {
    return isNeighborhoodFilled(draft);
  }
  if (fieldKey === 'categorySlug') return isCategoryFilled(draft);
  if (fieldKey === 'budget' || fieldKey === 'budgetMax' || fieldKey === 'budgetMin') {
    return hasEntityValue(entities, 'budget', { answers, sourceText: draft.sourceText });
  }
  if (fieldKey === 'dealType' || fieldKey === 'transactionType') {
    return Boolean(entities.transactionType || answers.dealType);
  }
  if (fieldKey === 'mapPin') {
    return entities.lat != null && entities.lng != null;
  }
  if (fieldKey === 'rooms') return hasEntityValue(entities, 'rooms', { answers });
  if (fieldKey === 'area' || fieldKey === 'areaMin') {
    // Square meters only — city alone must never mark area answered.
    return hasEntityValue(entities, 'area', { answers }) || Boolean(answers.areaMin || answers.area);
  }
  // ودیعه = رهن for rent deals
  if (fieldKey === 'deposit' || fieldKey === 'rahnAmount') {
    return Boolean(answers.deposit || answers.rahnAmount);
  }
  if (fieldKey === 'monthlyRent') {
    return answers.monthlyRent != null && answers.monthlyRent !== '';
  }

  const categorySlug = entities.subcategorySlug || entities.categorySlug || '';
  const meta = getMergedFieldsForCategory(categorySlug, 'need').find((f) => f.key === fieldKey);
  if (meta) {
    return isIntakeFieldAnswered(meta, answers, parsed);
  }

  const ans = answers[fieldKey];
  return ans != null && ans !== '';
}

function buildFieldShards(draft: NeedDraft | null): Array<{
  key: string;
  label: string;
  required: boolean;
  filled: boolean;
}> {
  if (!draft || !isCategoryFilled(draft)) return [];

  const entities = recordToEntities(draft.entities);
  const categorySlug = entities.subcategorySlug || entities.categorySlug || '';
  if (!categorySlug) return [];

  const requiredKeys = packRequiredFieldKeys(categorySlug).filter((k) => !CORE_FIELD_KEYS.has(k));
  const criticalKeys = getCriticalIntakeFields(categorySlug).filter(
    (k) => !CORE_FIELD_KEYS.has(k) && !requiredKeys.includes(k)
  );

  const orderedKeys = [...new Set([...requiredKeys, ...criticalKeys])].slice(0, 6);
  return orderedKeys.map((key) => ({
    key,
    label: fieldLabelFor(categorySlug, key),
    required: requiredKeys.includes(key),
    filled: isDraftFieldFilled(draft, key),
  }));
}

function applyCoreCascade(
  items: Array<{ id: string; filled: boolean; label: string }>,
  enriching: boolean
): Map<string, IntakeProgressShardStatus> {
  const statuses = new Map<string, IntakeProgressShardStatus>();
  let assignedRunning = false;
  let seenIncomplete = false;

  for (const item of items) {
    if (item.filled) {
      statuses.set(item.id, 'done');
      continue;
    }

    if (enriching && !assignedRunning) {
      statuses.set(item.id, 'running');
      assignedRunning = true;
      seenIncomplete = true;
    } else if (!seenIncomplete) {
      statuses.set(item.id, 'pending');
      seenIncomplete = true;
    } else {
      statuses.set(item.id, 'blocked');
    }
  }

  return statuses;
}

function applyFieldCascade(
  items: Array<{ id: string; filled: boolean; label: string }>,
  enriching: boolean,
  coreComplete: boolean
): Map<string, IntakeProgressShardStatus> {
  const statuses = new Map<string, IntakeProgressShardStatus>();
  let assignedRunning = false;

  for (const item of items) {
    if (item.filled) {
      statuses.set(item.id, 'done');
      continue;
    }

    if (!coreComplete) {
      statuses.set(item.id, 'blocked');
      continue;
    }

    if (enriching && !assignedRunning) {
      statuses.set(item.id, 'running');
      assignedRunning = true;
    } else if (assignedRunning) {
      statuses.set(item.id, 'blocked');
    } else {
      statuses.set(item.id, 'pending');
    }
  }

  return statuses;
}

export function buildIntakeProgressSnapshot(
  draft: NeedDraft | null,
  opts?: BuildIntakeProgressOpts
): IntakeProgressSnapshot {
  const enriching = opts?.enriching ?? false;

  const coreFilled: Record<IntakeProgressCoreKey, boolean> = {
    need: isNeedFilled(draft, opts),
    category: isCategoryFilled(draft),
    city: isCityFilled(draft),
    neighborhood: isNeighborhoodFilled(draft),
  };

  const coreItems = CORE_ORDER.map((key) => ({
    id: key,
    filled: coreFilled[key],
    label: CORE_LABELS[key],
  }));

  const coreStatuses = applyCoreCascade(coreItems, enriching);
  const core = Object.fromEntries(
    CORE_ORDER.map((key) => [key, coreStatuses.get(key) ?? 'pending'])
  ) as Record<IntakeProgressCoreKey, IntakeProgressShardStatus>;

  const corePipelineComplete = CORE_ORDER.every((key) => coreFilled[key]);
  const fieldDefs = buildFieldShards(draft);
  const fieldItems = fieldDefs.map((f) => ({
    id: f.key,
    filled: f.filled,
    label: f.label,
  }));
  const fieldStatuses = applyFieldCascade(fieldItems, enriching, corePipelineComplete);

  const fields: IntakeProgressFieldShard[] = fieldDefs.map((f) => ({
    key: f.key,
    label: f.label,
    required: f.required,
    status: fieldStatuses.get(f.key) ?? 'pending',
  }));

  let activeShardLabel: string | null = null;
  for (const key of CORE_ORDER) {
    if (core[key] === 'running') {
      activeShardLabel = CORE_LABELS[key];
      break;
    }
  }
  if (!activeShardLabel) {
    const runningField = fields.find((f) => f.status === 'running');
    if (runningField) activeShardLabel = runningField.label;
  }

  const pendingLabels: string[] = [];
  for (const key of CORE_ORDER) {
    const s = core[key];
    if (s === 'pending' || s === 'running' || s === 'blocked') {
      if (!coreFilled[key]) pendingLabels.push(CORE_LABELS[key]);
    }
  }
  for (const f of fields) {
    if (f.status === 'pending' || f.status === 'running' || f.status === 'blocked') {
      if (!fieldDefs.find((d) => d.key === f.key)?.filled) pendingLabels.push(f.label);
    }
  }

  const missingSummaryFa =
    pendingLabels.length > 0
      ? `\u0647\u0646\u0648\u0632: ${pendingLabels.slice(0, 4).join('\u060c ')}`
      : '';

  return {
    core,
    fields,
    missingSummaryFa,
    activeShardLabel,
  };
}

export function alignProgressWithPublishGate(draft: NeedDraft | null): {
  canPublish: boolean;
  blockingFields: string[];
} {
  if (!draft) return { canPublish: false, blockingFields: ['draft'] };
  const readiness = getPublishReadiness(draft);
  return {
    canPublish: readiness.canPublish,
    blockingFields: readiness.errors.map((e) => e.field),
  };
}

export { CORE_LABELS as INTAKE_PROGRESS_CORE_LABELS };
