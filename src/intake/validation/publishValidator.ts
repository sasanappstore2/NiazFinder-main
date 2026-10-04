import type { NeedDraft, PublishValidationError } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { getCategoryBySlug } from '@/config/categories';

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

  const entities = recordToEntities(draft.entities);
  const template = resolveTemplateFromDraftEntities(entities);
  const publishRules = template.rules.publish;

  if (!draft.templateId?.trim()) {
    errors.push({ field: 'templateId', message: 'قالب فرم مشخص نیست' });
    return { success: false, errors };
  }

  const valueCtx = {
    sourceText: draft.sourceText,
    answers: draft.answers as Record<string, unknown>,
    parsedUrgency: draft.parsedIntent?.urgency ?? null,
  };

  for (const field of publishRules.requiredFields) {
    if (!hasEntityValue(entities, field, valueCtx)) {
      errors.push({
        field,
        message: FIELD_MESSAGES[field] ?? `${field} required`,
      });
    }
  }

  if (publishRules.requiresMapPin && !hasEntityValue(entities, 'mapPin', valueCtx)) {
    errors.push({ field: 'mapPin', message: FIELD_MESSAGES.mapPin });
  }

  const effectiveCategorySlug = entities.subcategorySlug ?? entities.categorySlug;
  if (!effectiveCategorySlug) {
    errors.push({ field: 'categorySlug', message: 'دسته‌بندی معتبر نیست' });
  } else if ((getCategoryBySlug(effectiveCategorySlug)?.depth ?? 0) === 0) {
    errors.push({ field: 'categorySlug', message: 'لطفاً زیرشاخهٔ دقیق نیاز را انتخاب کنید' });
  }

  if (!draft.sourceText?.trim()) {
    errors.push({ field: 'sourceText', message: 'متن نیاز الزامی است' });
  }

  for (const [field, value] of [
    ['area', entities.area],
    ['budgetMin', entities.budgetMin],
    ['budgetMax', entities.budgetMax],
    ['rooms', entities.rooms],
    ['rahnAmount', (draft.entities as Record<string, unknown>).rahnAmount],
    ['monthlyRent', (draft.entities as Record<string, unknown>).monthlyRent],
  ] as const) {
    if (value == null) continue;
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      errors.push({ field, message: 'مقدار عددی معتبر نیست' });
    }
  }

  if (
    entities.budgetMin != null &&
    entities.budgetMax != null &&
    entities.budgetMin > entities.budgetMax
  ) {
    errors.push({ field: 'budget', message: 'حداقل بودجه نمی‌تواند از حداکثر بودجه بیشتر باشد' });
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
