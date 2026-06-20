import type { IntentType } from '@/contracts/need-intake';
import { getIntentsForCategory } from '@/config/need-intents';
import { INTENT_REGISTRY } from '@/config/need-intents';

import { mapLeafToCanonical } from './catalog-index';
import type { SyntheticPayload } from './rules';

const ALLOWED_INTENTS = Object.keys(INTENT_REGISTRY).join(', ');

export const PARSE_SYSTEM = `You extract Persian marketplace need posts for NiazFinder.
Return valid JSON only. No markdown. Use canonical slugs from the lists when possible.`;

export function buildParseUserPrompt(text: string, categoryHint?: string): string {
  const catLine = categoryHint
    ? `\nFocus category context: ${categoryHint}`
    : '';
  return `Extract from this Persian need text:

"""
${text}
"""${catLine}

Return JSON:
{
  "intentType": one of [${ALLOWED_INTENTS}],
  "categorySlug": string,
  "subcategorySlug": string | null,
  "city": Persian city name | null,
  "neighborhoodSlug": latin slug | null,
  "budgetMin": number | null,
  "budgetMax": number | null,
  "urgency": "LOW"|"NORMAL"|"HIGH"|"URGENT" | null,
  "entities": { "key": "value" },
  "confidence": 0-1
}`;
}

export interface MlxAssistantPayload {
  intentType: IntentType;
  categorySlug: string;
  subcategorySlug?: string | null;
  city?: string | null;
  province?: string | null;
  neighborhoodSlug?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgency?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null;
  entities: Record<string, string>;
  confidence: number;
  locationAmbiguous?: boolean;
  locationResolutionStatus?: 'neighborhood_ambiguous' | 'city_ambiguous' | 'resolved';
  neighborhoodCandidates?: Array<{ slug: string; label: string; city?: string }>;
  cityCandidates?: Array<{ cityId: string; label: string }>;
}

function resolveIntent(categorySlug: string, subcategorySlug?: string): IntentType {
  const leaf = subcategorySlug ?? categorySlug;
  if (leaf === 'agency-services') return 'real_estate_service';
  if (leaf === 'legal-services') return 'consultation';
  if (leaf === 'education') return 'service_request';
  if (leaf === 'beauty-health') return 'service_request';
  if (leaf === 'transportation') return 'service_request';
  if (leaf === 'medical-health') return 'consultation';
  const intents = getIntentsForCategory(categorySlug);
  return intents[0] ?? 'service_request';
}

export function syntheticToMlx(
  user: string,
  payload: SyntheticPayload,
  leafSlug: string
): MlxAssistantPayload {
  const { categorySlug, subcategorySlug } = mapLeafToCanonical(leafSlug);
  const intentType = resolveIntent(categorySlug, subcategorySlug);
  const loc = payload.location;

  const base: MlxAssistantPayload = {
    intentType,
    categorySlug,
    subcategorySlug: subcategorySlug ?? null,
    entities: {},
    confidence: 0.95,
    urgency: /فوری|فورا|سریع|الان/.test(user) ? 'HIGH' : 'NORMAL',
  };

  if (payload.status === 'missing_location') {
    return { ...base, city: null, province: null, neighborhoodSlug: null };
  }

  if (payload.status === 'ambiguous_location') {
    return {
      ...base,
      city: null,
      province: null,
      neighborhoodSlug: null,
      locationAmbiguous: true,
      locationResolutionStatus: 'neighborhood_ambiguous',
      neighborhoodCandidates: payload.options.map((o) => ({
        slug: o.cityId,
        label: o.city,
        city: o.city,
      })),
    };
  }

  return {
    ...base,
    city: loc.city,
    province: loc.province,
    neighborhoodSlug: loc.neighborhoodId,
    locationResolutionStatus: 'resolved',
  };
}

export const SYNTHETIC_SYSTEM_PROMPT =
  'تو یک موتور استخراج اطلاعات برای بازار نیازفایندر (فارسی) هستی. از متن کاربر فقط یک JSON معتبر برگردان با فیلدهای: location (province/city/neighborhood و cityId/neighborhoodId در صورت قطعیت)، categories (آرایه‌ای از slug و نام فارسی/انگلیسی)، categorySlugs، status، options. بدون markdown و بدون توضیح. ' +
  'Schema: {"location":{"province":string|null,"city":string|null,"neighborhood":string|null,"cityId":string|null,"neighborhoodId":string|null},"categories":[{"slug":string,"pathFa":string,"nameFa":string,"nameEn":string}],"categorySlugs":string[],"status":"resolved"|"ambiguous_location"|"missing_location","options":[{"city":string,"province":string,"cityId":string}]}. ' +
  'اگر شهر و محله و دسته مشخص است status=resolved. اگر نام محله در چند شهر تکرار است ambiguous_location و options بده. اگر دسته مشخص است ولی مکان نه missing_location.';
