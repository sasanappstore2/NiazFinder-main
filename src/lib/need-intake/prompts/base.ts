import { CANONICAL_CITIES } from '@/config/locations';
import { INTENT_REGISTRY } from '@/config/need-intents';

export const INTENT_LIST = Object.values(INTENT_REGISTRY)
  .map((i) => `${i.type}: ${i.labelFa}`)
  .join('\n');

export const CITY_LIST = CANONICAL_CITIES.slice(0, 40)
  .map((c) => c.title)
  .join('، ');

export const JSON_OUTPUT_RULES = `Rules:
- User writes in Persian (Farsi).
- Output ONLY one JSON object, no markdown.
- budgetMin/budgetMax in Toman. "۵۰ میلیون" → 50000000. Extract budget whenever mentioned.
- urgency: LOW | NORMAL | HIGH | URGENT.
- confidence: 0.0 to 1.0.
- title: INTERNAL draft label only (10-80 chars). NEVER copy the user's sentence verbatim as title.
- description: fuller Persian summary including IMPLIED needs (skills, scope, timing hints) not only literal words.

JSON shape:
{
  "intentType": "...",
  "categorySlug": "...",
  "subcategorySlug": null,
  "title": "...",
  "description": "...",
  "budgetMin": null,
  "budgetMax": null,
  "city": "...",
  "province": null,
  "urgency": "NORMAL",
  "confidence": 0.85,
  "entities": {}
}`;

export function buildParseUserMessage(text: string): string {
  return `User need description:\n${text.trim()}`;
}
