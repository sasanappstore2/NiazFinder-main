import type { TypingAnalyzeRequest, TypingAnalysisResult } from '@/contracts/typing-analysis';
import { getTypingCache, setTypingCache } from './cache';
import { hashTypingText } from './hash';
import { mapRulesToTypingResult } from './map-rules-to-result';

export async function runTypingAnalysis(
  req: TypingAnalyzeRequest
): Promise<TypingAnalysisResult> {
  const { sessionId, text, seq } = req;
  const textHash = hashTypingText(text);
  const cached = getTypingCache(sessionId, textHash);
  if (cached) {
    return { ...cached, seq, latencyMs: 0 };
  }

  const result = await mapRulesToTypingResult(sessionId, text, { seq, source: 'rules' });
  if (!result.spam.isSpam) {
    setTypingCache(result);
  }
  return result;
}
