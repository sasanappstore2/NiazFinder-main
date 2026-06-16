import type { AiCandidateRetrievalSet } from '@/ai/types';
import { AI_INTAKE_SYSTEM_PROMPT } from '@/ai/prompts/systemPrompt';

const FIELD_LABELS: Record<string, string> = {
  categorySlug: 'category slug (leaf)',
  subcategorySlug: 'subcategory slug',
  city: 'city name',
  citySlug: 'city slug',
  neighborhood: 'neighborhood name',
  neighborhoodSlug: 'neighborhood slug',
  transactionType: 'transaction type',
  area: 'area in square meters',
  budgetMax: 'budget max (Toman)',
  budgetMin: 'budget min (Toman)',
  rooms: 'number of rooms',
  vertical: 'vertical/domain',
};

function candidateBlock(
  unresolved: string[],
  candidates: AiCandidateRetrievalSet
): string {
  const lines: string[] = [];

  if (unresolved.some((f) => f.includes('category'))) {
    lines.push(
      'Candidate Categories (choose ONE slug or null):',
      candidates.categories.map((c) => `* ${c.slug}`).join('\n') || '* (none)'
    );
  }
  if (unresolved.some((f) => f.includes('city'))) {
    lines.push(
      'Candidate Cities (choose ONE slug or null):',
      candidates.cities.map((c) => `* ${c.slug}`).join('\n') || '* (none)'
    );
  }
  if (unresolved.some((f) => f.includes('neighborhood'))) {
    lines.push(
      'Candidate Neighborhoods (choose ONE slug or null):',
      candidates.neighborhoods.map((c) => `* ${c.slug}`).join('\n') || '* (none)'
    );
  }
  if (unresolved.some((f) => f.includes('transaction'))) {
    lines.push(
      'Candidate Transaction Types (choose ONE value or null):',
      candidates.transactionTypes.map((t) => `* ${t.value}`).join('\n') || '* (none)'
    );
  }

  return lines.join('\n\n');
}

/** Prompt scoped to unresolved fields only ? never asks for full NeedDraft. */
export function buildUnresolvedFieldsPrompt(
  text: string,
  unresolvedFields: string[],
  candidates: AiCandidateRetrievalSet
): string {
  const fieldList = unresolvedFields
    .map((f) => `- ${f}: ${FIELD_LABELS[f] ?? f}`)
    .join('\n');

  const jsonFields = [
    unresolvedFields.some((f) => f.includes('category')) ? '"category": string | null' : null,
    unresolvedFields.some((f) => f.includes('city')) ? '"city": string | null' : null,
    unresolvedFields.some((f) => f.includes('neighborhood'))
      ? '"neighborhood": string | null'
      : null,
    unresolvedFields.some((f) => f.includes('transaction'))
      ? '"transactionType": string | null'
      : null,
    unresolvedFields.includes('budgetMax') || unresolvedFields.includes('budgetMin')
      ? '"budget": number | null'
      : null,
    unresolvedFields.includes('area') ? '"area": number | null' : null,
    unresolvedFields.includes('rooms') ? '"rooms": number | null' : null,
    '"confidence": number',
  ]
    .filter(Boolean)
    .join(',\n  ');

  return `${AI_INTAKE_SYSTEM_PROMPT}

Only fill these unresolved fields (rules engine could not resolve them confidently):
${fieldList}

User Text:
"""
${text}
"""

${candidateBlock(unresolvedFields, candidates)}

Return JSON with this exact shape:
{
  ${jsonFields}
}`;
}
