import type { ParsedIntent } from '@/contracts/need-intake';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { mergeTypingIntoParsed } from '@/lib/typing-analysis/merge-typing-seed';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

export function parseFromText(text: string): ParsedIntent {
  return enrichParsedIntent(parseIntentFromText(text));
}

export async function parseFromTextAsync(text: string): Promise<ParsedIntent> {
  return parseFromText(text);
}

export function mergeTypingHints(
  parsed: ParsedIntent,
  typing: TypingAnalysisResult | null
): ParsedIntent {
  return enrichParsedIntent(mergeTypingIntoParsed(parsed, typing));
}
