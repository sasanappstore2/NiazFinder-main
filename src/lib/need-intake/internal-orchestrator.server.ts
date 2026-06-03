import type { ParsedIntent } from '@/contracts/need-intake';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { mergeTypingIntoParsed } from '@/lib/typing-analysis/merge-typing-seed';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { reconcileParsedIntent } from '@/lib/need-intake/parse-coherence';
import { parseIntentViaQwen } from '@/lib/need-intake/qwen-intake-client';

export function parseFromText(text: string): ParsedIntent {
  return enrichParsedIntent(parseIntentFromText(text));
}

export async function parseFromTextAsync(text: string): Promise<ParsedIntent> {
  const rules = parseFromText(text);
  const llm = await parseIntentViaQwen(text);
  if (!llm) return rules;
  return reconcileParsedIntent(llm.parsed, rules, text);
}

export function mergeTypingHints(
  parsed: ParsedIntent,
  typing: TypingAnalysisResult | null
): ParsedIntent {
  return enrichParsedIntent(mergeTypingIntoParsed(parsed, typing));
}
