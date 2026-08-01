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
  rahnAmount: 'rahn / full deposit amount (Toman)',
  monthlyRent: 'monthly rent (Toman)',
  deposit: 'security deposit (Toman)',
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

/** Prompt scoped to unresolved fields only — never asks for full NeedDraft. */
export function buildUnresolvedFieldsPrompt(
  text: string,
  unresolvedFields: string[],
  candidates: AiCandidateRetrievalSet
): string {
  const fieldList = unresolvedFields
    .map((f) => `- ${f}: ${FIELD_LABELS[f] ?? f}`)
    .join('\n');

  const wantsBudget =
    unresolvedFields.includes('budgetMax') || unresolvedFields.includes('budgetMin');
  const wantsRahn = unresolvedFields.includes('rahnAmount');
  const wantsRent = unresolvedFields.includes('monthlyRent');
  const wantsDeposit = unresolvedFields.includes('deposit');

  const jsonFields = [
    unresolvedFields.some((f) => f.includes('category')) ? '"category": string | null' : null,
    unresolvedFields.some((f) => f.includes('city')) ? '"city": string | null' : null,
    unresolvedFields.some((f) => f.includes('neighborhood'))
      ? '"neighborhood": string | null'
      : null,
    unresolvedFields.some((f) => f.includes('transaction'))
      ? '"transactionType": string | null'
      : null,
    wantsBudget ? '"budget": number | null' : null,
    wantsBudget ? '"budgetMax": number | null' : null,
    wantsBudget ? '"budgetMin": number | null' : null,
    wantsRahn ? '"rahnAmount": number | null' : null,
    wantsRent ? '"monthlyRent": number | null' : null,
    wantsDeposit ? '"deposit": number | null' : null,
    unresolvedFields.includes('area') ? '"area": number | null' : null,
    unresolvedFields.includes('rooms') ? '"rooms": number | null' : null,
    '"confidence": number',
  ]
    .filter(Boolean)
    .join(',\n  ');

  return `${AI_INTAKE_SYSTEM_PROMPT}

Only fill these unresolved fields (rules engine could not resolve them confidently):
${fieldList}

Money rules for Persian ads:
- Convert میلیون / میلیارد to Toman integers (e.g. ۵۰۰ میلیون → 500000000).
- For رهن و اجاره: put رهن in rahnAmount and اجاره ماهانه in monthlyRent.
- For رهن کامل: put amount in rahnAmount (or deposit), monthlyRent = null.
- Never invent amounts not present in the text.

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
