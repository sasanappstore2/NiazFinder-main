import {
  INTENT_SLICE_INTENT_TYPES,
  INTENT_SLICE_VERTICALS,
} from '@/intake/intelligence-engine/hybrid/intent-slice-schema';

export const INTENT_SLICE_SYSTEM_PROMPT =
  'You classify Persian marketplace user needs for NiazFinder. Return JSON only, no markdown.';

export function buildIntentSliceUserPrompt(text: string): string {
  const verticals = INTENT_SLICE_VERTICALS.join('|');
  const intents = INTENT_SLICE_INTENT_TYPES.join('|');

  return `متن کاربر:
"""
${text}
"""

با این JSON پاسخ بده:
{
  "vertical": "${verticals}",
  "intentType": "${intents}",
  "keywords": ["کلمه کلیدی فارسی", "..."],
  "confidence": 0.0
}

راهنما:
- vertical: یکی از مقادیر عمودی (مثلاً services)
- intentType: نوع درخواست/نیاز (مثلاً service_request برای خدمات، property_search برای ملک/اجاره)
- keywords: ۳ تا ۸ کلمه کلیدی فارسی از متن
- confidence: ۰ تا ۱
- بدون slug انگلیسی اضافی`;
}
