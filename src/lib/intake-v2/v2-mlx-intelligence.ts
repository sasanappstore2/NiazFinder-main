import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { NeedIntelligenceProfile } from '@/contracts/need-intelligence';
import { isNeedIntakeLlmEnabled, parseIntentViaQwen } from '@/lib/need-intake/qwen-intake-client';
import { reconcileParsedIntent } from '@/lib/need-intake/parse-coherence';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';

function shouldInvokeMlx(
  rawText: string,
  draft: NeedDraft,
  profile: NeedIntelligenceProfile
): boolean {
  const words = rawText.trim().split(/\s+/).length;
  if (draft.parsedIntent.confidence < 0.55) return true;
  if (draft.parsedIntent.locationAmbiguous) return true;

  const dealAnswer = String(draft.answers.dealType ?? '');
  const dealEntity = String(draft.parsedIntent.entities?.dealType ?? '');
  if (dealAnswer && dealEntity && dealAnswer !== dealEntity) return true;

  if (words >= 12 && /مدرسه|مترو|پاساژ|اولویت|ترجیح/i.test(rawText)) return true;
  if (!profile.location?.city && draft.parsedIntent.city) return false;
  if (words >= 20 && !profile.mustHave?.length && !profile.niceToHave?.length) return true;

  return false;
}

function mergeMlxParsed(
  profile: NeedIntelligenceProfile,
  parsed: ParsedIntent
): NeedIntelligenceProfile {
  const next: NeedIntelligenceProfile = { ...profile };

  if (parsed.city && !next.location?.city) {
    next.location = { ...next.location, city: parsed.city };
  }
  if (parsed.entities?.area && !next.location?.neighborhood) {
    next.location = { ...next.location, neighborhood: parsed.entities.area };
  }

  const must = parsed.entities?.must_have ?? parsed.entities?.mustHave;
  if (must) {
    const items = must.split(/[،,|]/).map((s) => s.trim()).filter(Boolean);
    next.mustHave = [...new Set([...(next.mustHave ?? []), ...items])];
  }

  const nice = parsed.entities?.nice_to_have ?? parsed.entities?.niceToHave;
  if (nice) {
    const items = nice.split(/[،,|]/).map((s) => s.trim()).filter(Boolean);
    next.niceToHave = [...new Set([...(next.niceToHave ?? []), ...items])];
  }

  const priorities = parsed.entities?.priorities;
  if (priorities) {
    const items = priorities.split(/[،,|>/]/).map((s) => s.trim()).filter(Boolean);
    next.priorities = [...new Set([...(next.priorities ?? []), ...items])];
  }

  const motivation = parsed.entities?.motivation;
  if (motivation && !next.motivation) {
    next.motivation = motivation as NeedIntelligenceProfile['motivation'];
  }

  const urgency = parsed.urgency ?? parsed.entities?.urgency;
  if (urgency && !next.urgency) {
    next.urgency = urgency as NeedIntelligenceProfile['urgency'];
  }

  if (parsed.entities?.dealType && !next.transaction) {
    next.transaction = parsed.entities.dealType;
  }

  return next;
}

/** Optional MLX JSON slot enrichment — assistant reply stays template-based. */
export async function maybeEnrichWithMlxIntelligence(
  rawText: string,
  draft: NeedDraft,
  profile: NeedIntelligenceProfile
): Promise<NeedIntelligenceProfile> {
  if (!isNeedIntakeLlmEnabled()) return profile;
  if (!shouldInvokeMlx(rawText, draft, profile)) return profile;

  const llm = await parseIntentViaQwen(rawText);
  if (!llm?.parsed) return profile;

  const rulesParsed = parseFromText(rawText);
  const reconciled = reconcileParsedIntent(llm.parsed, rulesParsed, rawText);
  return mergeMlxParsed(profile, reconciled);
}
