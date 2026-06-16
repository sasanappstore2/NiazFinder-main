import type { CompletionState, IntakeEntities, MissingFieldItem } from '@/intake/types';
import { categoryNeedsTransactionType } from '@/intake/extractors/transactionExtractor';
import { hasEntityValue, type EntityValueContext } from '@/intake/entities/entityRegistry';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';

function fieldPriority(
  requiredFields: readonly string[],
  optionalFields: readonly string[],
  field: string
): number {
  const reqIdx = requiredFields.indexOf(field);
  if (reqIdx >= 0) return 100 - reqIdx * 5;
  const optIdx = optionalFields.indexOf(field);
  if (optIdx >= 0) return 70 - optIdx * 5;
  return 50;
}

export function buildPrioritizedMissingFields(
  entities: IntakeEntities,
  ctx?: EntityValueContext
): MissingFieldItem[] {
  const template = resolveTemplateFromDraftEntities(entities);
  const fields = new Map<string, MissingFieldItem>();

  for (const field of template.requiredFields) {
    if (!hasEntityValue(entities, field, ctx)) {
      fields.set(field, {
        field,
        priority: fieldPriority(template.requiredFields, template.optionalFields, field),
        required: true,
      });
    }
  }

  for (const field of template.optionalFields) {
    if (!hasEntityValue(entities, field, ctx)) {
      fields.set(field, {
        field,
        priority: fieldPriority(template.requiredFields, template.optionalFields, field),
        required: false,
      });
    }
  }

  if (categoryNeedsTransactionType(entities.categorySlug) && !entities.transactionType) {
    fields.set('transactionType', {
      field: 'transactionType',
      priority: Math.max(fields.get('transactionType')?.priority ?? 0, 100),
      required: true,
    });
  }

  return Array.from(fields.values()).sort((a, b) => b.priority - a.priority);
}

export function computeCompletionScore(missingFields: readonly MissingFieldItem[]): number {
  const max = 100;
  const penalty = missingFields.reduce((sum, item) => sum + (item.required ? 18 : 8), 0);
  return Math.max(0, max - penalty);
}

export function completionStateFromScore(score: number): CompletionState {
  if (score < 30) return 'VERY_INCOMPLETE';
  if (score < 70) return 'NEEDS_INFO';
  if (score < 90) return 'ALMOST_READY';
  return 'READY_TO_PUBLISH';
}
