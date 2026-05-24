import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { CANONICAL_CITIES } from '@/config/locations';
import { INTENT_REGISTRY } from '@/config/need-intents';

const CATEGORY_LIST = CANONICAL_CATEGORIES.map((c) => `${c.slug}: ${c.title}`).join('\n');

const INTENT_LIST = Object.values(INTENT_REGISTRY)
  .map((i) => `${i.type}: ${i.labelFa}`)
  .join('\n');

const CITY_LIST = CANONICAL_CITIES.slice(0, 40)
  .map((c) => c.title)
  .join('، ');

/** System prompt for structured intent parsing (Persian user text → JSON). */
export function buildNeedIntakeParseSystemPrompt(): string {
  return `You are an expert Persian-language assistant for "Needs Finder" (نیاز فایندر).
Analyze the user's need description and output ONLY a single valid JSON object (no markdown, no explanation).

Allowed intentType values:
${INTENT_LIST}

Allowed categorySlug values (use the slug exactly):
${CATEGORY_LIST}

Known cities (Persian names): ${CITY_LIST}

Rules:
- User writes in Persian (Farsi).
- budgetMin/budgetMax in Toman (تومان). "۵۰ میلیون" → 50000000.
- urgency: LOW | NORMAL | HIGH | URGENT (فوری → URGENT).
- confidence: 0.0 to 1.0 (how sure you are).
- title: short Persian headline (10-80 chars).
- description: fuller Persian summary of the need.
- entities: key-value strings. For real estate include dealType: buy|sell|rent_monthly|rent_rahn_full|rent_rahn_ejare and propertyKind: apartment|villa|land|office|shop. For vehicles dealType: buy|sell|rent|service|parts.

JSON schema:
{
  "intentType": "vehicle_search",
  "categorySlug": "vehicles-car",
  "subcategorySlug": null,
  "title": "...",
  "description": "...",
  "budgetMin": null,
  "budgetMax": 500000000,
  "city": "تهران",
  "province": null,
  "urgency": "NORMAL",
  "confidence": 0.85,
  "entities": {}
}`;
}

export function buildNeedIntakeParseUserMessage(text: string): string {
  return `User need description:\n${text.trim()}`;
}

/** Prompt for generating listing title + description at publish time. */
export function buildListingEnrichSystemPrompt(): string {
  return `You are a Persian copywriter for Needs Finder.
Given a user's need (intent, category, answers), write a clear title and description.
Output ONLY JSON: { "title": "...", "description": "..." }
- title: 10-80 Persian characters, specific and searchable
- description: 50-500 Persian characters, polite and complete`;
}

export function buildListingEnrichUserMessage(
  parsed: ParsedIntent,
  answers: Record<string, unknown>
): string {
  return JSON.stringify(
    {
      rawText: parsed.rawText,
      intentType: parsed.intentType,
      categorySlug: parsed.categorySlug,
      city: parsed.city,
      budgetMax: parsed.budgetMax,
      answers,
    },
    null,
    2
  );
}

/** Legacy conversational prompt (future multi-turn LLM). */
export function buildNeedIntakePrompt(draft: Partial<NeedDraft>): string {
  return `You are a friendly Persian assistant for Needs Finder.
Help users post their needs in simple language.
Current intent: ${draft.parsedIntent?.intentType ?? 'unknown'}
Category: ${draft.parsedIntent?.categorySlug ?? 'general'}
Ask one short question at a time. Use simple words.`;
}
