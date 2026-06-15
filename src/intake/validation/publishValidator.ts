import type { NeedDraft, PublishValidationError } from '@/contracts/need-intake';
import { getNeedTypeDefinition } from '@/intake/schema/needTypes';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { hasEntityValue } from '@/intake/entities/entityRegistry';

export type { PublishValidationError };

export interface PublishValidationResult {
  success: boolean;
  errors: PublishValidationError[];
}

const FIELD_MESSAGES: Record<string, string> = {
  category: 'دسته‌بندی الزامی است',
  city: 'شهر الزامی است',
  neighborhood: 'محله الزامی است',
  transactionType: 'نوع معامله الزامی است',
  area: 'متراژ الزامی است',
  budget: 'بودجه الزامی است',
  rooms: 'تعداد خواب الزامی است',
  description: 'توضیحات الزامی است',
  urgency: 'فوریت الزامی است',
  mapPin: 'موقعیت روی نقشه را مشخص کنید',
};

/**
 * Server-side source of truth for publish eligibility.
 * Client completionState is UX-only; this validator decides publish.
 */
export function validateNeedDraftForPublish(draft: NeedDraft): PublishValidationResult {
  const errors: PublishValidationError[] = [];

  if (!draft.needType) {
    errors.push({ field: 'needType', message: 'نوع نیاز مشخص نیست' });
    return { success: false, errors };
  }

  const def = getNeedTypeDefinition(draft.needType, draft.schemaVersion);
  if (!def) {
    errors.push({
      field: 'schemaVersion',
      message: 'نسخه schema برای این نوع نیاز پشتیبانی نمی‌شود',
    });
    return { success: false, errors };
  }

  const entities = recordToEntities(draft.entities);

  const valueCtx = {
    sourceText: draft.sourceText,
    answers: draft.answers as Record<string, unknown>,
    parsedUrgency: draft.parsedIntent?.urgency ?? null,
  };

  for (const field of def.requiredFields) {
    if (!hasEntityValue(entities, field, valueCtx)) {
      errors.push({
        field,
        message: FIELD_MESSAGES[field] ?? `${field} required`,
      });
    }
  }

  // Map pin is required for real-estate listings (browse map); services can publish with neighborhood text only.
  const needsMapPin =
    def.vertical === 'real-estate' &&
    def.requiredFields.some((f) => f === 'city' || f === 'neighborhood');
  if (needsMapPin && !hasEntityValue(entities, 'mapPin', valueCtx)) {
    errors.push({ field: 'mapPin', message: FIELD_MESSAGES.mapPin });
  }

  if (!entities.categorySlug) {
    errors.push({ field: 'categorySlug', message: 'دسته‌بندی معتبر نیست' });
  }

  if (!draft.sourceText?.trim()) {
    errors.push({ field: 'sourceText', message: 'متن نیاز الزامی است' });
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/** Alias used by wizard guards and client publish checks. */
export function getPublishReadiness(draft: NeedDraft): PublishValidationResult & {
  canPublish: boolean;
} {
  const result = validateNeedDraftForPublish(draft);
  return { ...result, canPublish: result.success };
}
