import type { NeedMatchContext } from '@/contracts/need-match';
import {
  formatNeedBudgetLabel,
  isRentDealType,
  normalizeNeedBudgetInput,
  resolveNeedDealTypeLabel,
} from '@/lib/need/format-need-budget';

function resolveDealTypeFromNeed(need: NeedMatchContext): string | undefined {
  const normalized = normalizeNeedBudgetInput({
    dynamicAnswers: need.dynamicAnswers,
    dealType: need.dealType,
  });
  return normalized.dealType ?? undefined;
}

/** Rule-based one-line summary (no LLM). */
export function buildNeedBriefSummary(need: NeedMatchContext): string {
  const parts: string[] = [];
  parts.push(`نیاز «${need.title.trim()}» در دسته ${need.categoryName}.`);
  if (need.city) parts.push(`محدوده: ${need.city}.`);

  const dealType = resolveDealTypeFromNeed(need);
  const dealLabel = resolveNeedDealTypeLabel(dealType);
  if (dealLabel) {
    parts.push(`نوع درخواست: ${dealLabel}.`);
  } else {
    const text = `${need.title} ${need.description}`;
    if (/ps5|ps4|playstation|پلی‌استیشن|پلی استیشن/i.test(text)) {
      parts.push('به دنبال کنسول یا بازی هستید.');
    }
    if (!isRentDealType(dealType)) {
      if (text.includes('خرید') || text.includes('می‌خرم') || text.includes('میخرم')) {
        parts.push('نوع درخواست: خرید.');
      } else if (text.includes('فروش') || text.includes('می‌فروشم')) {
        parts.push('نوع درخواست: فروش.');
      }
    }
  }

  const budgetLabel = formatNeedBudgetLabel({
    budgetMin: need.budgetMin,
    budgetMax: need.budgetMax,
    dealType,
    dynamicAnswers: need.dynamicAnswers,
  });
  if (budgetLabel !== 'توافقی') {
    parts.push(`بودجه: ${budgetLabel}.`);
  }

  return parts.slice(0, 3).join(' ');
}
