import type { IntentType } from '@/contracts/need-intake';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import {
  INTENT_SLICE_INTENT_TYPES,
  INTENT_SLICE_VERTICALS,
} from '@/intake/intelligence-engine/hybrid/intent-slice-schema';

export const CATEGORY_INTENT_SYSTEM_PROMPT =
  'تو طبقه‌بند نیازهای فارسی پلتفرم نیازفایندر هستی. فقط JSON معتبر برگردان؛ بدون markdown و بدون توضیح اضافه.';

export function buildCategoryIntentPickPrompt(
  text: string,
  candidates: Array<{ slug: string; title: string }>
): string {
  const verticals = INTENT_SLICE_VERTICALS.join('|');
  const intents = INTENT_SLICE_INTENT_TYPES.join('|');
  const list = candidates.map((c) => `* ${c.slug} — ${c.title}`).join('\n');

  return `متن نیاز کاربر:
"""
${text}
"""

دسته‌های مجاز (فقط یکی از همین slugها یا null):
${list}

فقط این JSON را برگردان:
{
  "vertical": "${verticals}",
  "intentType": "${intents}",
  "keywords": ["کلمه۱","کلمه۲"],
  "category": "slug-از-لیست-یا-null",
  "confidence": 0.0
}

قواعد:
- vertical و intentType را از معنای متن بفهم (مثلاً اجاره آپارتمان → real-estate + property_search).
- category فقط یکی از slugهای لیست بالا باشد؛ اگر مطمئن نیستی null بگذار.
- keywords حداکثر ۵ کلمهٔ فارسی از متن.
- موضوع نامرتبط اختراع نکن.`;
}

export function buildCategoryIntentSuggestPrompt(text: string): string {
  const verticals = INTENT_SLICE_VERTICALS.join('|');
  const intents = INTENT_SLICE_INTENT_TYPES.join('|');

  return `متن نیاز کاربر:
"""
${text}
"""

یک leaf slug دسته‌بندی سایت نیازفایندر پیشنهاد بده (مثل apartment-rent، laptop، ac-repair، car-ride).
اگر متن فقط سلام/گپ است و نیازی نیست، category را null بگذار.

فقط JSON:
{
  "vertical": "${verticals}",
  "intentType": "${intents}",
  "keywords": ["کلمه۱","کلمه۲"],
  "category": "slug-or-null",
  "confidence": 0.0
}`;
}

export type CategoryIntentLlmPayload = {
  vertical: ClassifierVertical;
  intentType: IntentType;
  keywords: string[];
  category: string | null;
  confidence: number;
};
