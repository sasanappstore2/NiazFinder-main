import { INTENT_REGISTRY } from '@/config/need-intents';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import {
  extractJsonFromChatContent,
  localChatCompletions,
} from '@/lib/need-intake/local-chat-client';

const ALLOWED_INTENTS = Object.keys(INTENT_REGISTRY).join(', ');
const ALLOWED_CATEGORIES = CANONICAL_CATEGORIES.slice(0, 40)
  .map((c) => c.slug)
  .join(', ');

const PARSE_SYSTEM = `You extract Persian marketplace need posts for NiazFinder.
Return valid JSON only. No markdown. Use canonical slugs from the lists when possible.`;

function buildParseUserPrompt(text: string): string {
  return `Extract from this Persian need text:

"""
${text}
"""

Return JSON:
{
  "intentType": one of [${ALLOWED_INTENTS}],
  "categorySlug": one of [${ALLOWED_CATEGORIES}, ...] or best match,
  "subcategorySlug": string | null,
  "city": Persian city name | null,
  "province": Persian province name | null,
  "neighborhoodSlug": latin slug | null,
  "budgetMin": number | null,
  "budgetMax": number | null,
  "urgency": "LOW"|"NORMAL"|"HIGH"|"URGENT" | null,
  "entities": { "key": "value" },
  "confidence": 0-1
}`;
}

export async function parseLabelsViaLocalChat(
  text: string
): Promise<{ labels: Partial<DatasetLabels> & { confidence?: number }; raw: string } | null> {
  const chat = await localChatCompletions(
    [
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user', content: buildParseUserPrompt(text) },
    ],
    { maxTokens: 600, temperature: 0.15 }
  );

  if (!chat) return null;

  const json = extractJsonFromChatContent(chat.content);
  if (!json || typeof json !== 'object') return null;

  const o = json as Record<string, unknown>;
  return {
    labels: {
      intentType: typeof o.intentType === 'string' ? (o.intentType as DatasetLabels['intentType']) : undefined,
      categorySlug: typeof o.categorySlug === 'string' ? o.categorySlug : undefined,
      subcategorySlug: typeof o.subcategorySlug === 'string' ? o.subcategorySlug : undefined,
      city: typeof o.city === 'string' ? o.city : undefined,
      province: typeof o.province === 'string' ? o.province : undefined,
      neighborhoodSlug: typeof o.neighborhoodSlug === 'string' ? o.neighborhoodSlug : undefined,
      budgetMin: typeof o.budgetMin === 'number' ? o.budgetMin : undefined,
      budgetMax: typeof o.budgetMax === 'number' ? o.budgetMax : undefined,
      urgency: typeof o.urgency === 'string' ? (o.urgency as DatasetLabels['urgency']) : undefined,
      entities:
        o.entities && typeof o.entities === 'object' && !Array.isArray(o.entities)
          ? (o.entities as Record<string, string>)
          : undefined,
      confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
    },
    raw: chat.content,
  };
}
