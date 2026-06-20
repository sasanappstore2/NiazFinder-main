import type { ParsedIntent } from '@/contracts/need-intake';
import { enrichParsedIntentClient } from '@/lib/need-intake/enrich-parsed-intent.client';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

export type ParseAndEnrichIntentOptions = {
  preferredCityId?: string | null;
  preferredCityName?: string | null;
  locationText?: string;
};

/** Client/wizard intake path — no Node fs or neighborhood catalog. */
export function parseAndEnrichIntentFromText(
  rawText: string,
  opts?: ParseAndEnrichIntentOptions
): ParsedIntent {
  return enrichParsedIntentClient(parseIntentFromText(rawText), opts);
}
