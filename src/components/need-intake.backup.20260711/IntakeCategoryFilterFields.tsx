'use client';

import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FieldSchema } from '@/contracts/need-intake';
import { getIntakeFieldsForCategory } from '@/config/category-filters/registry';
import { FieldRenderer } from '@/components/need-intake/FieldRenderer';
import type { NeedDraft } from '@/contracts/need-intake';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { extractVehicleSubjectFromText } from '@/lib/need-intake/vertical-title';
import { cn } from '@/lib/utils';

/** Already captured elsewhere in intake (mega menu, location, budget section). */
const SKIP_FIELD_KEYS = new Set([
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

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  serviceType: 'جزئیات دقیق خدمت',
  when: 'زمان انجام',
};

const FIELD_PLACEHOLDER_OVERRIDES: Record<string, string> = {
  serviceType: 'مثلاً: تعمیر کولر گازی، برند و مدل، محدوده کار…',
};

interface IntakeCategoryFilterFieldsProps {
  categorySlug: string;
  needDraft: NeedDraft | null;
  onPatchAnswer: (key: string, value: string | number | string[]) => void;
}

function resolveFieldValue(
  field: FieldSchema,
  answers: Record<string, string | number | boolean | string[]>,
  entities: ReturnType<typeof recordToEntities>,
  sourceText?: string,
  parsedBrand?: string
): string | number | boolean | string[] | undefined {
  const answer = answers[field.key];
  if (field.type === 'multi_select') {
    if (Array.isArray(answer)) return answer;
    if (typeof answer === 'string' && answer.trim()) {
      return answer
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [];
  }
  if (answer != null && answer !== '') return answer as string | number | boolean;

  if (field.key === 'dealType' && entities.transactionType) {
    return entities.transactionType;
  }
  if (field.key === 'bedrooms' && entities.rooms != null) {
    return entities.rooms;
  }
  if (field.key === 'rahnAmount') {
    const answer = answers.rahnAmount ?? answers.deposit;
    if (answer != null && answer !== '') return answer as string | number;
    if (entities?.budgetMax != null && entities.budgetMax >= 50_000_000) {
      return entities.budgetMax;
    }
  }
  if (field.key === 'monthlyRent' && answers.monthlyRent != null && answers.monthlyRent !== '') {
    return answers.monthlyRent as string | number;
  }
  if (field.key === 'deposit' && answers.deposit != null && answers.deposit !== '') {
    return answers.deposit as string | number;
  }
  if (field.key === 'area' && entities.area != null) {
    return entities.area;
  }
  if (field.key === 'brand') {
    const answer = answers.brand;
    if (answer != null && answer !== '') return answer as string | number;
    if (parsedBrand?.trim()) return parsedBrand.trim();
    if (sourceText?.trim()) {
      const extracted = extractVehicleSubjectFromText(sourceText);
      if (extracted) return extracted;
    }
  }
  return undefined;
}

function fieldVisible(field: FieldSchema, answers: Record<string, unknown>): boolean {
  if (field.showIf) {
    const val = String(answers[field.showIf.field] ?? '');
    if (val !== field.showIf.equals) return false;
  }
  if (field.showIfIn) {
    const val = String(answers[field.showIfIn.field] ?? '');
    if (!field.showIfIn.values.includes(val)) return false;
  }
  return true;
}

export function IntakeCategoryFilterFields({
  categorySlug,
  needDraft,
  onPatchAnswer,
}: IntakeCategoryFilterFieldsProps) {
  const fields = useMemo(() => {
    if (!categorySlug) return [];
    return getIntakeFieldsForCategory(categorySlug).filter((f) => !SKIP_FIELD_KEYS.has(f.key));
  }, [categorySlug]);

  const answers = needDraft?.answers ?? {};
  const entities = needDraft ? recordToEntities(needDraft.entities) : null;
  const sourceText = needDraft?.sourceText ?? needDraft?.parsedIntent?.rawText ?? '';
  const parsedBrand = needDraft?.parsedIntent?.entities?.brand;
  const context = useMemo(
    () => ({
      ...answers,
      dealType: String(answers.dealType ?? entities?.transactionType ?? ''),
    }),
    [answers, entities?.transactionType]
  );

  const visibleFields = fields.filter((field) => fieldVisible(field, context));
  if (visibleFields.length === 0) return null;

  const filledCount = visibleFields.filter((field) => {
    const v = resolveFieldValue(
      field,
      answers,
      entities ?? recordToEntities({}),
      sourceText,
      parsedBrand
    );
    if (Array.isArray(v)) return v.length > 0;
    return v != null && v !== '';
  }).length;

  return (
    <details className="intake-category-filters group rounded-xl border border-dashed border-border/70 bg-muted/20">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5',
          '[&::-webkit-details-marker]:hidden'
        )}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          فیلترهای پیشرفته
          {filledCount > 0 ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {filledCount} مورد
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-normal text-muted-foreground">اختیاری</span>
          )}
        </span>
      </summary>

      <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleFields.map((field) => {
            const label = FIELD_LABEL_OVERRIDES[field.key] ?? field.label;
            const fieldForRender: FieldSchema = {
              ...field,
              label,
              placeholder: FIELD_PLACEHOLDER_OVERRIDES[field.key] ?? field.placeholder,
            };
            return (
              <div key={field.key} className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">{label}</label>
                <FieldRenderer
                  field={fieldForRender}
                  value={resolveFieldValue(
                    field,
                    answers,
                    entities ?? recordToEntities({}),
                    sourceText,
                    parsedBrand
                  )}
                  onChange={(value) => onPatchAnswer(field.key, value)}
                />
                {field.helpText ? (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
