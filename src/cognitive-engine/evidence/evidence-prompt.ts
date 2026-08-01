/**
 * RFC-002 Part 2 evidence-extraction prompt. Deliberately asks for atomic, pre-inference
 * facts only (ADR-005: no category slugs, no intent types, no marketplace decisions) —
 * this is the boundary that keeps the LLM out of business decision-making per RFC-002 Part 11.
 */
import { EVIDENCE_TYPES } from '@/cognitive-engine/types/evidence';

export const EVIDENCE_PROMPT_VERSION = 'evidence-v1';

export const EVIDENCE_SYSTEM_PROMPT = `You extract atomic evidence from Persian marketplace need posts.
Return valid JSON only. No markdown, no explanation.

You extract FACTS the user directly stated. You do NOT classify, categorize, or decide anything.
Never output a category, an intent label, or any internal system identifier — only what the user said.`;

export function buildEvidencePrompt(text: string): string {
  const types = EVIDENCE_TYPES.join(', ');
  return `Extract atomic evidence from this Persian text:

"""
${text}
"""

Each evidence item is ONE small fact directly stated by the user (an object, a property, a
condition, a verb, a hard requirement, a soft wish, or background context). Do not merge
multiple facts into one item. Do not infer anything the user did not say.

Evidence types: ${types}
- IDENTITY: an entity the user mentions (e.g. "car", "apartment", "gearbox")
- PROPERTY: a descriptive attribute (e.g. "white", "automatic", "two bedrooms")
- STATE: a current condition (e.g. "broken", "urgent", "new", "used")
- ACTION: a verb the user explicitly used (e.g. "buy", "repair", "rent")
- CONSTRAINT: a hard requirement (e.g. a budget number, a deadline)
- PREFERENCE: a soft wish (e.g. "prefer Xiaomi", "prefer owner")
- CONTEXT: background info (e.g. "for my mother", "personal use")

Return JSON:
{
  "evidence": [
    { "type": one of [${types}], "value": "short phrase in the user's own words", "sourceSpan": "exact substring copied from the input text above", "confidence": 0-1 }
  ]
}`;
}
