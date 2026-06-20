import type { ParsedIntent } from '@/contracts/need-intake';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

export type ParseAndEnrichIntentOptions = {
  preferredCityId?: string | null;
  preferredCityName?: string | null;
  locationText?: string;
};

/** Server/API intake path — full LRE with neighborhood catalog. */
export function parseAndEnrichIntentFromText(
  rawText: string,
  opts?: ParseAndEnrichIntentOptions
): ParsedIntent {
  return enrichParsedIntent(parseIntentFromText(rawText), opts);
}
