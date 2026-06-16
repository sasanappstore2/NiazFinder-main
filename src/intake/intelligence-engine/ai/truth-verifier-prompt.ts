import type { AiCandidateRetrievalSet } from '@/ai/types';
import type { IntakeFieldBag, IntakeFieldKey } from '@/intake/intelligence-engine/types';

const FIELD_HINTS: Record<string, string> = {
  categorySlug: 'leaf category slug from catalog',
  subcategorySlug: 'subcategory slug',
  city: 'Persian city name',
  citySlug: 'city slug (latin)',
  neighborhood: 'Persian neighborhood name',
  neighborhoodSlug: 'neighborhood slug from catalog',
  transactionType: 'BUY|RENT|FULL_DEPOSIT|DEPOSIT_AND_RENT|DAILY_RENT|SELL',
  dealType: 'rent|deposit|sale (Persian deal label)',
  area: 'area in square meters (number)',
  rooms: 'room count (number)',
  rahnAmount: 'rahn/vadieh deposit in Toman (number)',
  monthlyRent: 'monthly rent in Toman (number)',
  deposit: 'deposit in Toman (number)',
  budgetMax: 'max budget in Toman (number)',
  budgetMin: 'min budget in Toman (number)',
  propertyKind: 'apartment|villa|shop|...',
  vertical: 'real-estate|services|vehicles|...',
};

function hypothesisBlock(bag: IntakeFieldBag, fields: IntakeFieldKey[]): string {
  const lines: string[] = [];
  for (const key of fields) {
    const f = bag[key];
    const val = f?.value;
    const conf = f?.confidence ?? 0;
    const src = f?.source ?? 'unknown';
    if (val == null || val === '') {
      lines.push(`- ${key}: (empty) confidence=${conf.toFixed(2)} source=${src}`);
    } else {
      lines.push(`- ${key}: ${JSON.stringify(val)} confidence=${conf.toFixed(2)} source=${src}`);
    }
  }
  return lines.join('\n');
}

const CANDIDATE_LIMIT = 12;

function candidateAppendix(fields: IntakeFieldKey[], candidates: AiCandidateRetrievalSet): string {
  const parts: string[] = [];
  if (fields.some((f) => f.includes('category')) && candidates.categories.length) {
    parts.push(
      'Allowed category slugs (top matches):',
      candidates.categories
        .slice(0, CANDIDATE_LIMIT)
        .map((c) => c.slug)
        .join(', ')
    );
  }
  if (fields.some((f) => f.includes('city')) && candidates.cities.length) {
    parts.push(
      'Allowed city slugs:',
      candidates.cities
        .slice(0, CANDIDATE_LIMIT)
        .map((c) => c.slug)
        .join(', ')
    );
  }
  if (fields.some((f) => f.includes('neighborhood')) && candidates.neighborhoods.length) {
    parts.push(
      'Allowed neighborhood slugs (top matches):',
      candidates.neighborhoods
        .slice(0, CANDIDATE_LIMIT)
        .map((n) => n.slug)
        .join(', ')
    );
  }
  if (fields.some((f) => f.includes('transaction')) && candidates.transactionTypes.length) {
    parts.push(
      'Allowed transaction types:',
      candidates.transactionTypes.map((t) => t.value).join(', ')
    );
  }
  return parts.length ? `\n\n${parts.join('\n')}` : '';
}

/** AI reads user text and verifies intake rule hypotheses field-by-field. */
export function buildTruthVerificationPrompt(
  userText: string,
  bag: IntakeFieldBag,
  fieldsToVerify: IntakeFieldKey[],
  candidates: AiCandidateRetrievalSet
): string {
  const fieldGuide = fieldsToVerify
    .map((f) => `- ${f}: ${FIELD_HINTS[f] ?? f}`)
    .join('\n');

  return `You are a Persian intake truth verifier for NiazFinder.

Task: Read the user's original text carefully. The rules engine produced hypotheses below.
For EACH listed field, decide if the hypothesis is CORRECT, INCORRECT, or MISSING (not extracted but present in text).

Rules:
- Compare against the USER TEXT only ? not world knowledge.
- For money amounts: read Persian words (e.g. \u067E\u0646\u062C\u0627\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 = 50M, \u0633\u06CC\u0635\u062F \u0645\u06CC\u0644\u06CC\u0648\u0646 = 300M).
- If intake is wrong, set status="incorrect" and provide the correct "value".
- If intake missed a value present in text, set status="missing" and provide "value".
- If intake is right, set status="correct" (no value needed).
- Slugs must match allowed catalog lists when provided.
- Return JSON only. No markdown.

Fields to verify:
${fieldGuide}

Intake hypotheses (rules engine output):
${hypothesisBlock(bag, fieldsToVerify)}

User text:
"""
${userText}
"""
${candidateAppendix(fieldsToVerify, candidates)}

Return JSON:
{
  "verdicts": [
    {
      "field": "fieldKey",
      "status": "correct" | "incorrect" | "missing",
      "value": string | number | null,
      "confidence": 0.0-1.0,
      "reasonFa": "short Persian reason when incorrect/missing"
    }
  ],
  "overallConfidence": 0.0-1.0
}`;
}
