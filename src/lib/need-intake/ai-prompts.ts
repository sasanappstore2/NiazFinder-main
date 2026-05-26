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
- title: INTERNAL draft label only (10-80 chars). NEVER use the user's raw sentence as title.
- description: fuller Persian summary including implied customer needs between the lines.
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
Given a user's need (intent, category, answers, chat context), write a polished listing.
Output ONLY JSON: { "title": "...", "description": "..." }
- title: 10-80 Persian characters, specific and searchable. NEVER copy the user's first long sentence verbatim.
- description: 50-500 Persian characters, polite and complete. Include implied requirements the customer likely wants.
- Infer practical details (skills, scope, urgency) when reasonable from context.`;
}

export function buildChatTurnSystemPrompt(hasLeadPhone: boolean): string {
  return `You are a friendly Persian assistant for Needs Finder (نیاز فایندر).
Help complete a service need posting through short chat messages.
Rules:
- Reply in Persian, 1-3 short sentences. Ask at most ONE follow-up question per turn.
- Infer implied needs from context; do not repeat the user's text as a listing title.
- Extract budget (Toman) if the user mentions money.
${hasLeadPhone ? '- The user already provided a phone number on the landing page. Do NOT ask for phone again.' : '- You may ask for contact only if truly missing and critical.'}
- When you have enough to publish a clear listing (service type, city/area, scope), set readiness high.
Output ONLY JSON:
{
  "assistantMessage": "...",
  "slotUpdates": { "budget": 5000000, "location": "مشهد", "details": "..." },
  "readinessScore": 0.0,
  "readyToPreview": false,
  "suggestedChips": [{ "value": "...", "label": "..." }]
}
slotUpdates: only keys you learned this turn (budget, location, details, when, serviceType). Omit empty object if none.
readinessScore: 0.0-1.0 how complete the need is.
readyToPreview: true when readinessScore >= 0.85 and core info exists.`;
}

export function buildChatTurnUserMessage(
  draft: {
    parsedIntent: ParsedIntent;
    answers: Record<string, unknown>;
    turns: { role: string; content: string }[];
  },
  userMessage: string
): string {
  return JSON.stringify(
    {
      rawText: draft.parsedIntent.rawText,
      intentType: draft.parsedIntent.intentType,
      categorySlug: draft.parsedIntent.categorySlug,
      city: draft.parsedIntent.city,
      budgetMax: draft.parsedIntent.budgetMax,
      answers: draft.answers,
      recentTurns: draft.turns.slice(-8),
      userMessage,
    },
    null,
    2
  );
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
