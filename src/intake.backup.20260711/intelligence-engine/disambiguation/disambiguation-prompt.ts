import type { AiCandidateCity, AiCandidateCategory } from '@/ai/types';

export function buildCategoryPickPrompt(
  text: string,
  candidates: AiCandidateCategory[]
): string {
  const list = candidates.map((c) => `* ${c.slug} (${c.title})`).join('\n');
  return `متن نیاز کاربر:
"""
${text}
"""

دسته‌های ممکن (فقط یکی را انتخاب کن یا null):
${list}

فقط JSON برگردان:
{"category":"slug-or-null","confidence":0.0-1.0}`;
}

export function buildCategorySuggestPrompt(text: string): string {
  return `متن نیاز کاربر:
"""
${text}
"""

یک slug دسته‌بندی leaf (مثلاً apartment-rent یا ac-repair) پیشنهاد بده.
فقط JSON:
{"category":"slug-or-null","confidence":0.0-1.0}`;
}

export function buildCityPickPrompt(text: string, candidates: AiCandidateCity[]): string {
  const list = candidates.map((c) => `* ${c.slug} (${c.name})`).join('\n');
  return `متن نیاز کاربر:
"""
${text}
"""

شهرهای ممکن (فقط یکی را انتخاب کن یا null):
${list}

فقط JSON:
{"city":"slug-or-null","confidence":0.0-1.0}`;
}

export function buildCitySuggestPrompt(text: string): string {
  return `متن نیاز کاربر:
"""
${text}
"""

یک slug شهر ایران (مثلاً tehran یا mashhad) پیشنهاد بده.
فقط JSON:
{"city":"slug-or-null","confidence":0.0-1.0}`;
}
