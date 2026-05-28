import type { AiCandidateRetrievalSet } from '@/ai/types';
import { AI_INTAKE_SYSTEM_PROMPT } from '@/ai/prompts/systemPrompt';

export function buildIntakeExtractionPrompt(
  text: string,
  candidates: AiCandidateRetrievalSet
): string {
  const categoryLines = candidates.categories
    .map((c) => `* ${c.slug}`)
    .join('\n');
  const cityLines = candidates.cities.map((c) => `* ${c.slug}`).join('\n');
  const neighborhoodLines = candidates.neighborhoods
    .map((n) => `* ${n.slug}`)
    .join('\n');
  const txLines = candidates.transactionTypes.map((t) => `* ${t.value}`).join('\n');

  return `${AI_INTAKE_SYSTEM_PROMPT}

User Text:
"""
${text}
"""

Candidate Categories (choose ONE slug or null):
${categoryLines || '* (none)'}

Candidate Cities (choose ONE slug or null):
${cityLines || '* (none)'}

Candidate Neighborhoods (choose ONE slug or null):
${neighborhoodLines || '* (none)'}

Candidate Transaction Types (choose ONE value or null):
${txLines || '* (none)'}

Return JSON with this exact shape:
{
  "category": string | null,
  "city": string | null,
  "neighborhood": string | null,
  "transactionType": string | null,
  "budget": number | null,
  "area": number | null,
  "rooms": number | null,
  "confidence": number
}`;
}
