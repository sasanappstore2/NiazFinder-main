import type { NeedMatchContext } from '@/contracts/need-match';

/** Rule-based one-line summary (no LLM). */
export function buildNeedBriefSummary(need: NeedMatchContext): string {
  const parts: string[] = [];
  parts.push(`نیاز «${need.title.trim()}» در دسته ${need.categoryName}.`);
  if (need.city) parts.push(`محدوده: ${need.city}.`);
  const text = `${need.title} ${need.description}`.toLowerCase();
  if (text.includes('ps5') || text.includes('ps4') || text.includes('playstation')) {
    parts.push('به دنبال کنسول یا بازی هستید.');
  }
  if (text.includes('خرید') || text.includes('می‌خرم') || text.includes('میخرم')) {
    parts.push('نوع درخواست: خرید.');
  }
  if (text.includes('فروش') || text.includes('می‌فروشم')) {
    parts.push('نوع درخواست: فروش.');
  }
  return parts.slice(0, 3).join(' ');
}
