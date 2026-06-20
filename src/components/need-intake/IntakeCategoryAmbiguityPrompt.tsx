'use client';

import { Shapes } from 'lucide-react';
import { SuggestionChips } from '@/components/need-intake/SuggestionChips';
import type { NeedDraft } from '@/contracts/need-intake';

export interface CategoryAmbiguityOption {
  value: string;
  label: string;
}

export function hasCategoryAmbiguity(parsed: NeedDraft['parsedIntent'] | undefined): boolean {
  if (!parsed) return false;
  if (parsed.categorySlug || parsed.subcategorySlug) return false;
  return (parsed.categoryCandidates?.length ?? 0) >= 2;
}

export function buildCategoryAmbiguityOptions(
  parsed: NeedDraft['parsedIntent'] | undefined
): CategoryAmbiguityOption[] {
  if (!parsed || !hasCategoryAmbiguity(parsed)) return [];
  return [...(parsed.categoryCandidates ?? [])]
    .sort((a, b) => b.confidence - a.confidence)
    .map((c) => ({ value: c.slug, label: c.label }));
}

export interface IntakeCategoryDisambiguationChipsProps {
  options: CategoryAmbiguityOption[];
  selectedValue?: string;
  onSelect: (slug: string) => void;
}

export function IntakeCategoryDisambiguationChips({
  options,
  selectedValue,
  onSelect,
}: IntakeCategoryDisambiguationChipsProps) {
  if (options.length < 2) return null;
  return (
    <SuggestionChips
      value={selectedValue}
      options={options}
      onSelect={(v) => onSelect(typeof v === 'string' ? v : (v[0] ?? ''))}
    />
  );
}

export interface IntakeCategoryAmbiguityPromptProps {
  needDraft: NeedDraft | null;
  selectedSlug?: string;
  onApplyCategory: (slug: string) => void;
}

export function IntakeCategoryAmbiguityPrompt({
  needDraft,
  selectedSlug,
  onApplyCategory,
}: IntakeCategoryAmbiguityPromptProps) {
  const options = buildCategoryAmbiguityOptions(needDraft?.parsedIntent);
  if (options.length < 2) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Shapes className="size-3.5" />
        کدام دسته‌بندی به نیاز شما نزدیک‌تر است؟
      </p>
      <IntakeCategoryDisambiguationChips
        options={options}
        selectedValue={selectedSlug}
        onSelect={onApplyCategory}
      />
    </div>
  );
}
