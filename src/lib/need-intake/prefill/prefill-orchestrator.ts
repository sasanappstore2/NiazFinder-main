import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import {
  legacyNeedDraftFromParsed,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { composeListingFromDraft, type ComposedListing } from '@/lib/need-intake/listing-composer';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import { parseIntentFromText, parseCity } from '@/lib/need-intake/intent-parser';
import { applyPropertySlotsToParsed } from '@/lib/need-intake/apply-property-slots-to-parsed';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { postProcessParsedForPrefill } from '@/lib/need-intake/prefill/prefill-post-process';
import {
  listingDescriptionAcceptable,
  listingTitleAcceptable,
  prefillCoverageScore,
  requiredPrefillSlotKeys,
} from '@/lib/need-intake/prefill/prefill-policy';
import { scorePrefillAgainstTeacher } from '@/lib/need-intake/prefill/score-prefill-case';

export interface PrefillPipelineResult {
  parsed: ParsedIntent;
  answers: Record<string, unknown>;
  draft: NeedDraft;
  listing: ComposedListing;
  requiredSlots: string[];
  coverage: number;
  labelErrors: string[];
  listingErrors: string[];
  pass: boolean;
}

/** Rules-only prefill: parse → seed → slots → draft → listing (no LLM). */
export function runRulesPrefillPipeline(
  input: string,
  teacher?: DatasetLabels,
  opts?: { captured?: boolean }
): PrefillPipelineResult {
  const rawParsed = applyPropertySlotsToParsed(parseIntentFromText(input));
  const explicitCity = parseCity(input);
  const parsed = postProcessParsedForPrefill({
    ...rawParsed,
    city: explicitCity ?? rawParsed.city,
  });
  const baseAnswers = seedAnswersFromParsed(parsed);
  const slots = extractSlotsFromRules(parsed, baseAnswers);
  const answers: Record<string, unknown> = { ...baseAnswers, ...slots };

  let draft = legacyNeedDraftFromParsed(parsed, answers as NeedDraft['answers'], []);
  draft = recomputeNeedDraft({ ...draft, sourceText: input.trim() });
  const listing = composeListingFromDraft(draft);

  const requiredSlots = requiredPrefillSlotKeys(parsed, teacher);
  const coverage = prefillCoverageScore(answers, requiredSlots);
  const labelErrors = teacher
    ? scorePrefillAgainstTeacher(parsed, answers, teacher, {
        captured: opts?.captured,
      })
    : [];

  const listingErrors: string[] = [];
  if (!listingTitleAcceptable(listing.title)) {
    listingErrors.push(`weak title: ${listing.title.slice(0, 40)}`);
  }
  if (!listingDescriptionAcceptable(listing.description)) {
    listingErrors.push('description too short');
  }

  const pass =
    labelErrors.length === 0 &&
    listingErrors.length === 0 &&
    coverage >= 0.45;

  return {
    parsed,
    answers,
    draft,
    listing,
    requiredSlots,
    coverage,
    labelErrors,
    listingErrors,
    pass,
  };
}
